import React, { useState, useRef, useCallback } from 'react';
// FIX: The `LiveSession` type is not exported from the library.
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { TranscriptEntry, TranscriptRole } from './types';
import { decode, decodeAudioData, createPcmBlob } from './utils/audio';
import Header from './components/Header';
import ConversationView from './components/ConversationView';
import Controls from './components/Controls';

const SYSTEM_INSTRUCTION = `You are an English coach for Korean speakers. Your name is 'Gemini Coach'.
1. If the user speaks in Korean, translate their speech into English and say it back to them. Start your response with 'In English, you can say:'.
2. If the user speaks in English, analyze their sentence for grammatical errors and naturalness. Provide a corrected or more natural version. Start your response with a phrase like 'That's a good try! A more natural way to say that is:'. Then, briefly explain in a simple and encouraging tone why the suggested phrase is better.
3. Keep your responses concise and friendly.
4. Always respond in spoken English.`;

const App: React.FC = () => {
  const [isConversationStarted, setIsConversationStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // FIX: The `LiveSession` type is not exported, so we use `any`.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  let nextStartTime = 0;
  
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');
  
  const ttsAudioContextRef = useRef<AudioContext | null>(null);

  const speakText = useCallback(async (text: string) => {
    if (!process.env.API_KEY) {
      setError("API key is not configured for text-to-speech.");
      return;
    }
    if (isConversationStarted) {
      // TTS is disabled during a live conversation to avoid audio overlap.
      return;
    }

    try {
      if (!ttsAudioContextRef.current || ttsAudioContextRef.current.state === 'closed') {
         ttsAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' }, // Use the same voice as the coach
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (base64Audio && ttsAudioContextRef.current) {
        const audioBuffer = await decodeAudioData(
          decode(base64Audio),
          ttsAudioContextRef.current,
          24000,
          1
        );
        const source = ttsAudioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ttsAudioContextRef.current.destination);
        source.start();
      }
    } catch (err) {
      console.error('Error generating speech:', err);
      setError("Sorry, I couldn't generate the speech for that message.");
    }
  }, [isConversationStarted]);


  const stopConversation = useCallback(() => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    if (scriptProcessorRef.current && audioSourceRef.current && audioContextRef.current) {
        scriptProcessorRef.current.disconnect();
        audioSourceRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
        scriptProcessorRef.current = null;
        audioSourceRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        playingSourcesRef.current.forEach(source => source.stop());
        playingSourcesRef.current.clear();
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    
    setIsConversationStarted(false);
    setIsListening(false);
  }, []);


  const handleStartConversation = async () => {
    setError(null);
    if (!process.env.API_KEY) {
      setError("API key not found. Please set the API_KEY environment variable.");
      return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // FIX: Cast window to `any` to support `webkitAudioContext` for cross-browser compatibility.
        audioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        // FIX: Cast window to `any` to support `webkitAudioContext` for cross-browser compatibility.
        outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        setIsConversationStarted(true);
        setIsListening(true);
        
        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    const source = audioContextRef.current!.createMediaStreamSource(streamRef.current!);
                    audioSourceRef.current = source;
                    const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createPcmBlob(inputData);
                        if(sessionPromiseRef.current) {
                            sessionPromiseRef.current.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        }
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(audioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Handle transcription
                    if (message.serverContent?.inputTranscription) {
                        currentInputTranscription.current += message.serverContent.inputTranscription.text;
                    }
                    if (message.serverContent?.outputTranscription) {
                        currentOutputTranscription.current += message.serverContent.outputTranscription.text;
                    }

                    if (message.serverContent?.turnComplete) {
                        const userText = currentInputTranscription.current.trim();
                        if (userText) {
                            setTranscripts(prev => [...prev, { id: `user-${Date.now()}`, role: TranscriptRole.USER, text: userText }]);
                        }
                        
                        const modelText = currentOutputTranscription.current.trim();
                        if (modelText) {
                            setTranscripts(prev => [...prev, { id: `model-${Date.now()}`, role: TranscriptRole.MODEL, text: modelText }]);
                        }

                        currentInputTranscription.current = '';
                        currentOutputTranscription.current = '';
                    }

                    // Handle audio playback
                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if (base64Audio && outputAudioContextRef.current) {
                        const oac = outputAudioContextRef.current;
                        nextStartTime = Math.max(nextStartTime, oac.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), oac, 24000, 1);
                        const source = oac.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(oac.destination);
                        source.addEventListener('ended', () => {
                            playingSourcesRef.current.delete(source);
                        });
                        source.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                        playingSourcesRef.current.add(source);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Gemini API Error:', e);
                    setError(`An API error occurred: ${e.message}. Please check the console.`);
                    stopConversation();
                },
                onclose: () => {
                    console.log('Session closed.');
                    // Don't call stopConversation here to avoid recursive state updates if already stopping
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: SYSTEM_INSTRUCTION,
            },
        });

    } catch (err) {
        console.error('Error starting conversation:', err);
        setError("Could not start audio session. Please ensure you have given microphone permissions.");
        stopConversation();
    }
  };

  const handleToggleConversation = () => {
    if (isConversationStarted) {
      stopConversation();
    } else {
      handleStartConversation();
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans">
      <Header />
      {error && (
        <div className="bg-red-500 text-white p-4 text-center">
          <p>{error}</p>
        </div>
      )}
      <main className="flex-1 flex flex-col bg-gray-800 overflow-hidden">
        <ConversationView transcripts={transcripts} onSpeak={speakText} isConversationActive={isConversationStarted} />
        <Controls
          isConversationStarted={isConversationStarted}
          isListening={isListening}
          onToggleConversation={handleToggleConversation}
        />
      </main>
    </div>
  );
};

export default App;
