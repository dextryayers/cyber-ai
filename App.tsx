import * as React from 'react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { Message, MessageRole, ModelProvider, PentestTool } from './types';
import { generateResponseStream } from './services/aiService';
import ChatMessage from './components/ChatMessage';
import SettingsModal from './components/SettingsModal';

const CameraPanel = React.lazy(() => import('./components/CameraPanel'));

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: MessageRole.ASSISTANT,
      content: "# SYSTEM READY\n\nCyberSentient Interface v3.0 initialized. Secure channel established.\nAwaiting operational directives.",
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelProvider>(ModelProvider.GEMINI);
  const [activeTool, setActiveTool] = useState<PentestTool>(PentestTool.GENERAL_CHAT);
  const [showCamera, setShowCamera] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { scrollToBottom(); }, [messages, isStreaming]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputValue]);

  useEffect(() => {
    setShowCamera(activeTool === PentestTool.FACE_ANALYSIS);
  }, [activeTool]);

  const handleToolChange = (tool: PentestTool) => {
    setActiveTool(tool);
    setSidebarOpen(false);
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !capturedImage) || isStreaming) return;

    const userMsgId = Date.now().toString();
    const newMessage: Message = {
      id: userMsgId,
      role: MessageRole.USER,
      content: inputValue,
      timestamp: Date.now(),
      image: capturedImage || undefined
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setCapturedImage(null);
    setShowCamera(false);
    setIsStreaming(true);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: aiMsgId,
      role: MessageRole.ASSISTANT,
      content: '',
      timestamp: Date.now()
    }]);

    try {
      let fullContent = '';
      const stream = generateResponseStream(
        [...messages, newMessage], 
        selectedModel,
        activeTool, 
        newMessage.image
      );

      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId ? { ...msg, content: fullContent } : msg
        ));
      }
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === aiMsgId ? { ...msg, content: "**ERR_CONNECTION_RESET**: Neural handshake failed.", isError: true } : msg
      ));
    } finally {
      setIsStreaming(false);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageCapture = (data: string) => {
    setCapturedImage(data);
    setShowCamera(false); 
  };
  
  const clearHistory = () => {
      setMessages([{
          id: Date.now().toString(),
          role: MessageRole.ASSISTANT,
          content: "Memory buffer flushed. Ready.",
          timestamp: Date.now()
      }]);
  }

  const exportReport = () => {
    const report = messages.map(m => `[${new Date(m.timestamp).toISOString()}] ${m.role}:\n${m.content}\n`).join('\n---\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([report], { type: 'text/plain' }));
    a.download = `LOG_${Date.now()}.txt`;
    a.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCapturedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex min-h-[100dvh] w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans bg-grid">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/80 md:hidden" onClick={() => setSidebarOpen(false)}></div>}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} activeModel={selectedModel} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 md:relative md:translate-x-0 flex flex-col justify-between ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-black/20">
            <i className="fas fa-radiation text-yellow-400 text-xl animate-pulse"></i>
            <div className="ml-3 flex flex-col leading-tight">
              <span className="font-bold text-lg tracking-wider font-mono text-cyan-50">CYBERSENTIENT</span>
              <span className="font-bold text-l font-mono text-slate-200">BY: Haniipp</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase px-4 mb-2 font-mono">Modules</div>
            {[
              { id: PentestTool.GENERAL_CHAT, icon: 'fa-terminal', label: 'Terminal' },
              { id: PentestTool.CODE_ANALYSIS, icon: 'fa-bug', label: 'Code Audit' },
              { id: PentestTool.FACE_ANALYSIS, icon: 'fa-user-shield', label: 'Bio-Scan' },
              { id: PentestTool.COMMAND_GENERATOR, icon: 'fa-laptop-code', label: 'Red Team Ops' },
            ].map((tool) => (
              <button key={tool.id} onClick={() => handleToolChange(tool.id as PentestTool)}
                className={`w-full flex items-center p-3 rounded-sm text-left transition-all ${
                  activeTool === tool.id ? 'bg-cyan-900/20 text-cyan-400 border-l-2 border-cyan-500' : 'text-slate-400 hover:bg-slate-800'
                }`}>
                <i className={`fas ${tool.icon} w-6 text-center text-sm`}></i>
                <span className="ml-3 text-xs font-mono">{tool.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-slate-800 space-y-2">
             <button onClick={() => setShowSettings(true)} className="w-full px-3 py-2 border border-slate-700 hover:bg-slate-800 text-slate-400 text-xs font-mono rounded-sm flex items-center justify-center">
               <i className="fas fa-cog mr-2"></i> SYSTEM_CONFIG
            </button>
            <button onClick={exportReport} className="w-full px-3 py-2 border border-slate-700 hover:bg-slate-800 text-slate-400 text-xs font-mono rounded-sm flex items-center justify-center">
               <i className="fas fa-download mr-2"></i> EXPORT_LOG
            </button>
            <button onClick={clearHistory} className="w-full px-3 py-2 border border-red-900/50 hover:bg-red-900/20 text-red-500 text-xs font-mono rounded-sm flex items-center justify-center">
               <i className="fas fa-trash mr-2"></i> PURGE
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative min-w-0 bg-slate-950/90">
        <header className="h-14 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between px-4 z-10 sticky top-0 backdrop-blur">
          <div className="flex items-center">
             <button onClick={() => setSidebarOpen(true)} className="mr-3 md:hidden text-slate-400"><i className="fas fa-bars"></i></button>
             <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse mr-2"></span>
             <span className="font-mono text-sm text-cyan-400 font-bold">{activeTool.toUpperCase().replace('_', ' ')}</span>
          </div>
          <div className="flex items-center">
             <select 
               value={selectedModel}
               onChange={(e) => setSelectedModel(e.target.value as ModelProvider)}
               className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono py-1 px-2 rounded-sm focus:outline-none focus:border-cyan-500 uppercase"
             >
               {Object.values(ModelProvider).map(m => <option key={m} value={m}>{m}</option>)}
             </select>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
           <div className="max-w-4xl mx-auto w-full pb-2">
              {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
              {isStreaming && messages[messages.length-1].role === MessageRole.USER && (
                 <div className="flex items-center space-x-2 text-cyan-500 text-xs font-mono animate-pulse">
                    <i className="fas fa-circle-notch fa-spin"></i><span>DECRYPTING RESPONSE...</span>
                 </div>
              )}
              <div ref={messagesEndRef} />
           </div>
        </div>

        {showCamera && (
           <div className="absolute inset-0 z-50 bg-black flex flex-col">
              <div className="absolute top-2 right-2 z-50">
                <button onClick={() => setShowCamera(false)} className="text-white bg-red-600/80 hover:bg-red-600 px-3 py-1 rounded text-xs font-mono">CLOSE_LINK</button>
              </div>
              <Suspense fallback={<div className="flex-1 flex items-center justify-center text-cyan-500">INITIALIZING OPTICAL SENSORS...</div>}>
                 <CameraPanel isActive={showCamera} onCapture={handleImageCapture} />
              </Suspense>
           </div>
        )}

        <div className="p-4 bg-slate-900 border-t border-slate-800 z-20">
           <div className="max-w-4xl mx-auto w-full relative">
              {capturedImage && (
                 <div className="absolute -top-24 left-0 bg-slate-800 p-2 rounded border border-cyan-500 flex flex-col">
                    <div className="flex justify-between mb-1"><span className="text-[9px] text-cyan-400 font-mono">ATTACHMENT</span><button onClick={() => setCapturedImage(null)}><i className="fas fa-times text-slate-400 text-xs"></i></button></div>
                    <img src={capturedImage} className="h-16 w-auto rounded border border-slate-600" />
                 </div>
              )}
              <div className="flex items-end space-x-2 bg-slate-950 border border-slate-700 rounded p-2 focus-within:border-cyan-500 transition shadow-inner">
                 <div className="flex pb-2 pl-1 space-x-1">
                    <button onClick={() => setShowCamera(true)} className="w-8 h-8 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition" title="Camera"><i className="fas fa-camera"></i></button>
                    <button onClick={() => fileInputRef.current?.click()} className="w-8 h-8 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition" title="Upload"><i className="fas fa-paperclip"></i></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                 </div>
                 <textarea
                   ref={textareaRef}
                   value={inputValue}
                   onChange={(e) => setInputValue(e.target.value)}
                   onKeyDown={handleKeyDown}
                   placeholder="Enter command or query..."
                   className="flex-1 bg-transparent text-slate-200 placeholder-slate-600 text-sm p-3 max-h-32 focus:outline-none resize-none font-mono"
                   rows={1}
                 />
                 <button onClick={handleSendMessage} disabled={isStreaming} className="mb-1 p-2 w-10 h-10 rounded bg-cyan-700 hover:bg-cyan-600 text-white disabled:opacity-50 flex items-center justify-center">
                   {isStreaming ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-arrow-right"></i>}
                 </button>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;
