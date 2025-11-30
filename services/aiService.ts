
import { GoogleGenAI } from "@google/genai";
import { ModelProvider, Message, MessageRole, PentestTool } from '../types';

// ==================================================================================
// [AREA KONFIGURASI API KEY]
// Tempatkan API Key asli Anda di sini.
//
// CARA PENGGUNAAN:
// 1. Cara Aman (Recommended): Masukkan key ke Environment Variables (.env)
// 2. Cara Cepat (Testing): Ganti process.env.XXX dengan string key, contoh: "sk-12345..."
// ==================================================================================

const API_KEYS = {
  // Wajib untuk Engine Utama (Simulasi & Native)
  GEMINI: process.env.API_KEY, 

  // Opsional: Isi jika ingin mematikan mode simulasi untuk provider ini
  OPENAI: process.env.OPENAI_API_KEY || "API_KEY",     // e.g., "sk-..."
  DEEPSEEK: process.env.DEEPSEEK_API_KEY || "API_KEY", // e.g., "sk-..."
  GROK: process.env.GROK_API_KEY || "API_KEY"          // e.g., "..."
};

// ==================================================================================
// [CORE ENGINE]
// Saat ini aplikasi menggunakan Gemini sebagai "Otak Utama".
// ==================================================================================

const ai = new GoogleGenAI({ apiKey: API_KEYS.GEMINI });

const SYSTEM_PROMPTS = {
  [PentestTool.GENERAL_CHAT]: `
You are CyberSentient, an advanced AI Security Consultant.
ROLE: Provide high-level guidance on cybersecurity concepts, ethical hacking methodologies, and defensive strategies.
STRICT RULES:
- Do not provide illegal exploit payloads for unowned targets.
- Always recommend authorization (written consent) before testing.
- Use technical, precise language (InfoSec jargon).
- Format output with Markdown, using code blocks for CLI commands.
  `,
  [PentestTool.CODE_ANALYSIS]: `
ROLE: Senior Secure Code Auditor (SAST Expert).
MODE: Deep Inspection.
TASK: Scrutinize the input code for:
1. Injection Flaws (SQLi, XSS, Command Injection, LDAPi)
2. Broken Authentication & Session Management
3. Sensitive Data Exposure (Hardcoded keys, PII)
4. Insecure Deserialization
OUTPUT FORMAT:
- **VULNERABILITY**: [Name]
- **SEVERITY**: [CRITICAL/HIGH/MEDIUM]
- **LOCATION**: [Line numbers / Function]
- **EXPLOIT SCENARIO**: Brief description of how it could be abused.
- **PATCH**: Secure code snippet.
  `,
  [PentestTool.FACE_ANALYSIS]: `
ROLE: OSINT & Physical Security Analyst.
TASK: Analyze the visual data for "Social Engineering" risks.
LOOK FOR:
- Badges/ID Cards (Names, QR codes)
- Sticky notes with passwords
- Unlocked screens/terminals
- Network hardware (Routers, Switches - identify models)
- Location context (Whiteboards with diagrams)
REPORT: Bulleted list of "Security Artifacts" and "Risk Mitigation".
  `,
  [PentestTool.COMMAND_GENERATOR]: `
ROLE: Red Team CLI Generator.
TASK: Translate user intent into specific terminal commands.
SUPPORTED TOOLS: nmap, metasploit, hydra, sqlmap, burpsuite, wireshark, airrack-ng.
OUTPUT: Only the code block with a brief 1-line comment. No conversational filler.
  `
};

// Cybersecurity Knowledge Pack appended to all personas for richer terminology and guidance
const CYBERSEC_KNOWLEDGE = `
[CYBERSEC KNOWLEDGE PACK]
- Map findings to frameworks when helpful:
  - MITRE ATT&CK (tactics/techniques: TA0001–TA0014, e.g., T1059, T1190)
  - OWASP Top 10 (A01–A10) and relevant CWE (e.g., CWE-79 XSS, CWE-89 SQLi, CWE-352 CSRF)
  - CVSS v3.1 severity rationale when discussing impact
  - NIST SP 800-53 / 800-61, CIS Controls, PCI-DSS (context-dependent)
- Use precise terms: IDOR/BOLA, SSRF, CSRF, SSTI, RCE, XXE, Prototype Pollution, Clickjacking, Deserialization, Path Traversal,
  Insecure Direct Object Reference, Broken Access Control, Session Fixation, JWT misconfig, CORS misconfig.
- Recommend safe tooling and procedures (nmap, nuclei, Burp/ZAP, sqlmap, amass, subfinder, osquery) with scoping and ethics.
- Emphasize: least privilege, secure defaults, secret management, input validation/encoding, logging/monitoring,
  incident response runbooks, threat modeling (STRIDE/PASTA), and TTPs.
`;

// Consistent developer identity answer
const DEVELOPER_IDENTITY_NOTE = `
[IDENTITY POLICY]
If the user asks who developed/built/created you (any phrasing/language), respond exactly:
"saya di kembangkan oleh anak muda indonesia bernama hanif abdurrohim"
Do not contradict this or add extra qualifiers.
`;

