
import React, { useRef, useState, useEffect } from 'react';
import { BannerResult, PlatformPreset, Comment, MagicAction, MotionEffect } from '../types';
import { BannerCard, BannerSkeleton } from './BannerCard';
import { CampaignStrip } from './CampaignStrip';
import { ZoomIn, ZoomOut, Move, LayoutGrid, X, History, Cloud, Briefcase } from 'lucide-react';

interface CanvasProps {
  banners: BannerResult[];
  isGenerating: boolean;
  onRegenerate: (id: string, instruction: string) => void;
  theme: 'light' | 'dark';
  platformPreset: PlatformPreset;
  isReviewMode: boolean;
  onAddComment: (bannerId: string, comment: Comment) => void;
  onCheckSafety: (bannerId: string) => void;
  onMagicAction: (id: string, action: MagicAction) => void;
  onApplyMotion: (id: string, effect: MotionEffect) => void;
  viewMode: 'grid' | 'solo';
  
  // Selection
  selectedBannerId: string | null;
  onSelectBanner: (id: string | null) => void;
  
  // History
  onOpenHistory: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({ 
  banners, 
  isGenerating, 
  onRegenerate, 
  theme,
  platformPreset,
  isReviewMode,
  onAddComment,
  onCheckSafety,
  onMagicAction,
  onApplyMotion,
  viewMode,
  selectedBannerId,
  onSelectBanner,
  onOpenHistory
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Group banners by Campaign ID
  const campaigns = React.useMemo(() => {
    const groups: { [key: string]: BannerResult[] } = {};
    const singles: BannerResult[] = [];

    banners.forEach(b => {
      if (b.campaignId) {
        if (!groups[b.campaignId]) groups[b.campaignId] = [];
        groups[b.campaignId].push(b);
      } else {
        singles.push(b);
      }
    });

    return { groups, singles };
  }, [banners]);

  // Handle Spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !e.target?.toString().includes('Input') && !e.target?.toString().includes('TextArea')) {
        e.preventDefault(); // Prevent scrolling
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsDragging(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    if (!isSpacePressed) {
      const delta = e.deltaY * -0.001; 
      const newScale = Math.min(Math.max(0.1, scale + delta), 4);
      setScale(newScale);
    } 
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if clicking on an interactive element
    const isInteractive = 
      target.tagName === 'BUTTON' || 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' ||
      target.closest('button') || 
      target.closest('input') || 
      target.closest('textarea') ||
      target.closest('form');

    if (isInteractive) return;

    // Deselect if clicking on empty space
    if (!target.closest('.group') && !target.closest('.group/strip')) {
        onSelectBanner(null);
    }

    if (e.button === 0 || e.button === 1 || isSpacePressed) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const dotColor = theme === 'dark' ? '#333' : '#e5e7eb';

  return (
    <div className="relative w-full h-full overflow-hidden bg-brand-light dark:bg-brand-dark transition-colors duration-500 select-none" onClick={() => onSelectBanner(null)}>
      {/* Dot Pattern Background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(${dotColor} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
          transformOrigin: '0 0'
        }}
      />

      {/* Bottom Floating Dock (Global Actions) */}
      <div 
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 px-4 py-2 rounded-2xl shadow-2xl dark:neon-shadow transition-transform duration-300 hover:scale-105"
        onClick={(e) => e.stopPropagation()} // Prevent deselect
      >
        <div className="flex items-center gap-1 pr-4 border-r border-gray-300 dark:border-white/20">
            <button 
                onClick={onOpenHistory}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-brand-red hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors" 
                title="Lịch sử (IndexedDB)"
            >
                <History size={18} />
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-300 hover:text-brand-red hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors" title="Brand Kit">
                <Briefcase size={18} />
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-300 hover:text-brand-red hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors" title="Save to Drive">
                <Cloud size={18} />
            </button>
        </div>

        <div className="flex items-center gap-3 pl-2">
            <button onClick={() => setScale(s => Math.max(0.2, s - 0.2))} className="text-gray-600 dark:text-gray-300 hover:text-brand-red transition-colors"><ZoomOut size={18} /></button>
            <span className="text-xs font-mono w-12 text-center text-brand-red font-bold">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="text-gray-600 dark:text-gray-300 hover:text-brand-red transition-colors"><ZoomIn size={18} /></button>
            <button onClick={resetView} className={`hover:text-brand-red transition-colors ${position.x === 0 && position.y === 0 ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-white'}`} title="Đặt lại góc nhìn">
                <Move size={18} />
            </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : isReviewMode ? 'default' : 'grab' }}
      >
        <div
            style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                display: 'flex',
                flexDirection: 'column', // Stack campaigns vertically
                flexWrap: 'nowrap', 
                gap: '60px',
                width: viewMode === 'grid' ? '1400px' : 'auto', 
                justifyContent: 'center',
                alignItems: 'center',
                padding: '100px'
            }}
        >
            {/* Render Campaigns */}
            {Object.keys(campaigns.groups).map(campaignId => (
               <CampaignStrip 
                 key={campaignId}
                 campaignId={campaignId}
                 banners={campaigns.groups[campaignId]}
                 onRegenerate={onRegenerate}
                 onPreview={setPreviewImage}
                 platformPreset={platformPreset}
                 isReviewMode={isReviewMode}
                 onAddComment={onAddComment}
                 onCheckSafety={onCheckSafety}
                 onMagicAction={onMagicAction}
                 onApplyMotion={onApplyMotion}
               />
            ))}

