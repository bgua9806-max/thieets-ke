
import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { UploadedImage } from '../types';

interface ImageUploaderProps {
  label: string;
  images: UploadedImage[];
  onUpload: (newImages: UploadedImage[]) => void;
  onRemove: (id: string) => void;
  maxImages?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  images,
  onUpload,
  onRemove,
  maxImages = 5
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (files: File[]) => {
    const readers: Promise<UploadedImage>[] = [];

    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const readerPromise = new Promise<UploadedImage>((resolve, reject) => {
        // Use Image object + Canvas to strictly convert everything to PNG
        // AND Resize huge images to prevent 413 Entity Too Large errors
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            // FIX 413 ERROR: Calculate new dimensions if image is too large
            // Max dimension for Gemini Vision optimization is typically around 1024-1536px
            const MAX_DIMENSION = 1536; 
            let width = img.width;
            let height = img.height;

            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
              if (width > height) {
                height = Math.round((height * MAX_DIMENSION) / width);
                width = MAX_DIMENSION;
              } else {
                width = Math.round((width * MAX_DIMENSION) / height);
                height = MAX_DIMENSION;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                reject(new Error("Canvas context failed"));
                return;
            }

            // Draw image to canvas with high quality smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to PNG Data URL
            const pngDataUrl = canvas.toDataURL('image/png');
            const base64Data = pngDataUrl.split(',')[1];
            
            resolve({
              id: Math.random().toString(36).substring(7),
              data: base64Data,
              mimeType: 'image/png' // Force PNG
            });
          };
          
          img.onerror = (err) => {
             console.error("Image load failed", err);
             reject(err);
          };
          
          if (e.target?.result) {
            img.src = e.target.result as string;
          }
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      readers.push(readerPromise);
    });

    Promise.all(readers)
      .then(newImages => {
        onUpload(newImages);
      })
      .catch(error => {
        console.error("Uncaught upload error:", error);
      });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      processFiles(files);
    }
  };

  return (
    <div className="mb-4">
      
      <div className="grid grid-cols-4 gap-3 mb-2">
        {images.map((img) => (
          <div key={img.id} className="relative aspect-square group rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-brand-red/50 transition-colors shadow-sm">
            <img 
              src={`data:${img.mimeType};base64,${img.data}`} 
              alt="Uploaded" 
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => onRemove(img.id)}
              className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 hover:text-white"
              title="Xóa ảnh"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        
        {images.length < maxImages && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            onPaste={handlePaste}
            className="aspect-square flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-white/20 rounded-lg hover:border-brand-red hover:bg-red-50 dark:hover:bg-brand-red/10 cursor-pointer transition-all text-gray-500 dark:text-gray-500 hover:text-brand-red dark:hover:text-brand-red group bg-white dark:bg-transparent"
            title="Thêm ảnh (Click hoặc dán Ctrl+V)"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              accept="image/*" 
              onChange={handleFileChange}
            />
            <Upload size={18} className="mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold">THÊM</span>
          </div>
        )}
      </div>
    </div>
  );
};
