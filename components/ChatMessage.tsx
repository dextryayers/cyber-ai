import * as React from 'react';
import { useState } from 'react';
import { Message, MessageRole } from '../types';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Message;
}

const CopyBtn = ({ txt }: { txt: string }) => {
  const [done, setDone] = useState(false);
  return (
    <button 
      onClick={() => { navigator.clipboard.writeText(txt); setDone(true); setTimeout(() => setDone(false), 2000); }}
      className="text-[10px] text-slate-500 hover:text-cyan-400 transition flex items-center gap-1"
    >
      <i className={`fas ${done ? 'fa-check' : 'fa-copy'}`}></i> {done ? 'COPIED' : 'COPY'}
    </button>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === MessageRole.USER;
  
  if (message.role === MessageRole.SYSTEM) return null;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : ''}`}>
           <div className={`w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-bold border ${isUser ? 'bg-indigo-900 border-indigo-500 text-indigo-200' : 'bg-cyan-900 border-cyan-500 text-cyan-200'}`}>
             {isUser ? 'OP' : 'AI'}
           </div>
           <span className="text-[10px] text-slate-500 font-mono tracking-wider">{new Date(message.timestamp).toLocaleTimeString([], {hour12:false})}</span>
        </div>

        {/* Content Box */}
        <div className={`
           px-4 py-3 rounded-sm shadow-lg text-sm border backdrop-blur-sm
           ${isUser ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-900/80 text-cyan-50 border-cyan-900/40'}
           ${message.isError ? 'border-red-500 text-red-200 bg-red-950/20' : ''}
        `}>
           {message.image && (
             <div className="mb-3 rounded overflow-hidden border border-slate-700">
               <img src={message.image} alt="Upload" className="w-full object-cover max-h-60" />
             </div>
           )}
           
           <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
             <ReactMarkdown components={{
               code({node, inline, className, children, ...props}: any) {
                 const code = String(children).replace(/\n$/, '');
                 if (inline) return <code className="bg-slate-700 text-pink-300 px-1 py-0.5 rounded text-xs font-mono">{children}</code>;
                 return (
                   <div className="my-2 border border-slate-700 rounded bg-[#0d1117] overflow-hidden">
                      <div className="bg-[#161b22] px-3 py-1 border-b border-slate-800 flex justify-between items-center">
                         <span className="text-[10px] text-slate-500 font-mono">CODE_BLOCK</span>
                         <CopyBtn txt={code} />
                      </div>
                      <pre className="p-3 overflow-x-auto text-xs font-mono text-emerald-400"><code {...props}>{children}</code></pre>
                   </div>
                 );
               }
             }}>
               {message.content}
             </ReactMarkdown>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
