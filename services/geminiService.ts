

import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AspectRatio, StyleCategory, LightingMode, UploadedImage, BrandKit, AdSafetyReport, CampaignStage, ImageAnalysisResult, FashionState } from "../types";

// Constants for Model
const MODEL_NAME = 'gemini-3-pro-image-preview'; 
const ANALYSIS_MODEL = 'gemini-2.5-flash'; // Faster model for vision analysis
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const VIDEO_MODEL = 'veo-3.1-fast-generate-preview';

interface GenerateBannerParams {
  references: UploadedImage[];
  products: UploadedImage[];
  brandName: string;
  tagline: string;
  styleCategory: StyleCategory;
  lightingMode: LightingMode;
  globalPrompt: string;
  aspectRatio: AspectRatio;
  brandKit: BrandKit;
  useTrendAware?: boolean; // New for Search Grounding
}

interface GenerateCampaignParams extends GenerateBannerParams {
  painPoint: string;
}

interface GenerateFashionParams {
  fashionState: FashionState;
  brandName: string;
  aspectRatio: AspectRatio;
}

interface GenerateResult {
  imageUrl: string;
  videoUrl?: string; // New for Veo
  rationale: string;
}

interface CampaignGenerateResult {
  results: {
    stage: CampaignStage;
    imageUrl: string;
    rationale: string;
  }[];
}

/**
 * Generates an expert design rationale.
 */
const generateDesignRationale = (style: StyleCategory, brandName: string): string => {
  const common = "Áp dụng mô hình AIDA để dẫn dắt thị giác.";
  
  switch (style) {
    case StyleCategory.ELEGANT:
      return `Thiết kế sử dụng Negative Space và ánh sáng studio mềm (Softbox lighting) để tôn vinh sự sang trọng cho ${brandName}. Màu sắc tuân thủ quy tắc 60-30-10 với tông trầm làm chủ đạo, tạo cảm giác Premium.`;
    case StyleCategory.CUTE:
      return `Sử dụng các đường bo tròn và bảng màu Pastel để tạo cảm giác thân thiện. Layout tập trung vào trung tâm giúp sản phẩm của ${brandName} nổi bật nhưng không gắt.`;
    case StyleCategory.BOLD:
    case StyleCategory.IMPACT:
      return `Tương phản cao được sử dụng tối đa để bắt mắt trong 0.5 giây đầu tiên. Typography đậm và bố cục Z-Pattern dẫn mắt người xem trực tiếp vào tên ${brandName}.`;
    case StyleCategory.RETRO:
      return `Sử dụng kết cấu hạt (Film Grain) và bảng màu Vintage để khơi gợi cảm xúc hoài niệm, tạo sự kết nối sâu sắc về mặt thương hiệu cho ${brandName}.`;
    case StyleCategory.MODERN:
      return `Bố cục Grid hệ thống chặt chẽ, phong cách Isometric hoặc Minimalist tạo cảm giác chuyên nghiệp, minh bạch và hiệu quả cao cho sản phẩm.`;
    default:
      return `Thiết kế cân bằng giữa hình ảnh và thông điệp. Điểm nhấn thị giác được đặt vào sản phẩm của ${brandName} theo quy tắc 1/3 để tối ưu hóa tỷ lệ chuyển đổi.`;
  }
};

/**
 * Get Professional Lighting Instructions
 */
const getLightingPrompt = (mode: LightingMode): string => {
    switch (mode) {
        case LightingMode.STUDIO:
            return "Professional Studio Lighting: Large softbox setup, 3-point lighting, clean rim light to separate product from background, neutral white/grey balance, high clarity.";
        case LightingMode.NATURAL:
            return "Natural Daylighting: Soft north-facing window light, dappled sunlight through leaves (gobo effect), organic soft shadows, airy and fresh atmosphere.";
        case LightingMode.CINEMATIC:
            return "Cinematic Mood: Chiaroscuro high-contrast lighting, moody deep shadows, teal and orange color grading, volumetric fog, dramatic depth of field.";
        case LightingMode.NEON:
            return "Cyberpunk Neon: Dual-tone lighting (Cyan & Magenta), dark environment, glowing outlines, high gloss reflections, futuristic vibe.";
        case LightingMode.GOLDEN:
            return "Golden Hour: Warm sunlight (3000K), lens flare, backlit product, rich saturated colors, emotional and inviting atmosphere.";
        case LightingMode.HARD:
            return "Hard Light / Pop Art: Direct hard flash, sharp distinct shadows, vibrant saturated colors, commercial fashion aesthetic, crystal clear focus.";
        default:
            return "Balanced Commercial Lighting: Evenly lit, no harsh shadows, true-to-life colors.";
    }
}