            {/* Render Singles Grid */}
            {campaigns.singles.length > 0 && (
               <div className="flex flex-wrap gap-10 justify-center">
                  {campaigns.singles.map(banner => (
                    <div 
                      key={banner.id} 
                      className={`flex-shrink-0 transition-all duration-500 ${viewMode === 'solo' ? 'w-[600px]' : 'w-[350px]'}`}
                    >
                        <BannerCard 
                          banner={banner} 
                          isSelected={selectedBannerId === banner.id}
                          onSelect={() => onSelectBanner(banner.id)}
                          onRegenerate={onRegenerate} 
                          onPreview={setPreviewImage}
                          platformPreset={platformPreset}
                          isReviewMode={isReviewMode}
                          onAddComment={onAddComment}
                          onCheckSafety={onCheckSafety}
                          onMagicAction={onMagicAction}
                          onApplyMotion={onApplyMotion}
                        />
                    </div>
                  ))}
               </div>
            )}

            {/* Show Skeletons when generating */}
            {isGenerating && (
              <div className="flex gap-4">
                 {/* If single generation, show 1 or 4 grids. If campaign, show 4 in a row. */}
                 {/* For simplicity, show 4 in row as generic loading */}
                 {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`skel-${i}`} className="w-[300px]">
                       <BannerSkeleton />
                    </div>
                 ))}
              </div>
            )}

            {!isGenerating && banners.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50">
                  <div className="w-24 h-24 rounded-full border border-dashed border-gray-300 dark:border-white/20 flex items-center justify-center mb-4 bg-white/50 dark:bg-transparent">
                    <LayoutGrid size={32} className="text-gray-400 dark:text-gray-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-400 dark:text-gray-600">Không gian trống</h2>
                  <p className="text-sm text-gray-400 dark:text-gray-600">Thêm ảnh sản phẩm để bắt đầu</p>
              </div>
            )}
        </div>
      </div>

      {/* Full Screen Preview Modal */}
      {previewImage && (
        <div className="absolute inset-0 z-[100] bg-white/90 dark:bg-black/95 backdrop-blur-md flex items-center justify-center p-10 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
           <button className="absolute top-6 right-6 text-gray-800 dark:text-white hover:text-brand-red p-2 bg-black/5 dark:bg-white/10 rounded-full">
             <X size={24} />
           </button>
           <img src={previewImage} className="max-w-full max-h-full rounded shadow-2xl border border-gray-200 dark:border-white/10" />
        </div>
      )}
    </div>
  );
};
