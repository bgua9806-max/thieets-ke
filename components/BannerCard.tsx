

import React, { useState } from 'react';
import { Download, Wand2, Eye, RefreshCw, Lightbulb, ShieldAlert, ShieldCheck, Crop, Move, ScanFace, Type, Eraser, MoreHorizontal, Maximize2, Palette, Film, Volume2, Loader2, Activity, Play } from 'lucide-react';
import { BannerResult, PlatformPreset, AdSafetyReport, Comment, MagicAction, MotionEffect } from '../types';
import { generatePitchAudio } from '../services/geminiService';

interface BannerCardProps {
  banner: BannerResult;
  isSelected?: boolean;
  onSelect?: () => void;
  onRegenerate: (id: string, instruction: string) => void;
  onPreview: (url: string) => void;
  platformPreset: PlatformPreset;
  isReviewMode: boolean;
  onAddComment?: (bannerId: string, comment: Comment) => void;
  onCheckSafety?: (bannerId: string) => void;
  onMagicAction?: (id: string, action: MagicAction) => void;
  onApplyMotion?: (id: string, effect: MotionEffect) => void;
}

export const BannerCard: React.FC<BannerCardProps> = ({ 
  banner, 
  isSelected = false,
  onSelect,
  onRegenerate, 
  onPreview, 
  platformPreset, 
  isReviewMode,
  onAddComment,
  onCheckSafety,
  onMagicAction,
  onApplyMotion
}) => {
  const [showRegenInput, setShowRegenInput] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [showRationale, setShowRationale] = useState(false);
  const [showMotionMenu, setShowMotionMenu] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  // Audio State
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Collaboration State
  const [pendingPin, setPendingPin] = useState<{x: number, y: number} | null>(null);
  const [commentText, setCommentText] = useState('');

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = banner.videoUrl || banner.imageUrl;
    link.download = `banner-${banner.id}.${banner.videoUrl ? 'mp4' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmitRegen = (e: React.FormEvent) => {
    e.preventDefault();
    if (regenPrompt.trim()) {
      onRegenerate(banner.id, regenPrompt);
      setRegenPrompt('');
      setShowRegenInput(false);
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop propagation
    
    if (isReviewMode && onAddComment) {
      // Pin comments not supported on video yet due to moving elements
      if (banner.videoUrl) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPendingPin({ x, y });
    } else {
      if (onSelect) onSelect();
    }
  };

  const submitComment = () => {
    if (pendingPin && onAddComment && commentText) {
      const newComment: Comment = {
        id: Math.random().toString(36).substr(2, 9),
        x: pendingPin.x,
        y: pendingPin.y,
        text: commentText,
        author: 'Reviewer',
        timestamp: Date.now()
      };
      onAddComment(banner.id, newComment);
      setPendingPin(null);
      setCommentText('');
    }
  };

  const playRationaleAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) return; 

    setIsAudioLoading(true);
    try {
       // Use existing audio if available, otherwise fetch
       let pcmData = banner.audioPitchData;
       if (!pcmData && banner.designRationale) {
           pcmData = await generatePitchAudio(banner.designRationale);
       }

       if (!pcmData) throw new Error("No audio available");

       // Decode and Play
       const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
       const binaryString = atob(pcmData);
       const len = binaryString.length;
       const bytes = new Uint8Array(len);
       for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
       
       // Ensure byte length is even for Int16Array
       const bufferLen = bytes.length % 2 === 0 ? bytes.length : bytes.length - 1;
       const dataInt16 = new Int16Array(bytes.buffer, 0, bufferLen / 2);
       
       const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
       const channelData = buffer.getChannelData(0);
       for(let i=0; i<channelData.length; i++) {
          channelData[i] = dataInt16[i] / 32768.0;
       }
       
       const source = audioCtx.createBufferSource();
       source.buffer = buffer;
       source.connect(audioCtx.destination);
       
       source.onended = () => setIsPlaying(false);
       
       source.start();
       setIsPlaying(true);

    } catch(err) {
       console.error("Audio playback error", err);
       alert("Không thể phát âm thanh. Vui lòng thử lại.");
    } finally {
       setIsAudioLoading(false);
    }
  };

  const getMotionClass = (effect?: MotionEffect) => {
    switch (effect) {
      case 'PAN': return 'motion-pan';
      case 'ZOOM': return 'motion-zoom';
      case 'PULSE': return 'motion-pulse';
      case 'SHAKE': return 'motion-shake';
      default: return '';
    }
  };

  return (
    <div 
      className={`relative group w-full h-full transition-all duration-300 ${isSelected ? 'z-40 scale-[1.02]' : 'z-auto'}`}
      onMouseLeave={() => { setShowRegenInput(false); setShowRationale(false); setShowMotionMenu(false); }}
      onClick={(e) => { e.stopPropagation(); if (onSelect) onSelect(); }}
    >
      
      {/* --- CONTEXTUAL MAGIC BAR (FLOATING UI) - Only show for Images --- */}
      {isSelected && !isReviewMode && !banner.videoUrl && (
         <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-brand-red/30 px-2 py-1.5 rounded-xl shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-300">
            <button 
              onClick={(e) => { e.stopPropagation(); onMagicAction?.(banner.id, MagicAction.CROP); }}
              className="p-2 rounded-lg hover:bg-brand-red hover:text-white text-gray-700 dark:text-gray-200 transition-colors" 
              title="Crop (Auto Focus)"
            >
              <Crop size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onMagicAction?.(banner.id, MagicAction.RESIZE); }}
              className="p-2 rounded-lg hover:bg-brand-red hover:text-white text-gray-700 dark:text-gray-200 transition-colors" 
              title="Resize (Extend BG)"
            >
              <Maximize2 size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onMagicAction?.(banner.id, MagicAction.ERASER); }}
              className="p-2 rounded-lg hover:bg-brand-red hover:text-white text-gray-700 dark:text-gray-200 transition-colors" 
              title="Magic Eraser"
            >
              <Eraser size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onMagicAction?.(banner.id, MagicAction.VARIANT); }}
              className="p-2 rounded-lg hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 transition-colors" 
              title="Color Variants (Biến thể màu)"
            >
              <Palette size={16} />
            </button>
            
            <div className="w-px h-4 bg-gray-300 dark:bg-white/20 mx-1"></div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onMagicAction?.(banner.id, MagicAction.FACESWAP); }}
              className="p-2 rounded-lg hover:bg-purple-500 hover:text-white text-purple-600 dark:text-purple-400 transition-colors" 
              title="Face Swap (AI)"
            >
               <ScanFace size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onMagicAction?.(banner.id, MagicAction.ANNOTATE); }}
              className={`p-2 rounded-lg transition-colors ${banner.annotations ? 'bg-blue-500 text-white' : 'text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white'}`} 
              title="Annotate Tech Specs"
            >
               <Type size={16} />
            </button>

             <div className="w-px h-4 bg-gray-300 dark:bg-white/20 mx-1"></div>
             
             {/* Motion Button with Submenu */}
             <div className="relative">
                <button 
                   onClick={(e) => { e.stopPropagation(); setShowMotionMenu(!showMotionMenu); }}
                   className={`p-2 rounded-lg transition-colors ${banner.motionEffect ? 'bg-pink-500 text-white' : 'text-pink-600 dark:text-pink-400 hover:bg-pink-500 hover:text-white'}`}
                   title="Cinematic Motion"
                >
                   <Film size={16} />
                </button>
                {showMotionMenu && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg shadow-xl p-1 z-50 min-w-[120px] animate-in slide-in-from-top-1">
                      {['NONE', 'PAN', 'ZOOM', 'PULSE', 'SHAKE'].map(effect => (
                        <button
                          key={effect}
                          onClick={(e) => { 
                             e.stopPropagation(); 
                             onApplyMotion?.(banner.id, effect === 'NONE' ? undefined : effect as MotionEffect);
                             setShowMotionMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-100 dark:hover:bg-white/20 ${banner.motionEffect === effect ? 'text-brand-red font-bold' : 'text-gray-700 dark:text-gray-200'}`}
                        >
                           {effect}
                        </button>
                      ))}
                  </div>
                )}
             </div>

             <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/20 text-gray-500 transition-colors">
               <MoreHorizontal size={16} />
             </button>
         </div>
      )}

      {/* Header Badges */}
      <div className="absolute -top-3 left-0 right-0 flex justify-between z-30 px-2 pointer-events-none">
        {banner.videoUrl ? (
            <div className="bg-purple-600 text-white px-2 py-1 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1">
                <Play size={10} /> VEO VIDEO
            </div>
        ) : (
            banner.safetyReport && (
                <div 
                    className={`group/score px-2 py-1 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1 pointer-events-auto relative cursor-help ${banner.safetyReport.isSafe ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                    onClick={(e) => { e.stopPropagation(); setShowHeatmap(!showHeatmap); }}
                >
                    {banner.safetyReport.isSafe ? <ShieldCheck size={12}/> : <ShieldAlert size={12}/>}
                    Score: {banner.safetyReport.score}/100
                    
                    {/* Detailed Scorecard Popup */}
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-black border border-gray-200 dark:border-white/10 p-3 rounded-lg shadow-xl opacity-0 group-hover/score:opacity-100 transition-opacity z-50 text-left pointer-events-none group-hover/score:pointer-events-auto">
                        <div className="text-xs font-bold text-gray-800 dark:text-white mb-2 uppercase border-b pb-1">Ad Scorecard</div>
                        
                        <div className="space-y-2 mb-2">
                            <div className="flex justify-between text-[10px]">
                            <span className="text-gray-500">Thu hút (Attention)</span>
                            <span className="font-bold text-brand-red">{banner.safetyReport.attentionScore}/100</span>
                            </div>
                            <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                            <div className="bg-brand-red h-full" style={{width: `${banner.safetyReport.attentionScore}%`}}></div>
                            </div>

                            <div className="flex justify-between text-[10px]">
                            <span className="text-gray-500">Rõ thương hiệu (Clarity)</span>
                            <span className="font-bold text-blue-500">{banner.safetyReport.brandClarityScore}/100</span>
                            </div>
                            <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full" style={{width: `${banner.safetyReport.brandClarityScore}%`}}></div>
                            </div>
                        </div>

                        <p className="text-[10px] text-gray-600 dark:text-gray-300 italic leading-snug mb-2">
                            "{banner.safetyReport.critique}"
                        </p>
                        
                        <div className="text-[9px] text-gray-400 border-t pt-1 flex items-center gap-1">
                            <Activity size={10} /> Click badge to toggle Heatmap
                        </div>
                    </div>
                </div>
            )
        )}
      </div>

      <div className={`relative rounded-xl overflow-hidden transition-all duration-500 border bg-white dark:bg-white/5 shadow-xl dark:shadow-none 
          ${isSelected 
             ? 'border-brand-red ring-2 ring-brand-red/30 shadow-[0_0_40px_rgba(255,46,46,0.2)]' 
             : 'border-gray-200 dark:border-white/10 group-hover:border-brand-red/50'
          }
          ${banner.isRegenerating ? 'opacity-50' : ''}`}>
        
        {/* Loading Overlay */}
        {banner.isRegenerating && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-sm">
             <RefreshCw className="animate-spin text-brand-red w-8 h-8" />
          </div>
        )}

        {/* HEATMAP OVERLAY (New Upgrade) */}
        {showHeatmap && banner.safetyReport?.heatmapPoints && (
           <div className="absolute inset-0 z-15 pointer-events-none opacity-80 mix-blend-overlay">
              {banner.safetyReport.heatmapPoints.map((pt, idx) => (
                  <div 
                    key={idx}
                    className="absolute rounded-full blur-xl animate-pulse"
                    style={{
                       left: `${pt.x}%`,
                       top: `${pt.y}%`,
                       width: '40%',
                       height: '40%',
                       transform: 'translate(-50%, -50%)',
                       background: `radial-gradient(circle, rgba(255,0,0,${pt.intensity}) 0%, rgba(255,100,0,0.2) 60%, transparent 100%)`
                    }}
                  />
              ))}
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[8px] px-1 rounded">Attention Heatmap (AI)</div>
           </div>
        )}

        {/* E-commerce Frame Overlays */}
        {!banner.videoUrl && platformPreset === PlatformPreset.SHOPEE && (
          <div className="absolute inset-0 z-10 pointer-events-none border-[4px] border-orange-500/50">
             <div className="absolute top-0 left-0 bg-red-600 text-white text-[8px] font-bold px-1 py-0.5">Mall</div>
             <div className="absolute bottom-2 left-2 bg-teal-500 text-white text-[8px] font-bold px-1 py-0.5">Freeship Extra</div>
             <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-400 text-red-600 text-[8px] flex items-center justify-center font-bold rounded-bl-lg">-50%</div>
          </div>
        )}
        {!banner.videoUrl && platformPreset === PlatformPreset.LAZADA && (
          <div className="absolute inset-0 z-10 pointer-events-none border-x-[2px] border-blue-500/30">
             <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        )}

        {/* Safety Check Grid (20% Rule) */}
        {banner.safetyReport && !banner.safetyReport.isSafe && (
          <div className="absolute inset-0 z-10 pointer-events-none grid grid-cols-5 grid-rows-5 opacity-30">
             {Array.from({length: 25}).map((_, i) => (
               <div key={i} className="border border-red-500 bg-red-500/10"></div>
             ))}
          </div>
        )}

        {/* Annotation Overlay */}
        {banner.annotations && (
          <div className="absolute inset-0 z-10 pointer-events-none p-4">
             <div className="absolute top-4 right-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg animate-in fade-in">
                TECH SPECS ON
             </div>
             {/* Fake annotations logic - random points */}
             <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_blue]">
                 <div className="absolute left-4 -top-2 bg-black/70 text-white text-[8px] p-1 rounded whitespace-nowrap border border-white/20">
                    High Contrast Area
                 </div>
             </div>
             <div className="absolute bottom-1/3 right-1/3 w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_blue]">
                 <div className="absolute right-4 -top-2 bg-black/70 text-white text-[8px] p-1 rounded whitespace-nowrap border border-white/20">
                    Product Focus
                 </div>
             </div>
          </div>
        )}

        {/* Expert Rationale Overlay & TTS */}
        {banner.designRationale && (
          <div 
            className={`absolute inset-0 z-10 bg-white/95 dark:bg-black/90 backdrop-blur-md p-6 flex flex-col justify-center items-start text-left transition-opacity duration-300 ${showRationale ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <div className="flex items-center justify-between w-full mb-3">
               <div className="flex items-center gap-2 text-brand-red">
                  <Lightbulb size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">Góc nhìn Chuyên gia</span>
               </div>
               
               <button 
                  onClick={playRationaleAudio}
                  disabled={isAudioLoading || isPlaying}
                  className={`p-2 rounded-full transition-colors flex items-center gap-2 ${isPlaying ? 'text-green-500 bg-green-500/10' : 'text-gray-500 hover:text-brand-red hover:bg-gray-100 dark:hover:bg-white/10'}`}
                  title="Nghe phân tích (AI Voice)"
               >
                  {isAudioLoading ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} className={isPlaying ? 'animate-pulse' : ''} />}
                  {isPlaying && <span className="text-[9px] font-bold animate-pulse">Playing...</span>}
               </button>
            </div>
            
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-normal dark:font-light italic border-l-2 border-brand-red pl-4">
              "{banner.designRationale}"
            </p>
          </div>
        )}

        {/* Image OR Video */}
        <div className={`w-full h-full overflow-hidden ${getMotionClass(banner.motionEffect)}`}>
            {banner.videoUrl ? (
                <video 
                    src={banner.videoUrl}
                    className={`w-full h-full object-cover block select-none ${isReviewMode ? 'cursor-default' : 'cursor-pointer'}`}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    onClick={(e) => { e.stopPropagation(); }}
                />
            ) : (
                <img 
                    src={banner.imageUrl} 
                    alt="Generated Banner" 
                    className={`w-full h-auto block select-none ${isReviewMode ? 'cursor-crosshair' : 'cursor-pointer'}`}
                    loading="lazy"
                    onClick={handleImageClick}
                />
            )}
        </div>

        {/* --- Collaboration Pins --- */}
        {banner.comments.map(comment => (
          <div 
            key={comment.id}
            className="absolute z-20 group/pin"
            style={{ top: `${comment.y}%`, left: `${comment.x}%` }}
          >
             <div className="w-6 h-6 -translate-x-1/2 -translate-y-1/2 bg-brand-red text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white text-[10px] font-bold">
               {comment.author[0]}
             </div>
             <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-black text-gray-800 dark:text-gray-200 text-xs p-2 rounded shadow-xl w-32 hidden group-hover/pin:block whitespace-normal break-words z-30">
               {comment.text}
             </div>
          </div>
        ))}

        {/* Add Comment Input */}
        {pendingPin && (
          <div className="absolute z-30 bg-white dark:bg-black p-2 rounded-lg shadow-2xl w-48 border border-gray-200 dark:border-white/10" style={{ top: `${pendingPin.y}%`, left: `${pendingPin.x}%` }}>
             <textarea 
               autoFocus
               className="w-full text-xs p-1 border rounded h-16 bg-transparent dark:text-white" 
               placeholder="Nhập góp ý..."
               value={commentText}
               onChange={(e) => setCommentText(e.target.value)}
             />
             <div className="flex justify-end gap-1 mt-1">
               <button onClick={() => setPendingPin(null)} className="text-[10px] text-gray-500 hover:text-red-500">Hủy</button>
               <button onClick={submitComment} className="text-[10px] bg-brand-red text-white px-2 py-1 rounded">Gửi</button>
             </div>
          </div>
        )}

        {/* Info Trigger (Top Right) */}
        {banner.designRationale && !isReviewMode && (
          <button
             onMouseEnter={() => setShowRationale(true)}
             onMouseLeave={() => setShowRationale(false)}
             className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-white/80 dark:bg-black/40 hover:bg-brand-red dark:hover:bg-brand-red text-gray-600 dark:text-white/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
             title="Tại sao thiết kế này hiệu quả?"
          >
             <Lightbulb size={14} />
          </button>
        )}

        {/* Floating Toolbar (Standard Actions) - Hide in Review Mode, Show on Hover if not selected */}
        {!isReviewMode && !isSelected && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-2 py-2 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-xl border border-gray-200 dark:border-white/10 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10 shadow-xl">
             
             <button 
                onClick={(e) => { e.stopPropagation(); onPreview(banner.videoUrl || banner.imageUrl); }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/20 text-gray-700 dark:text-white transition-colors tooltip"
                title="Xem toàn màn hình"
             >
                <Eye size={16} />
             </button>

             <div className="w-px h-4 bg-gray-300 dark:bg-white/20 mx-1"></div>

             {onCheckSafety && !banner.videoUrl && (
               <button 
                  onClick={(e) => { e.stopPropagation(); onCheckSafety(banner.id); }}
                  className="p-2 rounded-full hover:bg-yellow-100 text-gray-700 dark:text-white hover:text-yellow-600 transition-colors"
                  title="Kiểm tra An toàn Quảng cáo"
               >
                  <ShieldAlert size={16} />
               </button>
             )}

             {!banner.videoUrl && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowRegenInput(!showRegenInput); }}
                    className="p-2 rounded-full hover:bg-brand-red text-gray-700 dark:text-white hover:text-white transition-colors"
                    title="Sửa nhanh (Inpaint)"
                >
                    <Wand2 size={16} />
                </button>
             )}
             
             <button 
                onClick={handleDownload}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/20 text-gray-700 dark:text-white transition-colors"
                title="Tải xuống HD"
             >
                <Download size={16} />
             </button>
          </div>
        )}

        {/* Inline Input Popover */}
        {showRegenInput && (
          <div className="absolute bottom-16 left-4 right-4 z-30 animate-in slide-in-from-bottom-2 fade-in duration-200">
             <form onSubmit={handleSubmitRegen} className="bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-brand-red/50 rounded-lg p-1 shadow-2xl flex gap-1">
                <input
                  type="text"
                  value={regenPrompt}
                  onChange={(e) => setRegenPrompt(e.target.value)}
                  placeholder="VD: Đổi nền sang màu đỏ..."
                  className="flex-1 bg-transparent text-gray-800 dark:text-white text-xs px-3 py-2 outline-none placeholder-gray-500"
                  autoFocus
                />
                <button type="submit" className="bg-brand-red hover:bg-red-600 text-white p-2 rounded-md">
                   <Wand2 size={12} />
                </button>
             </form>
          </div>
        )}
      </div>
    </div>
  );
};

export const BannerSkeleton: React.FC = () => {
  return (
    <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/5 shadow-lg dark:shadow-none">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent"></div>
      
      {/* Fake UI Elements inside skeleton */}
      <div className="absolute bottom-4 left-4 right-4 h-4 bg-gray-300 dark:bg-white/5 rounded w-2/3"></div>
      <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-300 dark:bg-white/5"></div>
      
      <div className="absolute inset-0 flex items-center justify-center">
         <div className="w-12 h-12 rounded-full border-2 border-brand-red/30 border-t-brand-red animate-spin"></div>
      </div>
    </div>
  );
};
