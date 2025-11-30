# CyberSentient – AI Pentest Hub

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-CDN-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Google AI](https://img.shields.io/badge/Google%20GenAI-SDK-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Tasks%20Vision-00E676?logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![React Markdown](https://img.shields.io/badge/Markdown-Renderer-000000?logo=markdown&logoColor=white)](https://github.com/remarkjs/react-markdown)

Interface pentest modern dengan pengalaman “cyberpunk console”, mendukung chat AI, audit kode, generator perintah red team, serta analisis visual via kamera.


## Preview

- UI terminal-like dengan sidebar modul, streaming response, dan attachment gambar.
- Tampilan “scanline” + grid latar bergaya cyber.

(Sisipkan screenshot/gif di sini setelah tersedia)


## Fitur

- **General Chat**: Asisten keamanan siber dengan jawaban terstruktur Markdown.
- **Code Analysis (SAST-like)**: Template output berisi vulnerability, severity, lokasi, skenario, dan patch.
- **Command Generator**: Mengubah intent jadi perintah CLI (nmap, sqlmap, hydra, dsb).
- **Face/Scene Analysis (OSINT)**: Analisis gambar kamera/upload untuk artefak keamanan.
- **Model Selector**: Gemini native, simulasi GPT‑4, DeepSeek, Grok.
- **Streaming Response**: Hasil AI mengalir real‑time.
- **Export Log**: Ekspor riwayat diskusi ke file `.txt`.
- **Settings Panel**: Pengaturan model/API key.


## Tech Stack

- **React 19** + **TypeScript**
- **Vite 6** dev server dan build
- **Tailwind CSS (via CDN)** + **Font Awesome (via CDN)**
- **@google/genai** SDK untuk Gemini
- **@mediapipe/tasks-vision** untuk kamera/analisis visual
- **react-markdown** untuk render konten


## Persyaratan

- Node.js 18+ (disarankan LTS)
- Koneksi internet (beberapa lib via CDN; model AI butuh akses jaringan)


## Konfigurasi & API Key

Aplikasi menggunakan Gemini sebagai engine utama.

- Wajib: `GEMINI_API_KEY`
- Opsional: `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `GROK_API_KEY`

Buat file `.env` di root proyek:

```bash
# Wajib (untuk kernel Gemini)
GEMINI_API_KEY=YOUR_GEMINI_KEY

# Opsional (jika diimplementasi native nanti, saat ini fallback simulasi)
OPENAI_API_KEY=YOUR_OPENAI_KEY
DEEPSEEK_API_KEY=YOUR_DEEPSEEK_KEY
GROK_API_KEY=YOUR_GROK_KEY
```

Catatan: Vite sudah memetakan `GEMINI_API_KEY` via `define` di `vite.config.ts`.


## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

- Buka: http://localhost:3000
- Build produksi: `npm run build` lalu `npm run preview`


## Struktur Proyek (ringkas)

```
├─ App.tsx                    # Shell UI, modul, streaming chat
├─ index.html                 # Tailwind + Font Awesome via CDN, import map
├─ index.tsx                  # Entry React/Vite
├─ components/
│  ├─ CameraPanel.tsx         # Kamera & capture untuk analisis visual
│  ├─ ChatMessage.tsx         # Komponen tampilan pesan
│  └─ SettingsModal.tsx       # Modal pengaturan model/API
├─ services/
│  └─ aiService.ts            # Integrasi Google GenAI, sistem prompt & streaming
├─ types.ts                   # Enum ModelProvider, PentestTool, Message, dsb
├─ vite.config.ts             # Server 0.0.0.0:3000, env define, alias
└─ public/                    # Asset publik (model/dll jika diperlukan)
```


## Penggunaan Singkat

- Ketik prompt di input, tekan Enter untuk kirim.
- Pilih modul di sidebar: Terminal, Code Audit, Bio‑Scan, Red Team Ops.
- Tombol kamera/attach untuk menambahkan konteks gambar.
- Buka Settings untuk memilih model dan memasang API key.
- Gunakan tombol Export Log untuk menyimpan riwayat.


## Troubleshooting

- **Tidak ada respons/timeout**: Periksa koneksi internet dan `GEMINI_API_KEY`.
- **Stream terhenti**: Coba ulangi prompt; ada retry/backoff internal sampai 3x.
- **Kamera tidak muncul**: Izinkan akses kamera di browser; cek `https`/host yang mendukung.
- **Styling tidak muncul**: Pastikan CDN Tailwind & Font Awesome termuat di `index.html`.


## Etika & Legal

- Gunakan untuk pembelajaran dan pentest dengan izin tertulis.
- Hindari penyalahgunaan, patuhi hukum dan regulasi setempat.


## Kredit

Dikembangkan oleh hanif abdurrohim (Indonesia).