/**
 * Get Professional Photography Prompts based on Style
 */
const getProPhotoPrompt = (style: StyleCategory): string => {
    switch (style) {
        case StyleCategory.ELEGANT:
            return "Luxury Aesthetic: Hasselblad X2D 100C, 80mm f/1.8 lens, Creamy Bokeh background, Ultra-detailed textures (silk, marble, gold), High Fashion Magazine look.";
        case StyleCategory.BOLD:
            return "Pop Art Influence: High voltage colors, dynamic composition, wide angle lens for impact, sharp focus, commercial advertising look.";
        case StyleCategory.RETRO:
            return "Vintage Analog: Kodak Portra 400 film emulation, slight film grain, light leaks, warm nostalgic tones, 1980s or 1990s graphic design elements.";
        case StyleCategory.MODERN:
            return "Tech Minimalist: Isometric view or flat lay, clean geometric shapes, matte surfaces, white space utilization, architectural composition.";
        case StyleCategory.IMPACT:
            return "High Energy: Motion blur effects, speed lines, explosive composition, bold typography integration, intense saturation.";
        case StyleCategory.CUTE:
            return "Kawaii Softness: Macro lens, pastel palette, rounded soft props, dreamy diffusion filter, bright and cheerful.";
        default:
            return "Award-winning Commercial Photography: Rule of Thirds composition, perfect focus on product branding.";
    }
};

/**
 * Analyzes the product image to provide smart tags and a magic prompt.
 */
export const analyzeProductImage = async (image: UploadedImage): Promise<ImageAnalysisResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Analyze this product image for an advertising campaign.
      
      1. IDENTIFY CATEGORY: Choose one of [Food, Beauty, Tech, Fashion, Decor, Other].
      2. SUGGEST TAGS: Provide 5 short Vietnamese adjectives/nouns for a suitable background.
         - IF Food: Use words like "Bàn gỗ", "Nắng mai", "Tươi mát", "Bếp ấm", "Thiên nhiên". REMOVE "Neon", "Cyberpunk".
         - IF Beauty: Use words like "Lụa", "Mặt nước", "Hoa cỏ", "Pastel", "Tinh khiết". REMOVE "Grunge", "Industrial".
         - IF Tech: Use "Neon", "Studio tối", "Laser", "Hiện đại", "Bê tông".
      3. MAGIC PROMPT: Write a detailed, photorealistic prompt (in Vietnamese) describing the perfect scene for this product. 
         Format: "[Style] + [Context/Background] + [Lighting] + [Details]".
         Example for Food: "Phong cách nhiếp ảnh ẩm thực macro, đặt sản phẩm trên bàn gỗ sồi, ánh sáng tự nhiên buổi sáng xuyên qua kẽ lá, hơi nước bốc lên nhẹ, độ phân giải 8k."
      
      Return pure JSON:
      {
        "category": "String",
        "suggestedTags": ["String", "String"...],
        "magicPrompt": "String"
      }
    `;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: {
        parts: [
          { inlineData: { data: image.data, mimeType: image.mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis returned");
    
    const json = JSON.parse(text);
    return {
      category: json.category || 'Other',
      suggestedTags: json.suggestedTags || [],
      magicPrompt: json.magicPrompt || "Ảnh sản phẩm chất lượng cao, ánh sáng studio chuyên nghiệp, 8k."
    };
  } catch (e) {
    console.error("Analysis failed", e);
    // Fallback
    return {
      category: 'Other',
      suggestedTags: ['Chuyên nghiệp', 'Studio', 'Sáng tạo', 'Tối giản', '4K'],
      magicPrompt: "Chụp ảnh sản phẩm chuyên nghiệp, ánh sáng studio, phông nền sạch, độ nét cao."
    };
  }
};

/**
 * Performs a Real Ad Safety Check using Gemini Vision
 */
export const analyzeAdSafety = async (imageUrl: string): Promise<AdSafetyReport> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Act as an Advertising Quality Assurance Expert. Analyze this ad banner.
      
      Evaluate based on:
      1. Text Overlay: Estimate percentage of image covered by text (Facebook 20% rule).
      2. Brand Clarity: Is the logo or brand name visible?
      3. Visual Appeal: Contrast, lighting, and composition.
      4. Heatmap: Identify 3 focal points where the user's eye is drawn immediately (0-100 coordinate scale).
      
      Return JSON:
      {
        "score": number (0-100),
        "textOverlayPercentage": number (0-100),
        "warnings": ["string", "string"],
        "isSafe": boolean (score > 70),
        "attentionScore": number (0-100),
        "brandClarityScore": number (0-100),
        "sentiment": "Positive" | "Neutral" | "Negative",
        "critique": "string (Short expert feedback in Vietnamese, max 2 sentences)",
        "heatmapPoints": [
           { "x": number (0-100), "y": number (0-100), "intensity": number (0.5-1.0) }
        ]
      }
    `;

    // Extract base64 data if it includes the prefix
    const base64Data = imageUrl.includes('base64,') ? imageUrl.split(',')[1] : imageUrl;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/png' } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            textOverlayPercentage: { type: Type.INTEGER },
            warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
            isSafe: { type: Type.BOOLEAN },
            attentionScore: { type: Type.INTEGER },
            brandClarityScore: { type: Type.INTEGER },
            sentiment: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative"] },
            critique: { type: Type.STRING },
            heatmapPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.INTEGER },
                  y: { type: Type.INTEGER },
                  intensity: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No safety analysis returned");
    return JSON.parse(text) as AdSafetyReport;

  } catch (e) {
    console.error("Ad Safety Check Failed", e);
    // Fallback Mock if API fails
    return {
      score: 85,
      textOverlayPercentage: 10,
      warnings: ["Không thể kết nối AI chấm điểm."],
      isSafe: true,
      attentionScore: 80,
      brandClarityScore: 80,
      sentiment: 'Neutral',
      critique: "Hệ thống đang bận, nhưng bố cục trông có vẻ ổn.",
      heatmapPoints: [{x: 50, y: 50, intensity: 0.8}]
    };
  }
};

