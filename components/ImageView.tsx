import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { LoadingSpinner } from './LoadingSpinner';
import { UploadIcon, BotIcon } from './Icon';
import { useHistory } from '../hooks/useHistory';
import type { ImageHistoryItem } from '../types';

const ImageView: React.FC = () => {
  const { history, setHistory } = useHistory();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeHistoryItem, setActiveHistoryItem] = useState<ImageHistoryItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset view when switching tabs
    return () => {
      resetView();
    };
  }, []);

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setActiveHistoryItem(null);
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setAnalysis('');
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) {
      setError('অনুগ্রহ করে প্রথমে একটি ছবি নির্বাচন করুন।');
      return;
    }
    setIsLoading(true);
    setAnalysis('');
    setError(null);

    try {
      if (!process.env.API_KEY) {
        throw new Error("API KEY is missing.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const imageDataUrl = await fileToDataUrl(imageFile);
      const base64Image = imageDataUrl.split(',')[1];
      
      const imagePart = { inlineData: { mimeType: imageFile.type, data: base64Image } };
      const textPart = { text: 'এই ছবিতে ফসলের কোন রোগ দেখা যাচ্ছে? বিস্তারিত বিশ্লেষণ করুন এবং প্রতিকারের জন্য ধাপে ধাপে পরামর্শ দিন। উত্তরটি বাংলা ভাষায় দিন। শুধুমাত্র ছবিতে দেখানো ফসল বা উদ্ভিদ সম্পর্কিত কৃষিভিত্তিক বিশ্লেষণ করুন।' };
      
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [imagePart, textPart] } });

      const newAnalysis = response.text;
      setAnalysis(newAnalysis);

      const newHistoryItem: ImageHistoryItem = {
        imageDataUrl,
        analysis: newAnalysis,
        timestamp: Date.now(),
        fileName: imageFile.name,
      };
      setHistory(prev => ({ ...prev, image: [newHistoryItem, ...prev.image] }));

    } catch (e) {
      console.error(e);
      setError('ছবি বিশ্লেষণ করা সম্ভব হচ্ছে না। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetView = () => {
    setImageFile(null);
    setImagePreview(null);
    setAnalysis('');
    setError(null);
    setActiveHistoryItem(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const viewHistoryItem = (item: ImageHistoryItem) => {
    setActiveHistoryItem(item);
    setImagePreview(item.imageDataUrl);
    setAnalysis(item.analysis);
    setImageFile(null); // No file to re-analyze
    setError(null);
    setIsLoading(false);
  };

  const MainView = () => (
    !imagePreview ? (
      <div className="flex flex-col items-center justify-center flex-grow text-center p-4 border-2 border-dashed border-gray-300 rounded-lg h-full">
        <UploadIcon className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700">ফসলের ছবি আপলোড করুন</h3>
        <p className="text-gray-500 mt-2">রোগ সনাক্ত করতে এবং প্রতিকার জানতে আপনার ফোনের ক্যামেরা বা গ্যালারি থেকে ছবি দিন।</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-6 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
        >
          ছবি নির্বাচন করুন
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </div>
    ) : (
      <div className="flex flex-col md:flex-row gap-6 h-full">
        <div className="md:w-1/2 flex flex-col items-center">
          <img src={imagePreview} alt="Crop preview" className="max-h-80 w-full object-contain rounded-lg shadow-md mb-4"/>
          <div className="flex gap-4">
             <button onClick={handleAnalyze} disabled={isLoading || activeHistoryItem !== null} className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400">
                {isLoading ? 'বিশ্লেষণ হচ্ছে...' : 'বিশ্লেষণ করুন'}
              </button>
              <button onClick={resetView} className="bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors">
                {activeHistoryItem ? "নতুন ছবি দিন" : "বাতিল করুন"}
              </button>
          </div>
        </div>
        <div className="md:w-1/2 flex flex-col">
          <h3 className="text-xl font-semibold text-green-800 mb-2">বিশেষজ্ঞের মতামত</h3>
          <div className="flex-grow bg-gray-50 rounded-lg p-4 border overflow-y-auto">
            {isLoading && (<div className="flex flex-col items-center justify-center h-full"><LoadingSpinner /><p className="mt-2 text-gray-600">আপনার ছবির রোগ নির্ণয় করা হচ্ছে...</p></div>)}
            {error && <p className="text-red-500">{error}</p>}
            {analysis && (<div className="flex items-start gap-3"><BotIcon className="h-8 w-8 text-green-600 flex-shrink-0 mt-1"/><div className="text-gray-800 whitespace-pre-wrap">{analysis}</div></div>)}
            {!isLoading && !analysis && !error && <p className="text-gray-500">ফলাফল এখানে দেখানো হবে।</p>}
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-grow mb-4">
        <MainView />
      </div>
      {history.image.length > 0 && (
        <div className="flex-shrink-0 border-t pt-4">
          <h3 className="text-lg font-semibold text-green-800 mb-3">আপনার পুরনো ছবি</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {history.image.map((item) => (
              <button key={item.timestamp} onClick={() => viewHistoryItem(item)} className={`rounded-lg overflow-hidden border-2 transition-all ${activeHistoryItem?.timestamp === item.timestamp ? 'border-green-600 ring-2 ring-green-500' : 'border-transparent hover:border-green-400'}`}>
                <img src={item.imageDataUrl} alt={item.fileName} className="w-full h-24 object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageView;