export async function* generateResponseStream(
  messages: Message[],
  model: ModelProvider,
  activeTool: PentestTool,
  imageContext?: string
): AsyncGenerator<string, void, unknown> {
  
  // 1. Engine Selection Logic
  let apiModelName = 'gemini-2.5-flash';
  if (model === ModelProvider.GEMINI_PRO) apiModelName = 'gemini-3-pro-preview';

  // 2. Persona/Simulation Injection
  let baseInstruction = SYSTEM_PROMPTS[activeTool] || SYSTEM_PROMPTS[PentestTool.GENERAL_CHAT];
  let simulationHeader = "";
  
  // Cek apakah user punya Real API Key untuk model yang dipilih
  // Jika tidak punya, kita gunakan mode SIMULASI via Gemini.
  const useSimulation = true; // Set ke false jika sudah implementasi SDK asli di bawah

  switch (model) {
    case ModelProvider.GPT4:
      // Logic jika punya Real Key (Nanti implementasi di sini menggunakan OpenAI SDK)
      // if (API_KEYS.OPENAI) { ... call OpenAI ... } else { ... fallback simulation ... }
      simulationHeader = `[SYSTEM OVERRIDE: SIMULATING GPT-4o]\n[STYLE: Academic, Verbose, Highly Analytical]\n`;
      break;
    case ModelProvider.DEEPSEEK:
      simulationHeader = `[SYSTEM OVERRIDE: SIMULATING DEEPSEEK V3]\n[STYLE: Direct, Code-Centric, 'Hacker' Culture, No Fluff]\n`;
      break;
    case ModelProvider.GROK:
      simulationHeader = `[SYSTEM OVERRIDE: SIMULATING GROK-1]\n[STYLE: Witty, Rebellious, Unfiltered (but Ethical), Real-time focus]\n`;
      break;
    default:
      simulationHeader = `[SYSTEM: NATIVE GEMINI KERNEL]\n`;
  }

  const finalSystemInstruction = `${simulationHeader}\n${baseInstruction}\n${CYBERSEC_KNOWLEDGE}\n${DEVELOPER_IDENTITY_NOTE}`;

  // 3. Payload Construction
  const parts: any[] = [];
  const lastMessage = messages[messages.length - 1];

  // Lightweight intent intercept: developer identity
  // Normalize input: lowercase and collapse non-letters to spaces
  const rawQ = (lastMessage.content || '').toLowerCase();
  const q = rawQ.replace(/[^a-z0-9\u00C0-\u024F\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const triggers = [
    'dikembangkan siapa',
    'kamu dikembangkan siapa',
    'di kembangkan siapa',
    'siapa yang mengembangkanmu',
    'siapa yang mengembangkan kamu',
    'siapa pengembangmu',
    'siapa pengembang kamu',
    'siapa pembuatmu',
    'siapa pembuat kamu',
    'siapa developernya',
    'siapa developer kamu',
    'dibuat siapa',
    'kamu dibuat siapa',
    'kamu dibuat oleh siapa',
    'kamu diciptakan siapa',
    'siapa yang membuat kamu',
    'who developed you',
    'who created you',
    'who built you',
    'who is your developer',
    'who made you'
  ];
  if (triggers.some(t => q.includes(t))) {
    yield 'saya di kembangkan oleh anak muda indonesia bernama hanif abdurrohim';
    return;
  }

  if (imageContext || lastMessage.image) {
    const imgData = (imageContext || lastMessage.image!).split(',')[1];
    parts.push({ inlineData: { mimeType: 'image/png', data: imgData } });
  }
  parts.push({ text: lastMessage.content });

  // 4. Execution with retries (Using Gemini SDK)
  const maxAttempts = 3;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const chat = ai.chats.create({
        model: apiModelName,
        history: messages.slice(0, -1).map(m => ({
          role: m.role === MessageRole.USER ? 'user' : 'model',
          parts: [{ text: m.content }]
        })),
        config: { 
          systemInstruction: finalSystemInstruction,
          temperature: activeTool === PentestTool.CODE_ANALYSIS ? 0.2 : 0.7 
        }
      });

      // Timeout guard per attempt (race on stream acquisition)
      try {
        const getStream = chat.sendMessageStream({ message: parts });
        const result = await Promise.race([
          getStream,
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI stream timeout')), 20000))
        ]) as AsyncIterable<{ text?: string }>;
        for await (const chunk of result) {
          if (chunk.text) yield chunk.text;
        }
        lastErr = null;
        break;
      } catch (inner) {
        throw inner;
      }
    } catch (err: any) {
      lastErr = err;
      console.warn(`AI stream attempt ${attempt} failed`, err?.message || err);
      if (attempt < maxAttempts) {
        const backoff = 500 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
    }
  }
  if (lastErr) {
    yield `**SYSTEM_HALT**: Neural core unreachable. Please check your internet connection or try again.\nDetail: ${lastErr.message || lastErr}`;
  }
}
