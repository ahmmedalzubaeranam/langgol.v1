import React, { useState, useRef, useCallback, useEffect } from "react";
// FIX: Removed `LiveSession` from import as it's not an exported member.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from "@google/genai";
import { LoadingSpinner } from "./LoadingSpinner";
import { MicIcon, StopIcon } from "./Icon";
import { useHistory } from "../hooks/useHistory";

// FIX: Define a local interface for the session object as `LiveSession` is not exported from the library.
interface LiveSession {
  close: () => void;
  sendRealtimeInput: (input: { media: Blob }) => void;
}

// Audio decoding and encoding functions (remains the same)
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const LiveView: React.FC = () => {
  const { history, setHistory } = useHistory();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [currentOutput, setCurrentOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const currentInputRef = useRef("");
  const currentOutputRef = useRef("");

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);

  const stopConversation = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then((session) => session.close());
      sessionPromiseRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (
      outputAudioContextRef.current &&
      outputAudioContextRef.current.state !== "closed"
    ) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
  }, []);

  const startConversation = async () => {
    if (isActive || isConnecting) return;
    setIsConnecting(true);
    setError(null);
    setCurrentInput("");
    setCurrentOutput("");
    currentInputRef.current = "";
    currentOutputRef.current = "";

    try {
      if (!process.env.API_KEY) {
        throw new Error("API KEY is missing.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let nextStartTime = 0;

      outputAudioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const outputNode = outputAudioContextRef.current.createGain();
      outputNode.connect(outputAudioContextRef.current.destination);

      sessionPromiseRef.current = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            audioContextRef.current = new (window.AudioContext ||
              (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source =
              audioContextRef.current.createMediaStreamSource(stream);
            scriptProcessorRef.current =
              audioContextRef.current.createScriptProcessor(4096, 1, 1);

            scriptProcessorRef.current.onaudioprocess = (
              audioProcessingEvent
            ) => {
              const inputData =
                audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(
                  new Uint8Array(
                    new Int16Array(inputData.map((f) => f * 32768)).buffer
                  )
                ),
                mimeType: "audio/pcm;rate=16000",
              };
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(
              audioContextRef.current.destination
            );
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setCurrentInput((prev) => prev + text);
              currentInputRef.current += text;
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setCurrentOutput((prev) => prev + text);
              currentOutputRef.current += text;
            }
            if (message.serverContent?.turnComplete) {
              if (
                currentInputRef.current.trim() ||
                currentOutputRef.current.trim()
              ) {
                setHistory((prev) => ({
                  ...prev,
                  live: [
                    ...prev.live,
                    {
                      user: currentInputRef.current,
                      model: currentOutputRef.current,
                      timestamp: Date.now(),
                    },
                  ],
                }));
              }
              setCurrentInput("");
              setCurrentOutput("");
              currentInputRef.current = "";
              currentOutputRef.current = "";
            }
            const audioData =
              message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const audioBuffer = await decodeAudioData(
                decode(audioData),
                outputAudioContextRef.current,
                24000,
                1
              );
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              const now = outputAudioContextRef.current.currentTime;
              nextStartTime = Math.max(now, nextStartTime);
              source.start(nextStartTime);
              nextStartTime += audioBuffer.duration;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error(e);
            setError("সংযোগ বিচ্ছিন্ন হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
            stopConversation();
          },
          onclose: (e: CloseEvent) => {
            stopConversation();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction:
            "আপনি বাংলাদেশের একজন কৃষি বিশেষজ্ঞ। বাংলাদেশের কৃষকদের ফসলের সমস্যা এবং চাষাবাদ বিষয়ে বাংলা ভাষায় সাহায্য করুন। আপনার উত্তর সহজবোধ্য ও কার্যকরী হতে হবে। আপনার একমাত্র কাজ কৃষি সংক্রান্ত প্রশ্নের উত্তর দেওয়া। যদি কৃষি ছাড়া অন্য কোনো বিষয়ে (যেমন: রাজনীতি, খেলাধুলা, বিনোদন) প্রশ্ন করা হয়, তাহলে নম্রভাবে বলুন যে আপনি শুধুমাত্র কৃষি বিষয়ে সাহায্য করতে পারেন এবং অন্য কোনো উত্তর দিতে অপারগ। বাংলাদেশের বাংলা ভাষায় কথা বলুন, কলকাতার বাংলা পরিহার করুন। মাঝে মধ্যে এক্সপ্রেশন দিন যাতে কৃষক আনন্দিত হন। নমস্কার দেয়া থেকে বিরত থাকো। আপনার প্রস্তুতকারক বা ডেভেলপার হলো 'লাঙ্গল' টিম। কখনই গুগোলের নাম উল্লেখ করবেন না!  ",
        },
      });
    } catch (e) {
      console.error(e);
      setError("মাইক্রোফোন চালু করা সম্ভব হচ্ছে না। অনুগ্রহ করে অনুমতি দিন।");
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, [stopConversation]);

  return (
    <div className="flex flex-col h-full p-4 items-center justify-between text-center">
      <div className="flex-grow w-full max-w-2xl mb-4 overflow-y-auto bg-gray-50 rounded-lg p-4 border">
        <h3 className="text-lg font-semibold text-green-800 mb-4 border-b pb-2">
          কথোপকথনের ইতিহাস
        </h3>
        {history.live.length === 0 && !isActive && (
          <p className="text-gray-500 mt-4">পূর্ববর্তী কোনো কথোপকথন নেই।</p>
        )}
        {history.live.map((turn, index) => (
          <div
            key={index}
            className="mb-3 text-left p-2 border-b last:border-b-0"
          >
            <p>
              <strong className="text-gray-700">আপনি:</strong> {turn.user}
            </p>
            <p>
              <strong className="text-green-700">সহকারী:</strong> {turn.model}
            </p>
          </div>
        ))}
        {(currentInput || currentOutput) && (
          <div className="mt-4 text-left p-2 bg-lime-100 rounded-md">
            {currentInput && (
              <p>
                <strong className="text-gray-700">আপনি:</strong> {currentInput}
              </p>
            )}
            {currentOutput && (
              <p>
                <strong className="text-green-700">সহকারী:</strong>{" "}
                {currentOutput}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 w-full flex flex-col items-center">
        {error && (
          <p className="text-red-500 text-center text-sm mb-4">{error}</p>
        )}
        {isConnecting ? (
          <div className="flex items-center justify-center p-4">
            <LoadingSpinner />
            <span className="ml-3 text-lg text-gray-600">
              সংযোগ করা হচ্ছে...
            </span>
          </div>
        ) : !isActive ? (
          <button
            onClick={startConversation}
            className="flex items-center justify-center bg-green-600 text-white rounded-full p-5 shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105"
          >
            <MicIcon className="h-8 w-8" />
            <span className="ml-3 text-xl font-bold">কথা শুরু করুন</span>
          </button>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping"></div>
              <div className="relative bg-green-500 text-white rounded-full p-4">
                <MicIcon className="h-8 w-8" />
              </div>
            </div>
            <p className="text-green-700 mb-4 text-lg">শুনছি...</p>
            <button
              onClick={stopConversation}
              className="flex items-center justify-center bg-red-600 text-white rounded-full p-4 shadow-lg hover:bg-red-700 transition-transform"
            >
              <StopIcon className="h-6 w-6" />
              <span className="ml-2 text-lg">শেষ করুন</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveView;