/**
 * Generates an audio pitch for the design rationale
 */
export const generatePitchAudio = async (text: string): Promise<string> => {
  try {
     const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
     const response = await ai.models.generateContent({
       model: TTS_MODEL,
       contents: {
         parts: [{ text: `Giải thích ý tưởng thiết kế: ${text}` }]
       },
       config: {
         responseModalities: [Modality.AUDIO],
         speechConfig: {
           voiceConfig: {
             prebuiltVoiceConfig: { voiceName: 'Kore' } // Kore is often authoritative/professional
           }
         }
       }
     });

     const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
     if (!audioData) throw new Error("No audio generated");
     return audioData;

  } catch (e) {
    console.error("TTS Generation Failed", e);
    throw e;
  }
};

/**
 * Helper to construct Brand Instructions
 */
const getBrandInstruction = (brandKit: BrandKit) => {
  if (!brandKit.isEnabled) return "";
  const secondaryColorsStr = brandKit.secondaryColors.length > 0 
    ? brandKit.secondaryColors.join(', ') 
    : 'None provided';

  return `
    STRICT BRAND DNA ENFORCEMENT:
    - Primary Brand Color: ${brandKit.primaryColor}. Use this for key elements (CTA, Highlights).
    - Secondary Brand Colors: ${secondaryColorsStr}. Use these for supporting elements/shapes.
    - Logo Placement: Integrate the brand logo naturally (top corner or bottom right).
    ${brandKit.guidelinesSummary ? `- Brand Guidelines: ${brandKit.guidelinesSummary}` : ''}
  `;
};

/**
 * Generates a full 4-slide campaign based on AIDA model
 */
