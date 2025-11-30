import * as React from 'react';
import { useRef, useState, useEffect } from 'react';
import { GestureRecognizer, FaceDetector, FaceLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

interface CameraPanelProps {
  onCapture: (imageData: string) => void;
  isActive: boolean;
}

const CameraPanel: React.FC<CameraPanelProps> = ({ onCapture, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("INITIALIZING NEURAL NETWORKS...");
  const [aiReady, setAiReady] = useState(false);
  const [gestureLabel, setGestureLabel] = useState("");
  const [aiError, setAiError] = useState<string>("");
  const [faceCount, setFaceCount] = useState(0);
  const [handCount, setHandCount] = useState(0);
  
  // Refs for AI instances
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const smoothBoxesRef = useRef<Record<number, { x: number, y: number, w: number, h: number }>>({});
  const prevFaceCenterRef = useRef<{ x: number, y: number } | null>(null);
  const lastFaceVoiceRef = useRef<number>(0);
  const lastHandVoiceRef = useRef<number>(0);
  const scanYRef = useRef<number>(0);
  const lastScanTsRef = useRef<number>(0);
  const mouthClosedSinceRef = useRef<number | null>(null);
  const lastMewVoiceRef = useRef<number>(0);
  
  // Logic Refs
  const lastGreetingRef = useRef<number>(0); // Cooldown for voice

  // Load AI Models
  useEffect(() => {
    let mounted = true;
    const loadModels = async () => {
      const wasmUrls = [
        "/wasm",
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm",
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      ];
      const delegates: ("GPU"|"CPU")[] = ["GPU", "CPU"];
      const gestureModels = [
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
        "/models/gesture_recognizer.task"
      ];
      
      const faceLmModels = [
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        "/models/face_landmarker.task"
      ];

      let lastError: any = null;
      for (const wasmUrl of wasmUrls) {
        try {
          const vision = await FilesetResolver.forVisionTasks(wasmUrl);
          if (!mounted) return;

          for (const delegate of delegates) {
            try {
              let created = false;
              let gesture: GestureRecognizer | null = null;
              let faceLm: FaceLandmarker | null = null;

              for (let idx = 0; idx < gestureModels.length && !created; idx++) {
                try {
                  [gesture, faceLm] = await Promise.all([
                    GestureRecognizer.createFromOptions(vision, {
                      baseOptions: { modelAssetPath: gestureModels[idx], delegate },
                      runningMode: "VIDEO",
                      numHands: 2
                    }),
                    FaceLandmarker.createFromOptions(vision, {
                      baseOptions: { modelAssetPath: faceLmModels[idx], delegate },
                      runningMode: "VIDEO",
                      numFaces: 3,
                      outputFaceBlendshapes: false
                    })
                  ]);
                  created = true;
                } catch (comboErr) {
                  lastError = comboErr;
                  continue;
                }
              }

              if (created && mounted && gesture && faceLm) {
                gestureRecognizerRef.current = gesture;
                faceLandmarkerRef.current = faceLm;
                setAiReady(true);
                setLoadingMsg("BIO-SENSORS ACTIVE");
                setAiError("");
                return;
              }
            } catch (inner) {
              console.error("AI Load Fail (delegate)", delegate, inner);
              lastError = inner;
              continue;
            }
          }
        } catch (outer) {
          console.error("AI Load Fail (wasm)", wasmUrl, outer);
          lastError = outer;
          continue;
        }
      }

      if (mounted) {
        setLoadingMsg("AI OFFLINE (MANUAL ONLY)");
        setAiError(lastError ? String(lastError) : "Unknown initialization error");
      }
    };
    loadModels();
    return () => { mounted = false; };
  }, []);

  // Start Camera
  useEffect(() => {
    if (!isActive) return;
    
    const startCam = async () => {
       try {
         const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
         setStream(s);
         if (videoRef.current) videoRef.current.srcObject = s;
       } catch (e) {
         console.error("Cam Fail", e);
         setLoadingMsg("CAMERA ACCESS DENIED");
       }
    };
    startCam();

    return () => {
       if (stream) stream.getTracks().forEach(t => t.stop());
       cancelAnimationFrame(requestRef.current);
    };
  }, [isActive]);

  // TTS Helper
  const speak = (txt: string) => {
    if ('speechSynthesis' in window) {
       window.speechSynthesis.cancel(); // Reset queue
       const u = new SpeechSynthesisUtterance(txt);
       u.rate = 1.0;
       u.pitch = 0.8; // Lower pitch for AI effect
       window.speechSynthesis.speak(u);
    }
  };

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // Render Loop
  const render = () => {
     if (!videoRef.current || !canvasRef.current || !aiReady) {
        requestRef.current = requestAnimationFrame(render);
        return;
     }

     const vid = videoRef.current;
     const canvas = canvasRef.current;
     const ctx = canvas.getContext('2d');
     
     if (vid.readyState === 4 && ctx) {
        canvas.width = vid.videoWidth;
        canvas.height = vid.videoHeight;
        const now = Date.now();

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Scanning sweep effect (neon bar moving vertically)
        const ts = now;
        const lastTs = lastScanTsRef.current || ts;
        const dt = Math.min(0.05, (ts - lastTs) / 1000);
        lastScanTsRef.current = ts;
        // speed: 25% of canvas height per second
        const speed = canvas.height * 0.25;
        scanYRef.current = (scanYRef.current + speed * dt) % (canvas.height + 100);
        const sweepHeight = 80; // px
        const sweepY = scanYRef.current - sweepHeight / 2;
        ctx.save();
        const grad = ctx.createLinearGradient(0, sweepY, 0, sweepY + sweepHeight);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0.0)');
        grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.25)');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grad;
        ctx.fillRect(0, sweepY, canvas.width, sweepHeight);
        ctx.restore();

        // 1. FACE DETECTION (Landmarker-only), SMOOTHED BOXES & GREETING
        let lmRes = undefined as any;
        if (faceLandmarkerRef.current) {
           lmRes = faceLandmarkerRef.current.detectForVideo(vid, now);
           const faces = lmRes.faceLandmarks ?? [];
           setFaceCount(faces.length);

           faces.forEach((pts: any[], idx: number) => {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of pts) {
              const x = p.x * canvas.width;
              const y = p.y * canvas.height;
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
            const cur = { x: canvas.width - minX - Math.max(0, maxX - minX), y: minY, w: Math.max(0, maxX - minX), h: Math.max(0, maxY - minY) };
            const prev = smoothBoxesRef.current[idx] ?? cur;
            const alpha = 0.35;
            const smoothed = {
              x: lerp(prev.x, cur.x, alpha),
              y: lerp(prev.y, cur.y, alpha),
              w: lerp(prev.w, cur.w, alpha),
              h: lerp(prev.h, cur.h, alpha)
            };
            smoothBoxesRef.current[idx] = smoothed;

            // Draw Tech Box
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);
            ctx.strokeRect(smoothed.x, smoothed.y, smoothed.w, smoothed.h);
            ctx.setLineDash([]);

             // Corners
             drawCorner(ctx, smoothed.x, smoothed.y, 20, 20);
             drawCorner(ctx, smoothed.x + smoothed.w, smoothed.y + smoothed.h, -20, -20);

             // Label
             ctx.fillStyle = '#06b6d4';
             ctx.fillRect(smoothed.x, smoothed.y - 24, 140, 24);
             ctx.fillStyle = 'black';
             ctx.font = 'bold 12px monospace';
             ctx.fillText('IDENTITY CONFIRMED', smoothed.x + 5, smoothed.y - 8);

             if (idx === 0) {
              const cx = (minX + maxX) / 2;
              const cy = (minY + maxY) / 2;
              const prevC = prevFaceCenterRef.current;
              prevFaceCenterRef.current = { x: cx, y: cy };
              const dirCooldown = 1500;
              if (prevC && now - lastFaceVoiceRef.current > dirCooldown) {
                const dx = cx - prevC.x;
                const dy = cy - prevC.y;
                const tx = canvas.width * 0.02;
                const ty = canvas.height * 0.02;
                let phrase = '';
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > tx) {
                  phrase = dx > 0 ? 'Face right' : 'Face left';
                } else if (Math.abs(dy) > ty) {
                  phrase = dy > 0 ? 'Face down' : 'Face up';
                }
                if (phrase) {
                  speak(phrase);
                  lastFaceVoiceRef.current = now;
                }
              }

              // Mewing detection: mouth closed (lip distance small) sustained ~800ms
              // Using common FaceMesh indices: 13 (upper inner lip) and 14 (lower inner lip)
              // Guard for index availability
              try {
                const lipTop = pts[13];
                const lipBot = pts[14];
                if (lipTop && lipBot) {
                  const ly1 = lipTop.y * canvas.height;
                  const ly2 = lipBot.y * canvas.height;
                  const lipGap = Math.abs(ly2 - ly1);
                  const faceH = Math.max(1, maxY - minY);
                  const ratio = lipGap / faceH; // normalized openness
                  const closed = ratio < 0.015; // threshold ~1.5% of face height
                  const nowMs = now;
                  if (closed) {
                    if (mouthClosedSinceRef.current == null) mouthClosedSinceRef.current = nowMs;
                    const held = nowMs - (mouthClosedSinceRef.current || nowMs);
                    if (held > 800 && nowMs - lastMewVoiceRef.current > 5000) {
                      speak('Mewing posture detected');
                      lastMewVoiceRef.current = nowMs;
                    }
                  } else {
                    mouthClosedSinceRef.current = null;
                  }
                }
              } catch {}

              if (now - lastGreetingRef.current > 15000) {
                speak('Identity Confirmed. Access Granted.');
                lastGreetingRef.current = now;
              }
            }
          });
       }

        // 1b. FACE LANDMARKER MESH (reuse same detection)
        if (lmRes && lmRes.faceLandmarks && lmRes.faceLandmarks.length > 0) {
           ctx.save();
           ctx.translate(canvas.width, 0);
           ctx.scale(-1, 1);
           ctx.fillStyle = 'rgba(236, 72, 153, 0.8)';
           for (const pts of lmRes.faceLandmarks) {
             for (let i = 0; i < pts.length; i++) {
               const p = pts[i];
               const x = p.x * canvas.width;
               const y = p.y * canvas.height;
               ctx.beginPath();
               ctx.arc(x, y, 1.2, 0, Math.PI * 2);
               ctx.fill();
             }
           }
           ctx.restore();
        }

        // 2. HAND GESTURE & SKELETON
        if (gestureRecognizerRef.current) {
           const results = gestureRecognizerRef.current.recognizeForVideo(vid, now);
           setHandCount(results.landmarks.length);
           
           if (results.landmarks.length > 0) {
              const drawingUtils = new DrawingUtils(ctx);
              for (let i = 0; i < results.landmarks.length; i++) {
                 const lm = results.landmarks[i];
                 const fingerTip = lm[12];

                 ctx.save();
                 ctx.translate(canvas.width, 0);
                 ctx.scale(-1, 1);
                 drawingUtils.drawConnectors(lm, GestureRecognizer.HAND_CONNECTIONS, {
                    color: 'rgba(6, 182, 212, 0.4)',
                    lineWidth: 2
                 });
                 drawingUtils.drawLandmarks(lm, {
                    color: 'rgba(236, 72, 153, 0.8)',
                    lineWidth: 1,
                    radius: 3
                 });
                 ctx.restore();

                 const mx = canvas.width - (fingerTip.x * canvas.width);
                 const my = fingerTip.y * canvas.height;
                 drawIronManMeter(ctx, mx, my - 60);

                 if (results.gestures.length > i && results.gestures[i].length > 0) {
                    const cat = results.gestures[i][0].categoryName;
                    setGestureLabel(cat);
                    const now2 = Date.now();
                    if (now2 - lastHandVoiceRef.current > 2000) {
                      let gphrase = '';
                      switch (cat) {
                        case 'Thumb_Up': gphrase = 'Thumbs up'; break;
                        case 'Open_Palm': gphrase = 'Open palm'; break;
                        case 'Closed_Fist': gphrase = 'Closed fist'; break;
                        case 'Pointing_Up': gphrase = 'Pointing up'; break;
                        case 'Victory': gphrase = 'Victory sign'; break;
                        case 'ILoveYou': gphrase = 'I love you sign'; break;
                        default: gphrase = cat.replace(/_/g, ' ');
                      }
                      speak(gphrase);
                      lastHandVoiceRef.current = now2;
                    }
                    if (cat === 'Thumb_Up') {
                       capture();
                    }
                 }
              }
           } else {
             setGestureLabel("");
           }
        }
     }
     requestRef.current = requestAnimationFrame(render);
  };

  const drawCorner = (ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y + dy);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx, y);
      ctx.strokeStyle = '#ec4899'; // Pink
      ctx.lineWidth = 3;
      ctx.stroke();
  };

  const drawIronManMeter = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
     const time = Date.now() / 100;
     ctx.save();
     ctx.translate(x, y);
     
     // Rotating Rings
     for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        const dir = i % 2 === 0 ? 1 : -1;
        ctx.arc(0, 0, 20 + (i * 8), time * dir * (0.5/i), (time * dir * (0.5/i)) + Math.PI * 1.5);
        ctx.strokeStyle = i === 3 ? 'rgba(236, 72, 153, 0.6)' : 'rgba(6, 182, 212, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
     }

     // Center Core
     ctx.beginPath();
     ctx.arc(0, 0, 15, 0, Math.PI * 2);
     ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
     ctx.fill();
     ctx.strokeStyle = '#06b6d4';
     ctx.stroke();

     // Data Text
     ctx.fillStyle = 'white';
     ctx.font = '9px monospace';
     ctx.textAlign = 'center';
     ctx.fillText(`Z:${Math.abs(Math.sin(time/5)).toFixed(2)}`, 0, 3);
     
     // Connection Line to Finger
     ctx.beginPath();
     ctx.moveTo(0, 45); // Bottom of outer ring
     ctx.lineTo(0, 60); // Towards finger
     ctx.strokeStyle = 'rgba(255,255,255,0.3)';
     ctx.setLineDash([2, 2]);
     ctx.stroke();
     
     ctx.restore();
  };

  const capture = () => {
     if (!videoRef.current) return;
     const canvas = document.createElement('canvas');
     canvas.width = videoRef.current.videoWidth;
     canvas.height = videoRef.current.videoHeight;
     const ctx = canvas.getContext('2d');
     if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);
        onCapture(canvas.toDataURL('image/png'));
     }
  };

  useEffect(() => {
     if (aiReady && isActive) requestRef.current = requestAnimationFrame(render);
  }, [aiReady, isActive]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden border-2 border-cyan-900 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
       {/* Video element is mirrored via CSS */}
       <video 
         ref={videoRef} 
         className="w-full h-full object-cover transform scale-x-[-1] opacity-80" 
         autoPlay muted playsInline 
       />
       {/* Canvas overlays everything */}
       <canvas 
         ref={canvasRef} 
         className="absolute inset-0 w-full h-full pointer-events-none"
       />
       
       {/* Overlay UI */}
       <div className="absolute top-4 left-4 bg-black/80 backdrop-blur px-4 py-2 border-l-4 border-cyan-500 shadow-lg max-w-[70%]">
          <div className="text-[10px] text-cyan-400 font-mono tracking-widest mb-1">OPTICAL_SENSOR_FEED</div>
          <div className={`text-sm font-bold font-mono ${aiReady ? 'text-emerald-400' : 'text-yellow-400 animate-pulse'}`}>
             {loadingMsg}
          </div>
          {(!aiReady && aiError) && (
            <div className="mt-1 text-[10px] text-red-300 font-mono break-words opacity-80">
              {aiError}
            </div>
          )}
       </div>

       {gestureLabel && (
         <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-pink-900/90 px-6 py-2 rounded-sm border border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.5)]">
            <div className="text-white font-mono font-bold tracking-widest animate-pulse">GESTURE: {gestureLabel}</div>
         </div>
       )}

       <button 
         onClick={() => { capture(); speak("Manual override. Image captured."); }}
         className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full border-2 border-cyan-400 flex items-center justify-center hover:bg-cyan-900/30 transition group z-50"
       >
         <div className="w-12 h-12 bg-cyan-500 rounded-full group-hover:scale-90 transition shadow-[0_0_25px_rgba(6,182,212,1)]"></div>
       </button>
    </div>
  );
};

export default CameraPanel;