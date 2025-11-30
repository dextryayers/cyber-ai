import * as React from 'react';
import { ModelProvider } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  activeModel: ModelProvider;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, activeModel }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-900 w-full max-w-lg shadow-[0_0_30px_rgba(6,182,212,0.2)] rounded-sm">
        
        {/* Header */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center text-cyan-400">
            <i className="fas fa-server mr-2"></i>
            <span className="font-mono font-bold tracking-wider">SYSTEM_CONFIGURATION</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition"><i className="fas fa-times"></i></button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Active Kernel */}
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">Active Neural Engine</div>
            <div className="flex items-center justify-between bg-slate-800 p-3 rounded border border-slate-700">
               <div className="flex items-center">
                 <div className="w-8 h-8 rounded bg-cyan-900/50 flex items-center justify-center text-cyan-400 mr-3">
                    <i className="fas fa-brain"></i>
                 </div>
                 <div>
                    <div className="text-sm font-bold text-white">Google Gemini Core</div>
                    <div className="text-xs text-slate-400">API Latency: 45ms</div>
                 </div>
               </div>
               <div className="px-2 py-1 bg-emerald-900/30 text-emerald-400 text-[10px] border border-emerald-800 rounded">ONLINE</div>
            </div>
          </div>

          {/* Simulation Status */}
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">Persona Simulation</div>
            <div className="bg-slate-800 p-3 rounded border border-slate-700">
               <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-300">Selected Interface</span>
                  <span className="font-mono text-cyan-400 text-xs">{activeModel}</span>
               </div>
               <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full w-[88%] animate-pulse"></div>
               </div>
               <p className="mt-2 text-[10px] text-slate-500">
                 *NOTE: External providers (OpenAI/Anthropic) are currently being emulated by the main kernel to optimize resources.
               </p>
            </div>
          </div>

          {/* API Key Info */}
          <div className="border border-slate-800 bg-black/40 p-4 rounded">
             <div className="flex items-start text-yellow-500 mb-2">
               <i className="fas fa-key mt-1 mr-2 text-xs"></i>
               <span className="text-xs font-bold font-mono">API KEY CONFIGURATION</span>
             </div>
             <p className="text-xs text-slate-400 leading-relaxed font-mono">
               To use distinct API keys for each provider, please modify <span className="text-cyan-400">services/aiService.ts</span>. 
               <br/><br/>
               Current Key Source: <span className="text-green-400">process.env.API_KEY</span> (Gemini)
             </p>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-cyan-900 hover:bg-cyan-800 text-cyan-100 text-xs font-mono rounded transition">
            ACKNOWLEDGE
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