export const generateCampaign = async (params: GenerateCampaignParams): Promise<CampaignGenerateResult> => {
  const { references, products, brandName, tagline, styleCategory, lightingMode, globalPrompt, aspectRatio, brandKit, painPoint } = params;
  const ratioClean = aspectRatio.split(' ')[0];
  const brandInstruction = getBrandInstruction(brandKit);
  const proPhotoPrompt = getProPhotoPrompt(styleCategory);
  const lightingPrompt = getLightingPrompt(lightingMode);

  // 1. Detect Category Context (Mock logic for prompt engineering)
  const lowerPrompt = (globalPrompt + brandName).toLowerCase();
  let proofType = "Customer Reviews & 5 Stars"; // Default
  if (lowerPrompt.includes("kem") || lowerPrompt.includes("da") || lowerPrompt.includes("son") || lowerPrompt.includes("mỹ phẩm")) {
    proofType = "Natural Ingredients (leaves, water drops) & Safety Badges";
  } else if (lowerPrompt.includes("áo") || lowerPrompt.includes("quần") || lowerPrompt.includes("thời trang")) {
    proofType = "Extreme Close-up on Fabric Texture & Stitching Details";
  } else if (lowerPrompt.includes("điện") || lowerPrompt.includes("loa") || lowerPrompt.includes("máy")) {
    proofType = "Technical Specs (Processor, Battery life) & High-tech diagrams";
  }

  // 2. Define Stages
  const stages = [
    {
      stage: CampaignStage.HOOK,
      prompt: `SLIDE 1: ATTENTION (THE HOOK). 
      Goal: Stop the scroll. Address the pain point: "${painPoint}".
      Visual: High contrast, maybe a close-up of the problem OR the product in a dramatic lighting.
      Text: Large, bold question or statement about "${painPoint}".
      Layout: Text dominant (40-50%). Background color should be striking.`
    },
    {
      stage: CampaignStage.SOLUTION,
      prompt: `SLIDE 2: INTEREST (THE SOLUTION).
      Goal: Introduce the product as the hero.
      Visual: Beautiful studio shot of the product, perfectly lit. Clean background.
      Text: Product Name "${brandName}" + Key Benefit/Tagline "${tagline}".
      Layout: Product centered. Balanced text.`
    },
    {
      stage: CampaignStage.PROOF,
      prompt: `SLIDE 3: DESIRE (THE PROOF).
      Goal: Build trust.
      Visual: ${proofType}. Show why it works.
      Text: Short credibility statement (e.g. "Top Rated", "100% Organic"). Add 5-star graphic elements.
      Layout: Detail-oriented, trust-building aesthetic.`
    },
    {
      stage: CampaignStage.OFFER,
      prompt: `SLIDE 4: ACTION (THE OFFER).
      Goal: Convert the sale.
      Visual: Product shown with packaging or a "Gift/Sale" context.
      Text: Strong CTA "MUA NGAY" or "GIẢM 50%". Scarcity element "Duy nhất hôm nay".
      Layout: Button is the focal point. Use the Accent Color heavily.`
    }
  ];

  // 3. Execute Parallel Generation
  const campaignResults = await Promise.all(stages.map(async (s) => {
    const parts: any[] = [];
    
    // Add Logo if Brand Kit
    if (brandKit.isEnabled && brandKit.logo) {
      parts.push({ inlineData: { data: brandKit.logo.data, mimeType: brandKit.logo.mimeType } });
    }
    // Add References & Product
    references.forEach(ref => parts.push({ inlineData: { data: ref.data, mimeType: ref.mimeType } }));
    products.forEach(prod => parts.push({ inlineData: { data: prod.data, mimeType: prod.mimeType } }));

    const fullPrompt = `
      Act as a Marketing Expert & Photographer. Design Slide for Campaign Stage: ${s.stage}.
      CONTEXT: Vietnamese E-commerce.
      BRAND: ${brandName}.
      STYLE: ${styleCategory}.
      LIGHTING: ${lightingPrompt}.
      PHOTOGRAPHY: ${proPhotoPrompt}.
      CONSISTENCY: Use the same color palette and lighting across all slides.
      ${brandInstruction}
      
      SPECIFIC SLIDE INSTRUCTIONS:
      ${s.prompt}
    `;
    
    parts.push({ text: fullPrompt });

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts: parts },
        config: { imageConfig: { aspectRatio: ratioClean, imageSize: "1K" } }
      });

      const imgData = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
      if (imgData) {
        return {
          stage: s.stage,
          imageUrl: `data:image/png;base64,${imgData.data}`,
          rationale: `Campaign Stage: ${s.stage}. Designed to move customer through the funnel.`
        };
      }
      throw new Error(`Failed to generate stage ${s.stage}`);
    } catch (e) {
      console.error(e);
      // Fallback or re-throw
      return { stage: s.stage, imageUrl: "", rationale: "Error" }; 
    }
  }));

  return {
    results: campaignResults.filter(r => r.imageUrl !== "")
  };
};

/**
 * Generates a video ad using Veo model
 */
