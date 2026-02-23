
import React, { useState } from 'react';
import { Key, ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = inputKey.trim();
    
    if (cleanKey.length < 30 || !cleanKey.startsWith('AIza')) {
      setError('API Key không hợp lệ. Key phải bắt đầu bằng "AIza"');
      return;
    }
    
    onSave(cleanKey);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-500">
       {/* Background Effects */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-red/10 rounded-full blur-[100px]"></div>
       </div>

       <div className="w-full max-w-md bg-[#0A0A0A] border border-brand-red/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(255,46,46,0.15)] relative overflow-hidden transform transition-all">
          
          <div className="text-center mb-8">
             <div className="w-16 h-16 bg-gradient-to-br from-brand-red to-red-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-900/50 rotate-3 border border-white/10">
                <Key size={32} className="text-white" />
             </div>
             <h2 className="text-3xl font-bold text-white mb-2 tracking-tight font-sans">The Red Workspace</h2>
             <p className="text-gray-400 text-sm">
                Nhập Gemini API Key để kích hoạt hệ thống Creative Director.
             </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-2">
                <div className="relative">
                    <Key size={16} className="absolute left-4 top-4 text-gray-500" />
                    <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => {
                        setInputKey(e.target.value);
                        setError('');
                    }}
                    placeholder="AIzaSy..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-gray-600 focus:border-brand-red focus:bg-black focus:outline-none focus:ring-1 focus:ring-brand-red/50 transition-all font-mono text-sm"
                    autoFocus
                    />
                </div>
                {error && <p className="text-red-500 text-xs pl-1">{error}</p>}
             </div>

             <button
                type="submit"
                disabled={!inputKey}
                className="w-full bg-brand-red hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-brand-red/20"
             >
                Truy cập Workspace <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
             </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
             <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-2">
                <ShieldCheck size={12} className="text-green-500" /> Key của bạn được lưu cục bộ trên trình duyệt.
             </div>
             <a
               href="https://aistudio.google.com/app/apikey"
               target="_blank"
               rel="noopener noreferrer"
               className="text-xs text-brand-red hover:text-white transition-colors inline-flex items-center gap-1 font-medium hover:underline"
             >
               Lấy API Key miễn phí tại Google AI Studio <ExternalLink size={10} />
             </a>
          </div>
       </div>
    </div>
  );
};
