
import React, { useState, useReducer, useEffect, useCallback, useRef } from 'react';
import { 
  Settings, Download, Upload, Loader2, Sparkles, 
  Type, LayoutTemplate, Layers, Palette, Key, ChevronDown, 
  ChevronRight, Menu, X, AlertCircle, CheckCircle2, Wand2, Lightbulb, Plus, Sun, Moon, Briefcase, ShoppingBag, MessageSquare, Megaphone,
  LayoutGrid, Maximize, Shirt, BoxSelect, ScanFace, TrendingUp, Video, Zap
} from 'lucide-react';
import { INITIAL_STATE, AppState, StyleCategory, LightingMode, AspectRatio, UploadedImage, BrandKit, PlatformPreset, Comment, ImageAnalysisResult, GeneratorMode, MagicAction, MotionEffect, BannerResult } from './types';
import { ImageUploader } from './components/ImageUploader';
import { Canvas } from './components/Canvas';
import { BrandKitPanel } from './components/BrandKitPanel';
import { HistoryDrawer } from './components/HistoryDrawer';
import { generateBanner, generateCampaign, regenerateBannerImage, analyzeAdSafety, analyzeProductImage, generateFashionTryOn, generateBulkAssets, generateColorVariant, generateVideoAd } from './services/geminiService';
import { LiveCreativeDirector } from './components/LiveCreativeDirector';
import { historyDb } from './services/historyDb';

// --- Toast System ---
interface Toast {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
}

const ToastContainer: React.FC<{ toasts: Toast[], removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 fade-in duration-300 min-w-[300px]">
          {toast.type === 'error' && <AlertCircle className="text-red-500" size={20} />}
          {toast.type === 'success' && <CheckCircle2 className="text-green-500" size={20} />}
          {toast.type === 'info' && <AlertCircle className="text-blue-500" size={20} />}
          <div className="flex-1 text-sm font-medium">{toast.message}</div>
          <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-800 dark:hover:text-white"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
};

// --- Smart Components ---

