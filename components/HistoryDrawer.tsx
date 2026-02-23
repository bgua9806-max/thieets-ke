
import React from 'react';
import { X, Trash2, Calendar, Clock, Image as ImageIcon, Play, Download } from 'lucide-react';
import { BannerResult } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  historyItems: BannerResult[];
  onSelect: (item: BannerResult) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  historyItems,
  onSelect,
  onDelete,
  onClearAll
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-[400px] bg-brand-light dark:bg-[#0A0A0A] border-l border-gray-200 dark:border-white/10 z-[70] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-white/5">
           <div>
             <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
               <Clock size={20} className="text-brand-red" />
               Lịch sử Sáng tạo
             </h2>
             <p className="text-xs text-gray-500">Đã lưu {historyItems.length} thiết kế trong Database</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
             <X size={20} className="text-gray-500" />
           </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
           {historyItems.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
               <ImageIcon size={48} className="mb-2" />
               <p>Chưa có lịch sử nào.</p>
             </div>
           ) : (
             historyItems.map((item) => (
               <div 
                  key={item.id} 
                  className="group relative bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden hover:border-brand-red/50 transition-all shadow-sm flex gap-3 p-2 cursor-pointer"
                  onClick={() => onSelect(item)}
               >
                  <div className="w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-black rounded-lg overflow-hidden relative">
                     {item.videoUrl ? (
                        <video src={item.videoUrl} className="w-full h-full object-cover" />
                     ) : (
                        <img src={item.imageUrl} className="w-full h-full object-cover" loading="lazy" />
                     )}
                     {item.videoUrl && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                           <Play size={12} className="text-white fill-white" />
                        </div>
                     )}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                     <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate mb-1">
                        {item.promptUsed.substring(0, 40)}...
                     </h4>
                     <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2">
                        <Calendar size={10} />
                        {new Date(item.timestamp).toLocaleString('vi-VN')}
                     </div>
                     <div className="flex gap-1">
                        {item.campaignId && <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded dark:bg-blue-900/30 dark:text-blue-300">Campaign</span>}
                        {item.stage && <span className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded dark:bg-purple-900/30 dark:text-purple-300">{item.stage}</span>}
                     </div>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-black/50 hover:bg-red-500 hover:text-white rounded-full text-gray-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Xóa vĩnh viễn"
                  >
                    <Trash2 size={12} />
                  </button>
               </div>
             ))
           )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 flex justify-between items-center">
           <button 
             onClick={onClearAll}
             className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
           >
             <Trash2 size={14} /> Xóa tất cả
           </button>
           <div className="text-[10px] text-gray-400">
              Lưu trữ trên thiết bị này (IndexedDB)
           </div>
        </div>

      </div>
    </>
  );
};