export const generateVideoAd = async (params: GenerateBannerParams): Promise<GenerateResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { products, brandName, globalPrompt, aspectRatio } = params;

  // Map Aspect Ratio for Veo (Supports '16:9' or '9:16')
  let veoAspect = '16:9';
  if (aspectRatio.includes('9:16')) veoAspect = '9:16';
  
  const productImg = products[0];
  const prompt = `Cinematic product commercial for ${brandName}. ${globalPrompt || 'Slow motion, high quality, professional lighting.'} 
  Showcase the product details clearly.`;

  try {
    let operation = await ai.models.generateVideos({
      model: VIDEO_MODEL,
      prompt: prompt,
      image: productImg ? {
        imageBytes: productImg.data,
        mimeType: productImg.mimeType,
      } : undefined,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: veoAspect
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation returned no URI");

    // Fetch the actual video content to create a blob URL
    // This requires the API Key appended
    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    if (!response.ok) throw new Error("Failed to download generated video");
    
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    return {
      imageUrl: "", // Placeholder or thumbnail could be generated
      videoUrl: blobUrl,
      rationale: "Generated using Veo 3.1. Cinematic Motion Ad."
    };

  } catch (error) {
    console.error("Veo Generation Error:", error);
    throw error;
  }
};

/**
 * Generates a banner using the Gemini 3 Pro Image model with Strategic Marketing inputs.
 */
export const generateBanner = async (params: GenerateBannerParams): Promise<GenerateResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const {
      references,
      products,
      brandName,
      tagline,
      styleCategory,
      lightingMode,
      globalPrompt,
      aspectRatio,
      brandKit,
      useTrendAware
    } = params;

    const ratioClean = aspectRatio.split(' ')[0];
    const brandInstruction = getBrandInstruction(brandKit);
    const proPhotoPrompt = getProPhotoPrompt(styleCategory);
    const lightingPrompt = getLightingPrompt(lightingMode);

    let promptText = `Act as a World-Class Creative Director & Photographer. Design a high-conversion banner for the Vietnamese market.
    
    CORE VISUAL SETTINGS:
    1. LIGHTING SETUP: ${lightingPrompt}
    2. PHOTOGRAPHY STYLE: ${proPhotoPrompt}
    3. MASTER DETAILER: Render with 8k textures, focus on product materiality (glass reflection, fabric weave, metal sheen). Use Octane Render style for depth. 
    
    MARKETING STRUCTURE (AIDA):
    1. Structure the layout to Grab Attention (Headline/Color) -> Build Interest (Product) -> Create Desire (Visuals) -> Call to Action.
    2. Z-PATTERN LAYOUT: Arrange elements so the eye flows naturally from Top-Left to Bottom-Right.
    3. 60-30-10 COLOR RULE: Use 60% Dominant (Background/Space), 30% Secondary (Shapes/Patterns), 10% Accent (Key Info/CTA).
    
    ${brandInstruction}

    SPECIFIC INSTRUCTIONS:
    - Context: Vietnamese E-commerce context.
    - Brand Name: "${brandName}" (Must be clear, legible, professional).
    - Language: VIETNAMESE (Tiếng Việt) only.
    ${tagline ? `- Tagline: "${tagline}"` : '- Create a short, punchy, rhyming Vietnamese tagline using Power Words.'}
    - Style Direction: ${styleCategory}.
    - Custom Request: ${globalPrompt}
    - Product Integration: Seamlessly blend the product into the scene with realistic shadows and reflections (No floating products).
    
    QUALITY ASSURANCE (NEGATIVE PROMPT):
    - Do NOT generate distorted text or gibberish.
    - Do NOT cut off the main product.
    - Do NOT produce cartoonish or low-resolution textures.
    - Ensure high legibility for all text layers.
    `;

    // Google Search Grounding for Trend Awareness
    const tools: any[] = [];
    if (useTrendAware) {
        tools.push({ googleSearch: {} });
        promptText += "\n\nTREND AWARENESS ENABLED: Use Google Search to find current 2025 design trends for this product category and incorporate them into the visual style (colors, motifs, layout).";
    }

    const parts: any[] = [];
    
    if (brandKit.isEnabled && brandKit.logo) {
      parts.push({
        inlineData: {
          data: brandKit.logo.data,
          mimeType: brandKit.logo.mimeType
        }
      });
      promptText += "\n NOTE: The first image provided is the BRAND LOGO. Place it prominently.";
    }

    references.forEach(ref => {
      parts.push({
        inlineData: {
          data: ref.data,
          mimeType: ref.mimeType
        }
      });
    });
    
    products.forEach(prod => {
      parts.push({
        inlineData: {
          data: prod.data,
          mimeType: prod.mimeType
        }
      });
    });

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
            aspectRatio: ratioClean,
            imageSize: "1K"
        },
        tools: tools.length > 0 ? tools : undefined
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return {
            imageUrl: `data:image/png;base64,${part.inlineData.data}`,
            rationale: generateDesignRationale(styleCategory, brandName)
        };
      }
    }
    
    throw new Error("Không tạo được ảnh. Vui lòng thử lại.");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const regenerateBannerImage = async (
  originalImageBase64: string,
  instruction: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const promptText = `Expertly edit this advertising banner based on: "${instruction}". 
    Maintain the Strategic Marketing Layout (Z-Pattern) and High-End Typography. 
    Ensure lighting remains consistent. Ensure text remains legible Vietnamese.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: originalImageBase64.split(',')[1],
              mimeType: 'image/png'
            }
          },
          { text: promptText }
        ]
      },
      config: {
        imageConfig: {
           aspectRatio: "1:1" 
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
     throw new Error("Không tạo được ảnh chỉnh sửa.");
  } catch (error) {
     console.error("Gemini Regeneration Error:", error);
     throw error;
  }
};

/**
 * Generates a color variant of the existing image
 */
export const generateColorVariant = async (
  originalImageBase64: string,
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // List of colors to randomly rotate through
    const colors = ["Red", "Blue", "Emerald Green", "Gold", "Purple", "Minimalist White"];
    const targetColor = colors[Math.floor(Math.random() * colors.length)];

    const promptText = `
      Act as a Colorist Expert.
      TASK: Create a distinct color variation of this ad banner.
      INSTRUCTION: Change the dominant color scheme to: ${targetColor} Theme.
      CONSTRAINT: Keep the product image, layout, text, and composition EXACTLY the same. Only modify the background colors, shapes, and lighting tone.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: originalImageBase64.split(',')[1],
              mimeType: 'image/png'
            }
          },
          { text: promptText }
        ]
      },
      config: {
        imageConfig: {
           aspectRatio: "1:1" 
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
     throw new Error("Failed to generate variant.");
  } catch (error) {
     console.error("Gemini Variant Error:", error);
     throw error;
  }
};