const SmartPromptBuilder: React.FC<{
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  smartSuggestion: string | null;
  isAnalyzing: boolean;
}> = ({ value, onChange, suggestions, smartSuggestion, isAnalyzing }) => {
  const [isDreaming, setIsDreaming] = useState(false);

  const handleMagic = () => {
    setIsDreaming(true);
    
    // If we have a smart suggestion from the backend analysis, use it.
    if (smartSuggestion) {
       setTimeout(() => {
          onChange(smartSuggestion);
          setIsDreaming(false);
       }, 800);
       return;
    }

    // Fallback Mock Logic
    setTimeout(() => {
      const creativePrompts = [
        "Chụp sản phẩm nghệ thuật trên nền đá cẩm thạch tối, ánh sáng ven (rim lighting), điểm nhấn màu đỏ neon, độ phân giải 8k.",
        "Phong cách tối giản tông pastel, ánh nắng buổi sáng mềm mại đổ bóng, đạo cụ thiên nhiên như lá cây và gỗ, tươi sáng.",
        "Thẩm mỹ Cyberpunk, sản phẩm lơ lửng, nền vi mạch phát sáng, sương mù, bảng màu xanh và đỏ tía."
      ];
      // Pick random
      const p = creativePrompts[Math.floor(Math.random() * creativePrompts.length)];
      onChange(p);
      setIsDreaming(false);
    }, 1500);
  };

  const addChip = (chip: string) => {
    const newVal = value ? `${value}, ${chip}` : chip;
    onChange(newVal);
  };

  return (
    <div className="group">
      <div className="flex justify-between items-center mb-2">
         <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase group-focus-within:text-brand-red transition-colors flex items-center gap-2">
           Mô tả mong muốn <Sparkles size={10} className="text-yellow-500" />
         </label>
         <button 
           onClick={handleMagic}
           disabled={isDreaming || isAnalyzing}
           className="text-[10px] flex items-center gap-1 text-brand-red hover:text-red-600 dark:hover:text-white transition-colors disabled:opacity-50 font-medium"
         >
           <Wand2 size={10} />
           {isDreaming ? 'Đang viết...' : isAnalyzing ? 'Đang nhìn ảnh...' : 'Viết hộ tôi'}
         </button>
      </div>
      
      <div className="relative">
        <textarea 
          className={`w-full bg-brand-input-light dark:bg-brand-input-dark border border-gray-200 dark:border-transparent rounded-lg p-3 text-sm text-gray-800 dark:text-white h-24 focus:border-brand-red/50 focus:bg-white dark:focus:bg-white/10 focus:outline-none transition-all resize-none placeholder-gray-400 dark:placeholder-gray-700 shadow-sm ${isDreaming ? 'ai-loading-bg' : ''}`}
          placeholder="VD: Làm cho ảnh sáng hơn, thêm không khí Tết..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isDreaming}
        />
        {isDreaming && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <span className="text-xs font-bold text-gray-500 dark:text-white/50 animate-pulse">Đang phân tích ý tưởng...</span>
          </div>
        )}
      </div>

      {/* Vibe Chips - Context Aware */}
      <div className={`flex flex-wrap gap-1.5 mt-2 transition-all duration-500 ${isAnalyzing ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}>
        {suggestions.length > 0 ? (
           suggestions.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => addChip(chip)}
              className="text-[10px] px-2 py-1 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:text-brand-red hover:border-brand-red/50 hover:bg-brand-red/5 transition-all flex items-center gap-1 shadow-sm"
            >
              <Plus size={8} /> {chip}
            </button>
          ))
        ) : (
          // Skeleton chips while empty or initial load
          !isAnalyzing && <span className="text-[9px] text-gray-400 italic">Upload ảnh sản phẩm để nhận gợi ý...</span>
        )}
        
        {isAnalyzing && (
           <span className="text-[9px] text-brand-red animate-pulse flex items-center gap-1">
             <Loader2 size={8} className="animate-spin" /> Đang tìm ý tưởng...
           </span>
        )}
      </div>
    </div>
  );
};

const SmartTaglineInput: React.FC<{
  brandName: string;
  value: string;
  onChange: (val: string) => void;
}> = ({ brandName, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [ideas, setIdeas] = useState<{type: string, text: string}[]>([]);

  const handleGenerateIdeas = () => {
    if (!brandName) return; 
    setIsThinking(true);
    setIsOpen(true);
    
    // Mock Copywriter Logic (Neuromarketing / Vietnamese)
    setTimeout(() => {
       const mockIdeas = [
         { type: 'Nỗi đau (Pain Point)', text: `Tạm biệt nỗi lo về giá cùng ${brandName}.` },
         { type: 'Khẩn cấp (FOMO)', text: `⚡ ${brandName} - Ưu đãi độc quyền, duy nhất hôm nay!` },
         { type: 'Cam kết (Trust)', text: `${brandName} - Hoàn tiền 200% nếu không chuẩn.` },
         { type: 'Thôi miên (Power Words)', text: `Sở hữu siêu phẩm ${brandName} ngay tức thì.` }
       ];
       setIdeas(mockIdeas);
       setIsThinking(false);
    }, 1200);
  };

  const selectIdea = (text: string) => {
    onChange(text);
    setIsOpen(false);
  };

  return (
    <div className="group relative">
      <div className="flex justify-between items-center mb-2">
        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase group-focus-within:text-brand-red transition-colors flex items-center gap-2">
          Tagline / Slogan <Lightbulb size={10} className="text-yellow-500" />
        </label>
        <button 
           onClick={handleGenerateIdeas}
           className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-brand-red transition-colors flex items-center gap-1 font-medium"
           title="Gợi ý ý tưởng"
        >
          Gợi ý Slogan
        </button>
      </div>

      <div className="relative">
        <input 
          type="text" 
          className="w-full bg-brand-input-light dark:bg-brand-input-dark border border-gray-200 dark:border-transparent rounded-lg p-3 text-sm text-gray-800 dark:text-white focus:border-brand-red/50 focus:bg-white dark:focus:bg-white/10 focus:outline-none transition-all placeholder-gray-400 dark:placeholder-gray-700 shadow-sm"
          placeholder="AI tự viết nếu để trống..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {/* Ideas Popover */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 rounded-lg shadow-2xl z-20 p-2 overflow-hidden animate-in fade-in zoom-in-95">
             <div className="flex justify-between items-center mb-2 px-2">
               <span className="text-[10px] font-bold text-gray-500 uppercase">AI Copywriter</span>
               <button onClick={() => setIsOpen(false)}><X size={12} className="text-gray-500 hover:text-red-500"/></button>
             </div>
             
             {isThinking ? (
               <div className="space-y-2 p-2">
                 <div className="h-4 bg-gray-200 dark:bg-white/5 rounded w-3/4 animate-pulse"></div>
                 <div className="h-4 bg-gray-200 dark:bg-white/5 rounded w-1/2 animate-pulse"></div>
                 <div className="h-4 bg-gray-200 dark:bg-white/5 rounded w-full animate-pulse"></div>
               </div>
             ) : (
               <div className="flex flex-col gap-1">
                 {ideas.map((idea, idx) => (
                   <button 
                    key={idx}
                    onClick={() => selectIdea(idea.text)}
                    className="text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-white/5 text-xs text-gray-700 dark:text-gray-300 group/item transition-colors"
                   >
                     <span className="block text-[9px] text-brand-red font-bold mb-0.5 opacity-70 group-hover/item:opacity-100">{idea.type}</span>
                     {idea.text}
                   </button>
                 ))}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Mode Specific Forms ---

const ModeSelector: React.FC<{
  currentMode: GeneratorMode;
  onChange: (mode: GeneratorMode) => void;
}> = ({ currentMode, onChange }) => {
  return (
    <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5">
       <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Chế độ hoạt động</label>
       <div className="relative">
          <select 
            className="w-full bg-brand-input-light dark:bg-brand-input-dark border border-gray-200 dark:border-transparent rounded-lg p-3 text-sm font-bold text-gray-800 dark:text-white appearance-none focus:outline-none focus:border-brand-red transition-all cursor-pointer shadow-sm"
            value={currentMode}
            onChange={(e) => onChange(e.target.value as GeneratorMode)}
          >
            {Object.values(GeneratorMode).map(mode => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-500 pointer-events-none" />
       </div>
    </div>
  );
};

const FashionStudioForm: React.FC<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}> = ({ state, dispatch }) => {
  return (
    <div className="space-y-6 animate-in slide-in-from-left-4 fade-in">
       <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400">
             <Shirt size={18} />
             <h3 className="font-bold text-sm uppercase">Fashion Studio</h3>
          </div>
          <p className="text-[10px] text-gray-500">
             Chuyên dụng cho thời trang. Thử quần áo lên mẫu ảo hoặc mẫu thật.
          </p>
       </div>

       <Section title="1. Người Mẫu (Model)" icon={<ScanFace size={16} />}>
          <ImageUploader 
            label="Model Image"
            images={state.fashionState.modelImage ? [state.fashionState.modelImage] : []}
            onUpload={(imgs) => dispatch({ type: 'SET_FIELD', field: 'fashionState', value: {...state.fashionState, modelImage: imgs[0]} })}
            onRemove={() => dispatch({ type: 'SET_FIELD', field: 'fashionState', value: {...state.fashionState, modelImage: undefined} })}
            maxImages={1}
          />
       </Section>

       <Section title="2. Trang Phục (Garment)" icon={<Shirt size={16} />}>
          <ImageUploader 
            label="Garment Image"
            images={state.fashionState.garmentImage ? [state.fashionState.garmentImage] : []}
            onUpload={(imgs) => dispatch({ type: 'SET_FIELD', field: 'fashionState', value: {...state.fashionState, garmentImage: imgs[0]} })}
            onRemove={() => dispatch({ type: 'SET_FIELD', field: 'fashionState', value: {...state.fashionState, garmentImage: undefined} })}
            maxImages={1}
          />
       </Section>

       <div className="space-y-3 px-1">
          <label className="flex items-center justify-between cursor-pointer group">
             <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Giữ khuôn mặt (Face Swap)</span>
             <input 
               type="checkbox" 
               className="w-4 h-4 accent-purple-500" 
               checked={state.fashionState.keepFace}
               onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'fashionState', value: {...state.fashionState, keepFace: e.target.checked} })}
             />
          </label>
          <label className="flex items-center justify-between cursor-pointer group">
             <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Giữ dáng người (Pose)</span>
             <input 
               type="checkbox" 
               className="w-4 h-4 accent-purple-500" 
               checked={state.fashionState.keepPose}
               onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'fashionState', value: {...state.fashionState, keepPose: e.target.checked} })}
             />
          </label>
       </div>
    </div>
  );
};

const BulkCreateForm: React.FC<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}> = ({ state, dispatch }) => {
  return (
    <div className="space-y-6 animate-in slide-in-from-left-4 fade-in">
       <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
             <BoxSelect size={18} />
             <h3 className="font-bold text-sm uppercase">Bulk Create</h3>
          </div>
          <p className="text-[10px] text-gray-500">
             Xử lý hàng loạt ảnh sản phẩm cùng một phong cách.
          </p>
       </div>

       <Section title="Upload Hàng Loạt" icon={<Upload size={16} />}>
          <p className="text-[10px] text-gray-500 mb-2">Kéo thả 10-50 ảnh vào đây.</p>
          <ImageUploader 
            label="Bulk Images"
            images={state.bulkState.inputImages}
            onUpload={(imgs) => dispatch({ type: 'SET_FIELD', field: 'bulkState', value: {...state.bulkState, inputImages: [...state.bulkState.inputImages, ...imgs]} })}
            onRemove={(id) => dispatch({ type: 'SET_FIELD', field: 'bulkState', value: {...state.bulkState, inputImages: state.bulkState.inputImages.filter(i => i.id !== id)} })}
            maxImages={50}
          />
       </Section>

       <Section title="Style Reference" icon={<Palette size={16} />}>
          <p className="text-[10px] text-gray-500 mb-2">1 ảnh mẫu style chung cho cả lô.</p>
          <ImageUploader 
            label="Style Ref"
            images={state.bulkState.styleReference ? [state.bulkState.styleReference] : []}
            onUpload={(imgs) => dispatch({ type: 'SET_FIELD', field: 'bulkState', value: {...state.bulkState, styleReference: imgs[0]} })}
            onRemove={() => dispatch({ type: 'SET_FIELD', field: 'bulkState', value: {...state.bulkState, styleReference: undefined} })}
            maxImages={1}
          />
       </Section>
    </div>
  );
};


// --- Accordion Component ---
const Section: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode; 
  isOpen?: boolean;
}> = ({ title, icon, children, isOpen = true }) => {
  const [open, setOpen] = useState(isOpen);
  return (
    <div className="border-b border-gray-100 dark:border-white/5 last:border-0">
      <button 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 px-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
      >
        <div className="flex items-center gap-3">
          <span className="text-brand-red group-hover:text-red-500 transition-colors">{icon}</span>
          <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
        </div>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="pb-6 animate-in slide-in-from-top-1 fade-in duration-200">{children}</div>}
    </div>
  );
};

// --- Reducer ---
type Action = 
  | { type: 'SET_FIELD'; field: keyof AppState; value: any }
  | { type: 'ADD_REF_IMAGE'; images: UploadedImage[] }
  | { type: 'REMOVE_REF_IMAGE'; id: string }
  | { type: 'ADD_PROD_IMAGE'; images: UploadedImage[] }
  | { type: 'REMOVE_PROD_IMAGE'; id: string }
  | { type: 'ADD_RESULT'; result: any }
  | { type: 'UPDATE_RESULT'; id: string; updates: any }
  | { type: 'ADD_BATCH_RESULTS'; results: any[] }
  | { type: 'IMPORT_STATE'; state: AppState }
  | { type: 'UPDATE_BRAND_KIT'; kit: BrandKit }
  | { type: 'ADD_COMMENT'; bannerId: string; comment: Comment }
  | { type: 'SET_SAFETY_REPORT'; bannerId: string; report: any }
  | { type: 'UPDATE_ANALYSIS'; analysis: ImageAnalysisResult }
  | { type: 'SET_ANALYZING'; isAnalyzing: boolean }
  | { type: 'REMOVE_RESULT'; id: string }
  | { type: 'CLEAR_RESULTS' };

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'ADD_REF_IMAGE':
      return { ...state, referenceImages: [...state.referenceImages, ...action.images] };
    case 'REMOVE_REF_IMAGE':
      return { ...state, referenceImages: state.referenceImages.filter(img => img.id !== action.id) };
    case 'ADD_PROD_IMAGE':
      return { ...state, productImages: [...state.productImages, ...action.images] };
    case 'REMOVE_PROD_IMAGE':
      return { ...state, productImages: state.productImages.filter(img => img.id !== action.id) };
    case 'ADD_RESULT':
      return { ...state, results: [action.result, ...state.results] };
    case 'ADD_BATCH_RESULTS':
      return { ...state, results: [...action.results, ...state.results] };
    case 'UPDATE_RESULT':
      return {
        ...state,
        results: state.results.map(r => r.id === action.id ? { ...r, ...action.updates } : r)
      };
    case 'REMOVE_RESULT':
      return { ...state, results: state.results.filter(r => r.id !== action.id) };
    case 'CLEAR_RESULTS':
      return { ...state, results: [] };
    case 'IMPORT_STATE':
      return action.state;
    case 'UPDATE_BRAND_KIT':
      return { ...state, brandKit: action.kit };
    case 'ADD_COMMENT':
      return {
        ...state,
        results: state.results.map(r => r.id === action.bannerId ? { ...r, comments: [...r.comments, action.comment] } : r)
      };
    case 'SET_SAFETY_REPORT':
      return {
        ...state,
        results: state.results.map(r => r.id === action.bannerId ? { ...r, safetyReport: action.report } : r)
      };
    case 'UPDATE_ANALYSIS':
      return { ...state, currentAnalysis: action.analysis };
    case 'SET_ANALYZING':
      return { ...state, isAnalyzing: action.isAnalyzing };
    default:
      return state;
  }
};

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<BannerResult[]>([]);

  // Sidebar Resize State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>('light'); 
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // AI Suggestions State
  const [promptChips, setPromptChips] = useState<string[]>([]);
  const [recommendedStyle, setRecommendedStyle] = useState<StyleCategory | null>(null);

  // View Mode State
  const [viewMode, setViewMode] = useState<'grid' | 'solo'>('grid');

  // Theme Handling
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  // --- Load Initial History ---
  useEffect(() => {
    const initHistory = async () => {
      try {
        const all = await historyDb.getAll();
        setHistoryItems(all);
        
        // Load recent 10 items into canvas on boot
        if (all.length > 0) {
           const recent = all.slice(0, 10);
           dispatch({ type: 'ADD_BATCH_RESULTS', results: recent });
           addToast('info', `Đã tải ${recent.length} thiết kế gần nhất từ Database.`);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    };
    initHistory();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const addToast = (type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  // --- Resizable Sidebar Logic ---
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        let newWidth = mouseMoveEvent.clientX;
        if (newWidth < 150) newWidth = 150;
        setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);


  // --- Smart Context Logic Integration ---
  const handleProductUpload = async (newImages: UploadedImage[]) => {
    dispatch({ type: 'ADD_PROD_IMAGE', images: newImages });

    if (newImages.length > 0 && !state.isAnalyzing) {
       dispatch({ type: 'SET_ANALYZING', isAnalyzing: true });
       try {
         const analysis = await analyzeProductImage(newImages[0]);
         dispatch({ type: 'UPDATE_ANALYSIS', analysis });
         setPromptChips(analysis.suggestedTags);
       } catch (error) {
         console.error("Analysis failed", error);
       } finally {
         dispatch({ type: 'SET_ANALYZING', isAnalyzing: false });
       }
    }
  };

  const handleRegenerate = async (id: string, instruction: string) => {
    try {
      const targetBanner = state.results.find(r => r.id === id);
      if (!targetBanner) return;

      dispatch({ type: 'UPDATE_RESULT', id, updates: { isRegenerating: true } });

      const newImageUrl = await regenerateBannerImage(targetBanner.imageUrl, instruction);
      
      const updates = { 
          imageUrl: newImageUrl,
          isRegenerating: false, 
          promptUsed: instruction 
      };

      dispatch({ 
        type: 'UPDATE_RESULT', 
        id, 
        updates
      });

      // Update in DB
      await historyDb.save({ ...targetBanner, ...updates });
      refreshHistory();

      addToast('success', "Đã chỉnh sửa ảnh.");

    } catch (error: any) {
      console.error(error);
      addToast('error', "Không thể chỉnh sửa ảnh.");
      dispatch({ type: 'UPDATE_RESULT', id, updates: { isRegenerating: false } });
    }
  };

  const handleApplyMotion = (id: string, effect: MotionEffect) => {
      dispatch({
        type: 'UPDATE_RESULT',
        id,
        updates: { motionEffect: effect }
      });

      // Update DB
      const banner = state.results.find(b => b.id === id);
      if (banner) {
         historyDb.save({ ...banner, motionEffect: effect }).then(refreshHistory);
      }

      if (effect !== undefined) {
         addToast('success', `Đã áp dụng hiệu ứng: ${effect}`);
      }
  };

  const handleMagicAction = async (id: string, action: MagicAction) => {
    try {
      const banner = state.results.find(b => b.id === id);
      if (!banner) return;

      if (action === MagicAction.ANNOTATE) {
          dispatch({
              type: 'UPDATE_RESULT',
              id,
              updates: { annotations: !banner.annotations }
          });
          return;
      }

      // VARIANT: Spawn a new result that is a color variation of the current one
      if (action === MagicAction.VARIANT) {
         addToast('info', "Đang tạo biến thể màu sắc mới...");
         
         const newId = Math.random().toString(36).substr(2, 9);
         
         // Create a placeholder based on original
         const variantPlaceholder: BannerResult = {
            ...banner,
            id: newId,
            isRegenerating: true,
            timestamp: Date.now(),
            imageUrl: banner.imageUrl, // Temporary show old one while loading? Or skeleton?
            comments: [] // Ensure new variant starts clean without comments from original
         };
         
         // If we want it to be distinct, maybe add it to list first
         dispatch({ type: 'ADD_RESULT', result: variantPlaceholder });

         // Call API
         try {
            const newVariantUrl = await generateColorVariant(banner.imageUrl);
            const finalVariant = { 
               ...variantPlaceholder,
               imageUrl: newVariantUrl, 
               isRegenerating: false, 
               promptUsed: "Color Variant",
               designRationale: "Color variation generated by AI."
            };

            dispatch({ 
               type: 'UPDATE_RESULT', 
               id: newId, 
               updates: { 
                  imageUrl: newVariantUrl, 
                  isRegenerating: false, 
                  promptUsed: "Color Variant",
                  designRationale: "Color variation generated by AI."
               } 
            });

            // Save to DB
            await historyDb.save(finalVariant);
            refreshHistory();

            addToast('success', "Đã tạo biến thể mới.");
         } catch(e) {
             console.error(e);
             addToast('error', "Lỗi tạo biến thể.");
             dispatch({ type: 'UPDATE_RESULT', id: newId, updates: { isRegenerating: false } }); // Should probably remove it
         }
         return;
      }

      // MOTION: Handled via sub-menu which calls handleApplyMotion directly, 
      // but if called directly here (e.g. shortcut), we can toggle a default.
      if (action === MagicAction.MOTION) {
          // Toggle default Pan if none
          const newEffect = banner.motionEffect ? undefined : 'PAN';
          handleApplyMotion(id, newEffect as MotionEffect);
          return;
      }

      let prompt = "";
      switch(action) {
          case MagicAction.CROP:
              prompt = "Crop image closer to the main product, keeping it centered and high resolution.";
              break;
          case MagicAction.RESIZE:
              prompt = "Zoom out significantly, extending the background seamlessly to create more negative space.";
              break;
          case MagicAction.ERASER:
              prompt = "Remove any text overlays, watermarks, or distracting elements from the background. Keep the product clean.";
              break;
          case MagicAction.FACESWAP:
              prompt = "Replace the model's face with a friendly, smiling Vietnamese model suitable for a local ad.";
              break;
      }

      if (prompt) {
          await handleRegenerate(id, prompt);
      }
    } catch (error: any) {
      console.error("Magic Action Error", error);
      addToast('error', "Lỗi khi xử lý thao tác.");
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
    
      if (state.generatorMode === GeneratorMode.CAMPAIGN) {
        if (state.productImages.length === 0 || !state.brandName) {
           throw new Error("Vui lòng upload ảnh SP và nhập tên thương hiệu");
        }
        
        const campaignData = await generateCampaign({
             references: state.referenceImages,
             products: state.productImages,
             brandName: state.brandName,
             tagline: state.tagline,
             styleCategory: state.styleCategory,
             lightingMode: state.lightingMode,
             globalPrompt: state.globalPrompt,
             aspectRatio: state.aspectRatio,
             brandKit: state.brandKit,
             painPoint: state.painPoint || "General needs",
             useTrendAware: state.isTrendAware
        });

        const campaignId = Math.random().toString(36).substr(2, 9);
        const batchResults: BannerResult[] = campaignData.results.map(res => ({
             id: Math.random().toString(36).substr(2, 9),
             imageUrl: res.imageUrl,
             promptUsed: `Campaign Stage: ${res.stage}`,
             timestamp: Date.now(),
             isRegenerating: false,
             designRationale: res.rationale,
             comments: [],
             campaignId: campaignId,
             stage: res.stage
        }));
        
        dispatch({ type: 'ADD_BATCH_RESULTS', results: batchResults });
        
        // Save batch to DB
        for (const res of batchResults) await historyDb.save(res);
        refreshHistory();

        addToast('success', "Đã tạo chiến dịch quảng cáo AIDA.");

      } else if (state.generatorMode === GeneratorMode.FASHION) {
         const result = await generateFashionTryOn({
            fashionState: state.fashionState,
            brandName: state.brandName,
            aspectRatio: state.aspectRatio
         });

         const newResult: BannerResult = {
            id: Math.random().toString(36).substr(2, 9),
            imageUrl: result.imageUrl,
            promptUsed: "Fashion Try-On",
            timestamp: Date.now(),
            isRegenerating: false,
            designRationale: result.rationale,
            comments: []
         };

         dispatch({ type: 'ADD_RESULT', result: newResult });
         await historyDb.save(newResult);
         refreshHistory();

         addToast('success', "Đã hoàn tất thử đồ (Try-on).");

      } else if (state.generatorMode === GeneratorMode.BULK) {
         if (state.bulkState.inputImages.length === 0) throw new Error("Vui lòng upload ảnh nguồn.");
         
         const results = await generateBulkAssets(state.bulkState.inputImages, state.bulkState.styleReference, {
             brandName: state.brandName,
             tagline: state.tagline,
             styleCategory: state.styleCategory,
             lightingMode: state.lightingMode,
             globalPrompt: state.globalPrompt,
             aspectRatio: state.aspectRatio,
             brandKit: state.brandKit,
             useTrendAware: state.isTrendAware
         });
         
         const batchResults: BannerResult[] = results.map(r => ({
             id: Math.random().toString(36).substr(2, 9),
             imageUrl: r.imageUrl,
             promptUsed: "Bulk Create",
             timestamp: Date.now(),
             isRegenerating: false,
             designRationale: r.rationale,
             comments: []
         }));

         dispatch({ type: 'ADD_BATCH_RESULTS', results: batchResults });
         for (const res of batchResults) await historyDb.save(res);
         refreshHistory();

         addToast('success', `Đã tạo ${results.length} ảnh hàng loạt.`);
      
      } else if (state.generatorMode === GeneratorMode.VIDEO) {
          // VEO Video Generation
          if (state.productImages.length === 0 || !state.brandName) {
             throw new Error("Video cần ảnh sản phẩm và tên thương hiệu.");
          }
          addToast('info', "Đang tạo video quảng cáo (Veo)... Vui lòng đợi.");
          
          const result = await generateVideoAd({
              references: state.referenceImages,
              products: state.productImages,
              brandName: state.brandName,
              tagline: state.tagline,
              styleCategory: state.styleCategory,
              lightingMode: state.lightingMode,
              globalPrompt: state.globalPrompt,
              aspectRatio: state.aspectRatio,
              brandKit: state.brandKit
          });

          const videoResult: BannerResult = {
              id: Math.random().toString(36).substr(2, 9),
              imageUrl: result.imageUrl, // Will be empty or thumbnail
              videoUrl: result.videoUrl,
              promptUsed: "Video Generation (Veo)",
              timestamp: Date.now(),
              isRegenerating: false,
              designRationale: result.rationale,
              comments: []
          };

          dispatch({ type: 'ADD_RESULT', result: videoResult });
          await historyDb.save(videoResult);
          refreshHistory();

          addToast('success', "Đã tạo video thành công!");

      } else {
        if (state.productImages.length === 0 || !state.brandName) {
           throw new Error("Vui lòng upload ảnh SP và nhập tên thương hiệu");
        }

        const iterations = Array.from({ length: state.variantCount });
        const promises = iterations.map(async (_, index) => {
           await new Promise(r => setTimeout(r, index * 600)); // Stagger
           
           const newId = Math.random().toString(36).substr(2, 9);
           
           const { imageUrl, rationale } = await generateBanner({
             references: state.referenceImages,
             products: state.productImages,
             brandName: state.brandName,
             tagline: state.tagline,
             styleCategory: state.styleCategory,
             lightingMode: state.lightingMode,
             globalPrompt: state.globalPrompt,
             aspectRatio: state.aspectRatio,
             brandKit: state.brandKit,
             useTrendAware: state.isTrendAware
           });

           const newBanner: BannerResult = {
             id: newId,
             imageUrl: imageUrl,
             promptUsed: state.globalPrompt,
             timestamp: Date.now(),
             isRegenerating: false,
             designRationale: rationale,
             comments: []
           };

           dispatch({ type: 'ADD_RESULT', result: newBanner });
           await historyDb.save(newBanner);
        });
        await Promise.all(promises);
        refreshHistory();
        addToast('success', "Đã hoàn tất sáng tạo.");
      }

    } catch (error: any) {
      console.error(error);
      addToast('error', "Lỗi tạo nội dung: " + (error.message || "Không xác định"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSafetyCheck = async (id: string) => {
    const banner = state.results.find(r => r.id === id);
    if (!banner) return;
    
    // Safety check mostly works on images. Video support limited.
    if (banner.videoUrl) {
        addToast('info', "Tính năng Safety Check chưa hỗ trợ Video.");
        return;
    }

    addToast('info', "Đang kiểm tra an toàn quảng cáo...");
    const report = await analyzeAdSafety(banner.imageUrl);
    dispatch({ type: 'SET_SAFETY_REPORT', bannerId: id, report });
    
    // Update DB
    await historyDb.save({ ...banner, safetyReport: report });
    refreshHistory();

    if (report.isSafe) addToast('success', `An toàn (Score: ${report.score})`);
    else addToast('error', `Rủi ro: ${report.warnings.join(', ')}`);
  };

  const refreshHistory = async () => {
      const all = await historyDb.getAll();
      setHistoryItems(all);
  };

  const handleHistorySelect = (item: BannerResult) => {
      // Check if item is already in canvas
      if (!state.results.find(r => r.id === item.id)) {
          dispatch({ type: 'ADD_RESULT', result: item });
          addToast('info', 'Đã thêm ảnh từ lịch sử vào Canvas.');
      } else {
          dispatch({ type: 'SET_FIELD', field: 'selectedBannerId', value: item.id });
      }
  };

  const handleHistoryDelete = async (id: string) => {
      if (window.confirm("Bạn có chắc muốn xóa ảnh này vĩnh viễn?")) {
          await historyDb.delete(id);
          refreshHistory();
          // Also remove from canvas if present
          dispatch({ type: 'REMOVE_RESULT', id });
          addToast('info', 'Đã xóa ảnh.');
      }
  };

  const handleClearHistory = async () => {
      if (window.confirm("CẢNH BÁO: Hành động này sẽ xóa toàn bộ lịch sử trong Database trình duyệt. Không thể hoàn tác.")) {
          await historyDb.clear();
          refreshHistory();
          dispatch({ type: 'CLEAR_RESULTS' });
          addToast('success', 'Đã xóa toàn bộ dữ liệu.');
      }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "red_workspace_session.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addToast('info', "Đã xuất file session.");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        dispatch({ type: 'IMPORT_STATE', state: parsed });
        addToast('success', "Đã khôi phục phiên làm việc.");
      } catch (err) {
        addToast('error', "File JSON không hợp lệ.");
      }
    };
    reader.readAsText(file);
  };

  // Callback passed to Live Director
  const handleVoiceStateUpdate = (field: string, value: any) => {
     // @ts-ignore
     dispatch({ type: 'SET_FIELD', field, value });
     addToast('info', `Voice: Updated ${field}`);
  };

  return (
    <div className={`fixed inset-0 w-full h-full flex bg-brand-light dark:bg-brand-dark text-gray-800 dark:text-gray-300 font-sans overflow-hidden relative selection:bg-brand-red/30 transition-colors duration-500 ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      
      <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      {/* GEMINI LIVE DIRECTOR WIDGET */}
      <LiveCreativeDirector 
         appState={state} 
         onUpdateState={handleVoiceStateUpdate} 
         onTriggerGenerate={handleGenerate} 
      />

      {/* HISTORY DRAWER */}
      <HistoryDrawer 
         isOpen={isHistoryOpen}
         onClose={() => setIsHistoryOpen(false)}
         historyItems={historyItems}
         onSelect={handleHistorySelect}
         onDelete={handleHistoryDelete}
         onClearAll={handleClearHistory}
      />

      {!sidebarOpen && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="fixed top-6 left-6 z-50 p-2 bg-white/80 dark:bg-black/50 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-lg hover:bg-brand-red hover:text-white transition-colors text-gray-600 dark:text-white shadow-lg"
        >
          <Menu size={20} />
        </button>
      )}

      {/* LEFT PANEL */}
      <div 
        ref={sidebarRef}
        className={`glass-panel bg-brand-panel-light dark:bg-brand-panel-dark border-r border-gray-200 dark:border-white/5 h-full flex flex-col z-40 relative flex-shrink-0 ${isResizing ? 'transition-none' : 'transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]'} ${!sidebarOpen ? 'translate-x-[-100%] opacity-0' : 'translate-x-0'}`}
        style={{ width: sidebarOpen ? sidebarWidth : 0 }}
      >
        {/* Resizer Handle */}
        <div
          className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize z-50 hover:bg-brand-red/20 transition-colors active:bg-brand-red/50"
          onMouseDown={startResizing}
        />

        {/* Header */}
        <div className="h-20 flex-shrink-0 flex items-center justify-between px-6 border-b border-gray-200 dark:border-white/5">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-900 rounded-lg flex items-center justify-center shadow-md dark:shadow-[0_0_15px_rgba(255,0,0,0.5)]">
                <span className="text-white font-bold text-xs">R</span>
             </div>
             <div>
                <h1 className="text-gray-900 dark:text-white font-bold text-sm tracking-[0.2em] whitespace-nowrap">RED WORKSPACE</h1>
                <p className="text-[10px] text-gray-500 tracking-wider font-medium whitespace-nowrap">ENTERPRISE SUITE</p>
             </div>
           </div>
           
           <div className="flex items-center gap-2">
            <button
               onClick={toggleTheme}
               className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors"
               title="Chuyển đổi giao diện"
            >
               {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:text-red-500 text-gray-400 transition-colors">
               <X size={16} />
            </button>
           </div>
        </div>

        {/* Mode Selector */}
        <ModeSelector 
          currentMode={state.generatorMode}
          onChange={(mode) => dispatch({type: 'SET_FIELD', field: 'generatorMode', value: mode})}
        />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          
          {/* --- FASHION STUDIO FORM --- */}
          {state.generatorMode === GeneratorMode.FASHION && (
             <FashionStudioForm state={state} dispatch={dispatch} />
          )}

          {/* --- BULK CREATE FORM --- */}
          {state.generatorMode === GeneratorMode.BULK && (
             <BulkCreateForm state={state} dispatch={dispatch} />
          )}

          {/* --- VIDEO FORM --- */}
          {state.generatorMode === GeneratorMode.VIDEO && (
              <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl mb-6">
                <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400">
                    <Video size={18} />
                    <h3 className="font-bold text-sm uppercase">Veo Video Generator</h3>
                </div>
                <p className="text-[10px] text-gray-500">
                    Tạo video quảng cáo điện ảnh 6s từ ảnh tĩnh bằng mô hình Google Veo mới nhất.
                </p>
             </div>
          )}

          {/* --- STANDARD & CAMPAIGN FORM --- */}
          {(state.generatorMode === GeneratorMode.STANDARD || state.generatorMode === GeneratorMode.CAMPAIGN || state.generatorMode === GeneratorMode.VIDEO) && (
            <>
              <Section title="Brand Assets (Enterprise)" icon={<Briefcase size={16} />}>
                 <BrandKitPanel 
                    brandKit={state.brandKit}
                    onChange={(kit) => dispatch({ type: 'UPDATE_BRAND_KIT', kit })}
                 />
              </Section>

              <Section title="Ảnh mẫu / Ý tưởng" icon={<Layers size={16} />}>
                <p className="text-[11px] text-gray-500 mb-4 leading-relaxed font-medium">
                  Tải lên ảnh mẫu (Pinterest, Behance). AI sẽ học ánh sáng, bố cục và "vibe".
                </p>
                <ImageUploader 
                  label="References" 
                  images={state.referenceImages}
                  onUpload={(imgs) => dispatch({ type: 'ADD_REF_IMAGE', images: imgs })}
                  onRemove={(id) => dispatch({ type: 'REMOVE_REF_IMAGE', id })}
                />
              </Section>

              <Section title="Ảnh sản phẩm" icon={<LayoutTemplate size={16} />}>
                <p className="text-[11px] text-gray-500 mb-4 font-medium">
                   Ảnh sản phẩm chính.
                </p>
                <ImageUploader 
                  label="Products" 
                  images={state.productImages}
                  onUpload={handleProductUpload}
                  onRemove={(id) => dispatch({ type: 'REMOVE_PROD_IMAGE', id })}
                />
              </Section>

              <Section title="Thông tin thương hiệu" icon={<Type size={16} />}>
                <div className="space-y-4">
                  <div className="group">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 group-focus-within:text-brand-red transition-colors">Tên Thương hiệu</label>
                    <input 
                      type="text" 
                      className="w-full bg-brand-input-light dark:bg-brand-input-dark border border-gray-200 dark:border-transparent rounded-lg p-3 text-sm text-gray-800 dark:text-white focus:border-brand-red/50 focus:bg-white dark:focus:bg-white/10 focus:outline-none transition-all placeholder-gray-400 dark:placeholder-gray-700 shadow-sm"
                      placeholder="VD: Cây Thị, Vinamilk..."
                      value={state.brandName}
                      onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'brandName', value: e.target.value })}
                    />
                  </div>

                  <SmartTaglineInput 
                     brandName={state.brandName}
                     value={state.tagline}
                     onChange={(val) => dispatch({ type: 'SET_FIELD', field: 'tagline', value: val })}
                  />
                </div>
              </Section>

              <Section title="Cấu hình" icon={<Settings size={16} />}>
                 <div className="space-y-5">
                    
                    {/* Pain Point Input (Only in Campaign Mode) */}
                    {state.generatorMode === GeneratorMode.CAMPAIGN && (
                       <div className="animate-in slide-in-from-top-2 fade-in p-3 bg-brand-red/5 rounded-lg border border-brand-red/10">
                          <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Vấn đề / Nỗi đau khách hàng</label>
                          <input 
                            type="text" 
                            className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-transparent rounded-lg p-3 text-sm text-gray-800 dark:text-white focus:border-brand-red/50 focus:outline-none transition-all placeholder-gray-400 dark:placeholder-gray-700 shadow-sm"
                            placeholder="VD: Da sạm nám, Áo mặc không tôn dáng..."
                            value={state.painPoint}
                            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'painPoint', value: e.target.value })}
                          />
                       </div>
                    )}

                    <SmartPromptBuilder 
                      value={state.globalPrompt} 
                      onChange={(val) => dispatch({ type: 'SET_FIELD', field: 'globalPrompt', value: val })}
                      suggestions={promptChips}
                      smartSuggestion={state.currentAnalysis?.magicPrompt || null}
                      isAnalyzing={state.isAnalyzing}
                    />

                    {/* Trend Awareness Toggle */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-blue-500" />
                            <div>
                                <div className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase">Bắt trend (Google Search)</div>
                                <div className="text-[9px] text-blue-600 dark:text-blue-400">Tự động tìm xu hướng thiết kế mới</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={state.isTrendAware}
                                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'isTrendAware', value: e.target.checked })}
                            />
                            <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                    </div>

                    {/* --- LIGHTING & STYLE (NEW UPGRADE) --- */}
                    <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Hệ thống ánh sáng (Virtual Studio)</label>
                          <div className="relative group">
                            <select 
                              className="w-full bg-brand-input-light dark:bg-brand-input-dark border border-gray-200 dark:border-transparent rounded-lg p-2.5 text-xs text-gray-800 dark:text-white appearance-none focus:outline-none focus:border-brand-red/50 focus:bg-white dark:focus:bg-white/10 transition-all shadow-sm cursor-pointer"
                              value={state.lightingMode}
                              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'lightingMode', value: e.target.value })}
                            >
                              {Object.values(LightingMode).map(mode => (
                                <option key={mode} value={mode}>{mode}</option>
                              ))}
                            </select>
                            <Zap size={12} className="absolute right-3 top-3 text-yellow-500 pointer-events-none group-hover:text-yellow-400 transition-colors"/>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Phong cách</label>
                                <div className="relative group">
                                    <select 
                                    className={`w-full bg-brand-input-light dark:bg-brand-input-dark border rounded-lg p-2.5 text-xs text-gray-800 dark:text-white appearance-none focus:outline-none transition-all shadow-sm cursor-pointer ${recommendedStyle ? 'border-brand-red/30 shadow-[0_0_10px_rgba(255,46,46,0.1)]' : 'border-gray-200 dark:border-transparent focus:border-brand-red/50 focus:bg-white dark:focus:bg-white/10'}`}
                                    value={state.styleCategory}
                                    onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'styleCategory', value: e.target.value })}
                                    >
                                    {Object.values(StyleCategory).map(cat => (
                                        <option key={cat} value={cat}>
                                        {cat} {recommendedStyle === cat ? '✨' : ''}
                                        </option>
                                    ))}
                                    </select>
                                    <Palette size={12} className="absolute right-3 top-3 text-gray-400 dark:text-gray-500 pointer-events-none group-hover:text-brand-red transition-colors"/>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Tỉ lệ</label>
                                <div className="relative">
                                    <select 
                                        className="w-full bg-brand-input-light dark:bg-brand-input-dark border border-gray-200 dark:border-transparent rounded-lg p-2.5 text-xs text-gray-800 dark:text-white focus:border-brand-red/50 focus:bg-white dark:focus:bg-white/10 focus:outline-none transition-all shadow-sm cursor-pointer appearance-none"
                                        value={state.aspectRatio}
                                        onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'aspectRatio', value: e.target.value })}
                                    >
                                        <option value={AspectRatio.SQUARE}>{AspectRatio.SQUARE}</option>
                                        <option value={AspectRatio.PORTRAIT}>{AspectRatio.PORTRAIT}</option>
                                        <option value={AspectRatio.LANDSCAPE}>{AspectRatio.LANDSCAPE}</option>
                                    </select>
                                    <LayoutTemplate size={12} className="absolute right-3 top-3 text-gray-400 dark:text-gray-500 pointer-events-none"/>
                                </div>
                            </div>
                        </div>
                    </div>

                    {state.generatorMode === GeneratorMode.STANDARD && (
                      <div>
                         <div className="flex justify-between mb-2">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Số lượng biến thể</label>
                            <span className="text-[10px] text-brand-red font-bold">{state.variantCount}</span>
                         </div>
                         <input 
                           type="range" min="1" max="5" 
                           value={state.variantCount}
                           onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'variantCount', value: parseInt(e.target.value) })}
                           className="w-full accent-brand-red h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700"
                         />
                      </div>
                    )}
                 </div>
              </Section>
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-white/5 space-y-3 bg-white/50 dark:bg-black/20">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden group shadow-xl ${
              isGenerating 
                ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed' 
                : state.generatorMode === GeneratorMode.VIDEO 
                   ? 'bg-purple-600 text-white neon-shadow hover:scale-[1.02] hover:bg-purple-500'
                   : 'bg-brand-red text-white neon-shadow hover:scale-[1.02] hover:bg-red-600'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                {state.generatorMode === GeneratorMode.VIDEO ? <Video size={18} /> : <Sparkles size={18} className="group-hover:animate-pulse" />}
                <span>
                   {state.generatorMode === GeneratorMode.FASHION ? 'MẶC THỬ (TRY-ON)' : 
                    state.generatorMode === GeneratorMode.BULK ? 'TẠO HÀNG LOẠT' :
                    state.generatorMode === GeneratorMode.CAMPAIGN ? 'TẠO CHIẾN DỊCH' : 
                    state.generatorMode === GeneratorMode.VIDEO ? 'TẠO VIDEO (VEO)' :
                    'BẮT ĐẦU SÁNG TẠO'}
                </span>
              </>
            )}
          </button>

          <div className="flex gap-2">
             <button onClick={handleExport} className="flex-1 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 text-[10px] text-gray-600 dark:text-gray-400 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm">
                <Download size={12} /> Lưu Session
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 text-[10px] text-gray-600 dark:text-gray-400 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm">
                <Upload size={12} /> Mở Session
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 relative h-full flex flex-col min-w-0">
         
         {/* Left Floating Toolbar */}
         <div 
           className="fixed top-6 z-[60] flex gap-2 pointer-events-none transition-all duration-500"
           style={{ left: sidebarOpen ? sidebarWidth + 24 : 80 }}
         >
            <div className="pointer-events-auto bg-white/90 dark:bg-black/80 backdrop-blur border border-gray-200 dark:border-white/10 rounded-lg p-1 flex items-center shadow-md">
                <button 
                  onClick={() => dispatch({type: 'SET_FIELD', field: 'isReviewMode', value: !state.isReviewMode})}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-colors ${state.isReviewMode ? 'bg-brand-red text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                >
                  <MessageSquare size={14} /> Chế độ Duyệt
                </button>
            </div>
         </div>

         {/* Right Floating Toolbar */}
         <div className="fixed top-6 right-6 z-[60] flex gap-2 pointer-events-none max-w-[calc(100%-2rem)]">
            <div className="flex gap-2 pointer-events-auto flex-wrap justify-end">
              {/* View Mode Switcher */}
               <div className="bg-white/90 dark:bg-black/80 backdrop-blur border border-gray-200 dark:border-white/10 rounded-lg p-1 flex items-center shadow-md">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-brand-red text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
                    title="Chế độ lưới"
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button 
                    onClick={() => setViewMode('solo')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'solo' ? 'bg-brand-red text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
                    title="Chế độ tiêu điểm"
                  >
                    <Maximize size={16} />
                  </button>
               </div>

               {/* Platform Select */}
               <div className="bg-white/90 dark:bg-black/80 backdrop-blur border border-gray-200 dark:border-white/10 rounded-lg p-1 flex items-center shadow-md">
                   <div className="px-2 border-r border-gray-200 dark:border-white/10 mr-2 flex items-center gap-1 text-gray-500">
                      <ShoppingBag size={14} />
                      <span className="text-[10px] font-bold uppercase whitespace-nowrap hidden sm:inline">Sàn TMĐT</span>
                   </div>
                   <select 
                      value={state.platformPreset}
                      onChange={(e) => dispatch({type: 'SET_FIELD', field: 'platformPreset', value: e.target.value})}
                      className="bg-transparent text-xs text-gray-800 dark:text-white outline-none cursor-pointer max-w-[120px] sm:max-w-none"
                   >
                      {Object.values(PlatformPreset).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                   </select>
               </div>
            </div>
         </div>

         <div className="flex-1 w-full h-full">
             <Canvas 
                banners={state.results} 
                isGenerating={isGenerating} 
                onRegenerate={handleRegenerate} 
                theme={theme}
                platformPreset={state.platformPreset}
                isReviewMode={state.isReviewMode}
                onAddComment={(id, c) => dispatch({type: 'ADD_COMMENT', bannerId: id, comment: c})}
                onCheckSafety={handleSafetyCheck}
                onMagicAction={handleMagicAction}
                onApplyMotion={handleApplyMotion}
                viewMode={viewMode}
                selectedBannerId={state.selectedBannerId}
                onSelectBanner={(id) => dispatch({type: 'SET_FIELD', field: 'selectedBannerId', value: id})}
                onOpenHistory={() => { setIsHistoryOpen(true); refreshHistory(); }}
             />
         </div>
      </div>

    </div>
  );
};

export default App;
