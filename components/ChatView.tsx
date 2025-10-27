import React, { useState, useRef, useEffect, useCallback } from "react";
import { GoogleGenAI, Chat } from "@google/genai";
import type { ChatMessage } from "../types";
import { LoadingSpinner } from "./LoadingSpinner";
import { SendIcon, UserIcon, BotIcon } from "./Icon";
import { useHistory } from "../hooks/useHistory";
import { useAuth } from "../contexts/AuthContext";

const ChatView: React.FC = () => {
  const { history, setHistory } = useHistory();
  const { isDemoUser, updateDemoUsage } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const initializeChat = useCallback(() => {
    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY is not configured.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction =
        "আপনি বাংলাদেশের একজন কৃষি বিশেষজ্ঞ। বাংলাদেশের কৃষকদের ফসলের সমস্যা এবং চাষাবাদ বিষয়ে বাংলা ভাষায় সাহায্য করুন। আপনার উত্তর সহজবোধ্য ও কার্যকরী হতে হবে। আপনার একমাত্র কাজ কৃষি সংক্রান্ত প্রশ্নের উত্তর দেওয়া। যদি কৃষি ছাড়া অন্য কোনো বিষয়ে (যেমন: রাজনীতি, খেলাধুলা, বিনোদন) প্রশ্ন করা হয়, তাহলে নম্রভাবে বলুন যে আপনি শুধুমাত্র কৃষি বিষয়ে সাহায্য করতে পারেন এবং অন্য কোনো উত্তর দিতে অপারগ। বাংলাদেশের বাংলা ভাষায় কথা বলুন, কলকাতার বাংলা পরিহার করুন। মাঝে মধ্যে এক্সপ্রেশন দিন যাতে কৃষক আনন্দিত হন। নমস্কার দেয়া থেকে বিরত থাকো। আপনার প্রস্তুতকারক বা ডেভেলপার হলো 'লাঙ্গল' টিম। কখনই গুগোলের নাম উল্লেখ করবেন না!   ";

      const geminiHistory = history.chat.map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

      chatRef.current = ai.chats.create({
        model: "gemini-2.5-flash",
        config: { systemInstruction },
        history: geminiHistory,
      });

      if (history.chat.length === 0) {
        setMessages([
          {
            sender: "model",
            text: "আমি আপনার কৃষি বিষয়ক সহকারী। আপনার ফসলের কী সমস্যা হচ্ছে?",
            timestamp: Date.now(),
          },
        ]);
      } else {
        setMessages(history.chat);
      }
    } catch (e) {
      console.error(e);
      setError(
        "চ্যাট শুরু করতে সমস্যা হচ্ছে। অনুগ্রহ করে API কী পরীক্ষা করুন।"
      );
    }
  }, [history.chat]);

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !chatRef.current) return;

    if (isDemoUser) {
      updateDemoUsage(1, 0);
    }

    const userMessage: ChatMessage = {
      sender: "user",
      text: input,
      timestamp: Date.now(),
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatRef.current.sendMessage({ message: input });
      const modelMessage: ChatMessage = {
        sender: "model",
        text: response.text,
        timestamp: Date.now(),
      };
      const finalMessages = [...newMessages, modelMessage];
      setMessages(finalMessages);
      setHistory((prev) => ({ ...prev, chat: finalMessages }));
    } catch (e) {
      console.error(e);
      const errorMessage =
        "দুঃখিত, উত্তর দেওয়া সম্ভব হচ্ছে না। অনুগ্রহ করে আবার চেষ্টা করুন।";
      setError(errorMessage);
      const errorModelMessage: ChatMessage = {
        sender: "model",
        text: errorMessage,
        timestamp: Date.now(),
      };
      const finalMessages = [...newMessages, errorModelMessage];
      setMessages(finalMessages);
      setHistory((prev) => ({ ...prev, chat: finalMessages }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${
              msg.sender === "user" ? "justify-end" : ""
            }`}
          >
            {msg.sender === "model" && (
              <BotIcon className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
            )}
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${
                msg.sender === "user"
                  ? "bg-green-600 text-white rounded-br-none"
                  : "bg-gray-100 text-gray-800 rounded-bl-none"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
            {msg.sender === "user" && (
              <UserIcon className="h-8 w-8 text-gray-500 flex-shrink-0 mt-1" />
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <BotIcon className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl rounded-bl-none flex items-center">
              <LoadingSpinner />
              <span className="ml-2">ভাবছি...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {error && (
        <p className="text-red-500 text-center text-sm mb-2">{error}</p>
      )}
      <div className="flex-shrink-0 flex items-center border-t pt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="এখানে আপনার প্রশ্ন লিখুন..."
          className="flex-grow p-3 border rounded-l-full focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          className="bg-green-600 text-white p-3 rounded-r-full hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          disabled={isLoading || !input.trim()}
        >
          <SendIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default ChatView;
