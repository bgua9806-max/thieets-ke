

export enum StyleCategory {
  ELEGANT = 'Sang trọng / Thời trang / Tinh tế',
  CUTE = 'Dễ thương / Trẻ trung / Bo tròn',
  BOLD = 'Nổi bật / Rực rỡ / Bắt mắt',
  MODERN = 'Chuyên nghiệp / Hiện đại / Tối giản',
  RETRO = 'Hoài cổ / Vintage / Màu film',
  IMPACT = 'Mạnh mẽ / Khuyến mãi sốc',
  AUTO = 'Tự động nhận diện'
}

export enum LightingMode {
  STUDIO = 'Studio Softbox (Sạch sẽ, Chuyên nghiệp)',
  NATURAL = 'Natural Window (Tự nhiên, Mềm mại)',
  CINEMATIC = 'Cinematic / Moody (Điện ảnh, Tương phản)',
  NEON = 'Cyberpunk / Neon (Hiện đại, Công nghệ)',
  GOLDEN = 'Golden Hour (Ấm áp, Rực rỡ)',
  HARD = 'Hard Light / Pop (Bóng gắt, Táo bạo)'
}

export enum AspectRatio {
  SQUARE = '1:1 (Vuông - FB/Insta)',
  PORTRAIT = '9:16 (Dọc - Tiktok/Story)',
  LANDSCAPE = '16:9 (Ngang - Youtube/Web)'
}

export enum PlatformPreset {
  NONE = 'None',
  SHOPEE = 'Shopee (Frame + Tags)',
  LAZADA = 'Lazada (Carousel Slice)'
}

export enum CampaignStage {
  HOOK = '1. HOOK (Gây chú ý)',
  SOLUTION = '2. SOLUTION (Giải pháp)',
  PROOF = '3. PROOF (Niềm tin)',
  OFFER = '4. OFFER (Chốt đơn)'
}

export enum GeneratorMode {
  STANDARD = 'Standard Mode',
  CAMPAIGN = 'AIDA Campaign',
  FASHION = 'Fashion Studio',
  BULK = 'Bulk Create',
  VIDEO = 'Video Commercials (Veo)'
}

export enum MagicAction {
  CROP = 'CROP',
  RESIZE = 'RESIZE',
  ERASER = 'ERASER',
  FACESWAP = 'FACESWAP',
  ANNOTATE = 'ANNOTATE',
  VARIANT = 'VARIANT',
  MOTION = 'MOTION'
}

export type MotionEffect = 'PAN' | 'ZOOM' | 'PULSE' | 'SHAKE' | 'NONE';

export interface UploadedImage {
  id: string;
  data: string; // Base64
  mimeType: string;
}

export interface BrandKit {
  logo?: UploadedImage;
  primaryColor: string;
  secondaryColors: string[]; 
  fontName?: string;
  guidelinesSummary?: string; 
  isEnabled: boolean;
}

export interface Comment {
  id: string;
  x: number; // Percent
  y: number; // Percent
  text: string;
  author: string;
  timestamp: number;
}

export interface AdSafetyReport {
  score: number; // 0-100
  textOverlayPercentage: number;
  warnings: string[];
  isSafe: boolean;
  
  // Advanced Critique
  attentionScore: number;
  brandClarityScore: number;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  critique: string;
  
  // Heatmap Data (New Upgrade)
  heatmapPoints?: {x: number, y: number, intensity: number}[];
}

export interface BannerResult {
  id: string;
  imageUrl: string;
  videoUrl?: string; // New: For Veo Video Ads
  promptUsed: string;
  timestamp: number;
  isRegenerating: boolean;
  designRationale?: string;
  safetyReport?: AdSafetyReport;
  comments: Comment[];
  annotations?: boolean;
  motionEffect?: MotionEffect;
  audioPitchData?: string; // Base64 PCM Audio Data
  
  // Campaign Mode Fields
  campaignId?: string;
  stage?: CampaignStage;
}

export interface ImageAnalysisResult {
  category: 'Food' | 'Beauty' | 'Tech' | 'Fashion' | 'Decor' | 'Other';
  suggestedTags: string[];
  magicPrompt: string;
}

// --- Mode Specific States ---

export interface FashionState {
  modelImage?: UploadedImage;
  garmentImage?: UploadedImage;
  keepFace: boolean;
  keepPose: boolean;
}

export interface BulkState {
  inputImages: UploadedImage[];
  styleReference?: UploadedImage;
}

export interface AppState {
  // General Inputs
  referenceImages: UploadedImage[];
  productImages: UploadedImage[];
  brandName: string;
  tagline: string;
  globalPrompt: string;
  styleCategory: StyleCategory;
  lightingMode: LightingMode; // New Upgrade
  aspectRatio: AspectRatio;
  variantCount: number;
  isTrendAware: boolean; // New: Google Search Grounding
  
  // Results
  results: BannerResult[];
  selectedBannerId: string | null; // For Contextual UI
  
  // B2B Enterprise Features
  brandKit: BrandKit;
  platformPreset: PlatformPreset;
  isReviewMode: boolean; 

  // Modes
  generatorMode: GeneratorMode;
  
  // Campaign Mode Specifics
  painPoint: string;

  // Fashion Mode Specifics
  fashionState: FashionState;

  // Bulk Mode Specifics
  bulkState: BulkState;

  // Smart Analysis
  currentAnalysis: ImageAnalysisResult | null;
  isAnalyzing: boolean;
}

export const INITIAL_STATE: AppState = {
  referenceImages: [],
  productImages: [],
  brandName: '',
  tagline: '',
  globalPrompt: '',
  styleCategory: StyleCategory.AUTO,
  lightingMode: LightingMode.STUDIO,
  aspectRatio: AspectRatio.SQUARE,
  variantCount: 4,
  isTrendAware: false,
  results: [],
  selectedBannerId: null,
  
  brandKit: {
    primaryColor: '#FF0000',
    secondaryColors: [],
    isEnabled: false
  },
  platformPreset: PlatformPreset.NONE,
  isReviewMode: false,
  
  generatorMode: GeneratorMode.STANDARD,
  painPoint: '',
  
  fashionState: {
    keepFace: true,
    keepPose: false
  },
  
  bulkState: {
    inputImages: []
  },
  
  currentAnalysis: null,
  isAnalyzing: false
};

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  
  interface Window {
    aistudio?: AIStudio;
  }
}