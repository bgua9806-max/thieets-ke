import React, { useState } from 'react';
import { BrandKit, UploadedImage } from '../types';
import { Upload, X, ShieldCheck, Plus } from 'lucide-react';
import { ImageUploader } from './ImageUploader';

interface BrandKitPanelProps {
  brandKit: BrandKit;
  onChange: (newKit: BrandKit) => void;
}

export const BrandKitPanel: React.FC<BrandKitPanelProps> = ({ brandKit, onChange }) => {
  const [newColor, setNewColor] = useState('#000000');
  
  const handleLogoUpload = (images: UploadedImage[]) => {
    if (images.length > 0) {
      onChange({ ...brandKit, logo: images[0] });
    }
  };

  const handleColorChange = (value: string) => {
    onChange({ ...brandKit, primaryColor: value });
  };

  const addSecondaryColor = () => {
    // Avoid duplicates
    if (!brandKit.secondaryColors.includes(newColor)) {
      onChange({ 
        ...brandKit, 
        secondaryColors: [...brandKit.secondaryColors, newColor] 
      });
    }
  };

  const removeSecondaryColor = (index: number) => {
    const updated = brandKit.secondaryColors.filter((_, i) => i !== index);
    onChange({ ...brandKit, secondaryColors: updated });
  };

  return (
    <div className={`space-y-4 p-4 rounded-xl border transition-all ${brandKit.isEnabled ? 'bg-white dark:bg-white/5 border-brand-red/50 shadow-md' : 'bg-gray-50 dark:bg-transparent border-gray-200 dark:border-white/10 opacity-80'}`}>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand-red">
           <ShieldCheck size={18} />
           <span className="text-xs font-bold uppercase tracking-widest">Brand DNA</span>
        </div>
        
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer"
            checked={brandKit.isEnabled}
            onChange={(e) => onChange({ ...brandKit, isEnabled: e.target.checked })}
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-red"></div>
        </label>
      </div>

      {brandKit.isEnabled && (
        <div className="space-y-4 animate-in slide-in-from-top-2 fade-in">
           {/* Logo Upload */}
           <div>
             <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Logo Chính (PNG/SVG)</label>
             {brandKit.logo ? (
                <div className="relative w-20 h-20 group border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden bg-white/5">
                   <img src={`data:${brandKit.logo.mimeType};base64,${brandKit.logo.data}`} className="w-full h-full object-contain p-2" />
                   <button 
                     onClick={() => onChange({...brandKit, logo: undefined})}
                     className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     <X size={10} />
                   </button>
                </div>
             ) : (
                <ImageUploader 
                  label="Logo" 
                  images={[]} 
                  onUpload={handleLogoUpload} 
                  onRemove={() => {}} 
                  maxImages={1}
                />
             )}
           </div>

           {/* Color Palette */}
           <div>
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Màu Chính (Primary)</label>
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full border border-gray-200 shadow-sm flex-shrink-0" style={{ backgroundColor: brandKit.primaryColor }}></div>
                   <input 
                      type="text" 
                      value={brandKit.primaryColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-gray-200 dark:border-white/10 bg-transparent"
                   />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Màu Phụ (Secondary Palette)</label>
                
                {/* List of existing secondary colors */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {brandKit.secondaryColors.map((color, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full pl-1 pr-2 py-1">
                       <div className="w-4 h-4 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: color }}></div>
                       <span className="text-[10px] font-mono text-gray-600 dark:text-gray-300">{color}</span>
                       <button onClick={() => removeSecondaryColor(idx)} className="text-gray-400 hover:text-red-500 ml-1">
                         <X size={10} />
                       </button>
                    </div>
                  ))}
                </div>

                {/* Add new color input */}
                <div className="flex items-center gap-2">
                   <input 
                     type="color" 
                     value={newColor}
                     onChange={(e) => setNewColor(e.target.value)}
                     className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                   />
                   <input 
                      type="text" 
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="flex-1 text-xs p-1.5 rounded border border-gray-200 dark:border-white/10 bg-transparent"
                   />
                   <button 
                     onClick={addSecondaryColor}
                     className="bg-gray-100 dark:bg-white/10 hover:bg-brand-red hover:text-white text-gray-600 dark:text-gray-300 p-1.5 rounded transition-colors"
                     title="Thêm màu"
                   >
                     <Plus size={14} />
                   </button>
                </div>
              </div>
           </div>

           {/* Guidelines */}
           <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Quy chuẩn nhanh</label>
              <textarea 
                className="w-full text-xs p-2 rounded border border-gray-200 dark:border-white/10 bg-transparent h-16 resize-none focus:border-brand-red focus:outline-none"
                placeholder="VD: Không dùng nền đen, logo luôn góc phải..."
                value={brandKit.guidelinesSummary || ''}
                onChange={(e) => onChange({...brandKit, guidelinesSummary: e.target.value})}
              />
           </div>
        </div>
      )}
    </div>
  );
};