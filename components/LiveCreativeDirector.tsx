

import React, { useEffect, useRef, useState, memo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";
import { Mic, MicOff, Activity, Loader2, X } from 'lucide-react';
import { AppState, GeneratorMode, StyleCategory, LightingMode } from '../types';

interface LiveCreativeDirectorProps {
  appState: AppState;
  onUpdateState: (field: string, value: any) => void;
  onTriggerGenerate: () => void;
}

// Audio Utils
const floatTo16BitPCM = (float32Array: Float32Array) => {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
};

const base64Encode = (str: string) => window.btoa(str);

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export const LiveCreativeDirector: React.FC<LiveCreativeDirectorProps> = memo(({ appState, onUpdateState, onTriggerGenerate }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // User is speaking
  const [aiSpeaking, setAiSpeaking] = useState(false); // AI is speaking
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  
  // Tool Definitions for Function Calling
  const tools: FunctionDeclaration[] = [
    {
      name: "set_generator_mode",
      description: "Change the application mode (Standard, Campaign, Fashion, etc.)",
      parameters: {
        type: Type.OBJECT,
        properties: {
          mode: {
            type: Type.STRING,
            enum: Object.values(GeneratorMode),
            description: "The mode to switch to."
          }
        },
        required: ["mode"]
      }
    },
    {
      name: "set_style_category",
      description: "Change the design style category (Elegant, Bold, Cute, etc.)",
      parameters: {
        type: Type.OBJECT,
        properties: {
          style: {
            type: Type.STRING,
            enum: Object.values(StyleCategory),
            description: "The visual style to apply."
          }
        },
        required: ["style"]
      }
    },
    {
      name: "set_lighting_mode",
      description: "Change the studio lighting setup (Studio, Natural, Neon, etc.)",
      parameters: {
        type: Type.OBJECT,
        properties: {
          mode: {
            type: Type.STRING,
            enum: Object.values(LightingMode),
            description: "The lighting setup to use."
          }
        },
        required: ["mode"]
      }
    },
    {
      name: "update_brand_info",
      description: "Update brand name or tagline",
      parameters: {
        type: Type.OBJECT,
        properties: {
          brandName: { type: Type.STRING, description: "Name of the brand" },
          tagline: { type: Type.STRING, description: "Brand slogan/tagline" },
          painPoint: { type: Type.STRING, description: "Customer pain point for campaigns" }
        }
      }
    },
    {
      name: "start_generation",
      description: "Trigger the image generation process. Call this when user says 'Generate', 'Create', 'Make it', etc.",
      parameters: {
        type: Type.OBJECT,
        properties: {}
      }
    }
  ];

  const connect = async () => {
    try {
      setError(null);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Audio Context Setup
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Microphone Setup
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
      mediaStreamRef.current = stream;
      
      const inputContext = new AudioContext({ sampleRate: 16000 });
      const source = inputContext.createMediaStreamSource(stream);
      const processor = inputContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: `You are the "Red Workspace Creative Director". 
          You help users design ad banners. You can control the app UI.
          Be professional, concise, and enthusiastic about design.
          If the user asks to change style, lighting, or mode, use the tools.
          If the user says "Create" or "Start", use start_generation tool.`,
          tools: [{ functionDeclarations: tools }]
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setIsConnected(true);
            
            // Start processing mic audio
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple volume meter
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(rms * 10); // Scale up
              setIsSpeaking(rms > 0.05);

              // Convert to PCM and send
              const pcmData = floatTo16BitPCM(inputData);
              const base64Data = arrayBufferToBase64(pcmData);
              
              sessionPromise.then(session => {
                 session.sendRealtimeInput({
                    media: {
                        mimeType: "audio/pcm;rate=16000",
                        data: base64Data
                    }
                 });
              });
            };
            
            source.connect(processor);
            processor.connect(inputContext.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // 1. Handle Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
               setAiSpeaking(true);
               await playAudioChunk(audioData);
            }
            if (msg.serverContent?.turnComplete) {
                setAiSpeaking(false);
            }

            // 2. Handle Tool Calls
            if (msg.toolCall) {
              console.log("Tool Call Received:", msg.toolCall);
              const responses = [];
              
              for (const fc of msg.toolCall.functionCalls) {
                 let result: Record<string, any> = { status: "ok" };
                 
                 try {
                   switch (fc.name) {
                     case 'set_generator_mode':
                        onUpdateState('generatorMode', fc.args.mode);
                        break;
                     case 'set_style_category':
                        onUpdateState('styleCategory', fc.args.style);
                        break;
                     case 'set_lighting_mode':
                        onUpdateState('lightingMode', fc.args.mode);
                        break;
                     case 'update_brand_info':
                        if (fc.args.brandName) onUpdateState('brandName', fc.args.brandName);
                        if (fc.args.tagline) onUpdateState('tagline', fc.args.tagline);
                        if (fc.args.painPoint) onUpdateState('painPoint', fc.args.painPoint);
                        break;
                     case 'start_generation':
                        onTriggerGenerate();
                        result = { status: "generation_started" };
                        break;
                   }
                 } catch (e) {
                   console.error("Tool execution failed", e);
                   result = { status: "error", message: String(e) };
                 }

                 responses.push({
                   id: fc.id,
                   name: fc.name,
                   response: result
                 });
              }

              sessionPromise.then(session => {
                 session.sendToolResponse({
                    functionResponses: responses
                 });
              });
            }
          },
          onclose: () => {
             setIsConnected(false);
             cleanup();
          },
          onerror: (e) => {
             console.error("Live API Error", e);
             setError("Connection lost");
             setIsConnected(false);
             cleanup();
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error(e);
      setError("Failed to start Live session");
    }
  };

  const playAudioChunk = async (base64String: string) => {
    if (!audioContextRef.current) return;
    
    try {
        const binaryString = atob(base64String);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Convert PCM 16-bit little-endian to float
        const int16Data = new Int16Array(bytes.buffer);
        const floatData = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
            floatData[i] = int16Data[i] / 32768.0;
        }

        const buffer = audioContextRef.current.createBuffer(1, floatData.length, 24000);
        buffer.getChannelData(0).set(floatData);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        
        const now = audioContextRef.current.currentTime;
        const startTime = Math.max(now, nextStartTimeRef.current);
        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;
        
        audioQueueRef.current.push(source);
        source.onended = () => {
             const idx = audioQueueRef.current.indexOf(source);
             if (idx > -1) audioQueueRef.current.splice(idx, 1);
             if (audioQueueRef.current.length === 0) setAiSpeaking(false);
        };
    } catch (e) {
        console.error("Audio Decode Error", e);
    }
  };

  const cleanup = () => {
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    sessionRef.current?.then((s: any) => s.close());
    
    mediaStreamRef.current = null;
    processorRef.current = null;
    audioContextRef.current = null;
    sessionRef.current = null;
    nextStartTimeRef.current = 0;
  };

  const toggleSession = () => {
    if (isConnected) {
       cleanup();
       setIsConnected(false);
    } else {
       connect();
    }
  };

  // Auto cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, []);

  return (
    <div className={`fixed bottom-6 right-20 z-50 transition-all duration-500 flex items-center gap-3`}>
       {/* Status Label */}
       {isConnected && (
         <div className="bg-black/80 text-white px-3 py-1.5 rounded-full text-xs font-bold animate-in slide-in-from-right-4 flex items-center gap-2 border border-brand-red/30 backdrop-blur-md">
            {aiSpeaking ? (
                <span className="text-brand-red animate-pulse flex items-center gap-1">
                   <Activity size={12} /> AI SPEAKING...
                </span>
            ) : isSpeaking ? (
                <span className="text-green-400 flex items-center gap-1">
                   <Activity size={12} /> LISTENING...
                </span>
            ) : (
                <span className="text-gray-400">Creative Director Active</span>
            )}
         </div>
       )}

       {/* The Orb Button */}
       <button 
         onClick={toggleSession}
         className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 group
           ${isConnected 
              ? 'bg-gradient-to-br from-brand-red to-purple-600 scale-110 ring-4 ring-brand-red/20' 
              : 'bg-white dark:bg-black border border-gray-200 dark:border-white/20 hover:scale-105'
           }
         `}
         title={isConnected ? "Dừng Gemini Live" : "Bật Trợ lý Giọng nói"}
       >
          {/* Visualizer Ring */}
          {isConnected && (
             <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-[spin_4s_linear_infinite]" style={{ transform: `scale(${1 + volume})` }}></div>
          )}
          
          {isConnected ? (
             <div className="relative z-10">
                <Activity className="text-white animate-pulse" size={24} />
             </div>
          ) : (
             <Mic className="text-gray-600 dark:text-gray-300 group-hover:text-brand-red transition-colors" size={24} />
          )}
          
          {error && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1">
               <X size={10} />
            </div>
          )}
       </button>
    </div>
  );
});