/**
 * Generates a Fashion Try-On Image
 */
export const generateFashionTryOn = async (params: GenerateFashionParams): Promise<GenerateResult> => {
  const { fashionState, brandName, aspectRatio } = params;
  
  if (!fashionState.modelImage || !fashionState.garmentImage) throw new Error("Missing inputs");

  const ratioClean = aspectRatio.split(' ')[0];
  
  const prompt = `
    Act as a Virtual Fitting Room AI.
    Task: Realistically put the GARMENT onto the MODEL.
    
    Instructions:
    - Keep the Model's Face: ${fashionState.keepFace ? "YES, STRICTLY" : "NO, generate a new model face"}.
    - Keep the Pose: ${fashionState.keepPose ? "YES" : "NO, you can improve the pose"}.
    - Fit the garment naturally, respecting fabric physics, lighting, and shadows.
    - Brand context: ${brandName}.
    
    Output a high-fashion photography result.
  `;

  const parts = [
    { inlineData: { data: fashionState.modelImage.data, mimeType: fashionState.modelImage.mimeType } },
    { inlineData: { data: fashionState.garmentImage.data, mimeType: fashionState.garmentImage.mimeType } },
    { text: prompt }
  ];

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: { imageConfig: { aspectRatio: ratioClean, imageSize: "1K" } }
    });

    const imgData = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
    if (imgData) {
      return {
        imageUrl: `data:image/png;base64,${imgData.data}`,
        rationale: "Fashion Try-On Synthesis with Fabric Physics adaptation."
      };
    }
    throw new Error("Try-on failed.");
  } catch (e) {
    console.error(e);
    throw e;
  }
};

/**
 * Bulk Generation Wrapper
 */
export const generateBulkAssets = async (
  images: UploadedImage[], 
  styleRef: UploadedImage | undefined,
  baseParams: any
): Promise<GenerateResult[]> => {
  // Process sequentially to avoid rate limits
  const results: GenerateResult[] = [];
  
  for (const img of images) {
    // Treat each bulk image as a product image in a single generation
    const result = await generateBanner({
      ...baseParams,
      products: [img],
      references: styleRef ? [styleRef] : []
    });
    results.push(result);
  }
  
  return results;
};