export enum ModelProvider {
  GEMINI = 'Gemini 2.5 Flash',
  GEMINI_PRO = 'Gemini 3 Pro (Preview)',
  GPT4 = 'GPT-4o (Simulated)',
  DEEPSEEK = 'DeepSeek V3 (Simulated)',
  GROK = 'Grok-1 (Simulated)'
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export enum PentestTool {
  GENERAL_CHAT = 'general_chat',
  CODE_ANALYSIS = 'code_analysis',
  FACE_ANALYSIS = 'face_analysis',
  REPORT_GENERATOR = 'report_generator',
  COMMAND_GENERATOR = 'command_generator'
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  image?: string; // base64
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  selectedModel: ModelProvider;
}

export interface AnalysisResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  recommendations: string[];
}