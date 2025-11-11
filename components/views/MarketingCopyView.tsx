import React, { useState, useCallback, useEffect } from 'react';
import { generateText } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { MegaphoneIcon, DownloadIcon, ClipboardIcon, CheckCircleIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { getMarketingCopyPrompt } from '../../services/promptManager';
import { handleApiError } from '../../services/errorHandler';
// FIX: Add missing Language import.
import { type Language } from '../../types';


const tones = ["Profesional", "Santai", "Jenaka", "Memujuk", "Empati", "Berani"];
const languages = ["English", "Bahasa Malaysia"];

const downloadText = (text: string, fileName: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const SESSION_KEY = 'marketingCopyState';

interface MarketingCopyViewProps {
    // FIX: Add 'language' to props interface.
    language: Language;
}

const MarketingCopyView: React.FC<MarketingCopyViewProps> = ({ language }) => {
    const [productDetails, setProductDetails] = useState('');
    const [targetAudience, setTargetAudience] = useState('');
    const [keywords, setKeywords] = useState('');
    const [selectedTone, setSelectedTone] = useState(tones[0]);
    const [selectedLanguage, setSelectedLanguage] = useState("Bahasa Malaysia");
    const [generatedCopy, setGeneratedCopy] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        try {
            const savedState = sessionStorage.getItem(SESSION_KEY);
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.productDetails) setProductDetails(state.productDetails);
                if (state.targetAudience) setTargetAudience(state.targetAudience);
                if (state.keywords) setKeywords(state.keywords);
                if (state.selectedTone) setSelectedTone(state.selectedTone);
                if (state.selectedLanguage) setSelectedLanguage(state.selectedLanguage);
                if (state.generatedCopy) setGeneratedCopy(state.generatedCopy);
            }
        } catch (e) { console.error("Failed to load state from session storage", e); }
    }, []);

    useEffect(() => {
        try {
            const stateToSave = { productDetails, targetAudience, keywords, selectedTone, selectedLanguage, generatedCopy };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
        } catch (e) { console.error("Failed to save state to session storage", e); }
    }, [productDetails, targetAudience, keywords, selectedTone, selectedLanguage, generatedCopy]);

    const handleGenerate = useCallback(async () => {
        if (!productDetails.trim()) {
            setError("Butiran Produk/Perkhidmatan diperlukan untuk menjana teks pemasaran.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedCopy('');
        setCopied(false);

        const prompt = getMarketingCopyPrompt({
            productDetails,
            targetAudience,
            keywords,
            selectedTone,
            selectedLanguage
        });

        try {
            const result = await generateText(prompt);
            setGeneratedCopy(result);
            await addHistoryItem({
                type: 'Copy',
                prompt: `Marketing Copy for: ${productDetails.substring(0, 50)}... (Lang: ${selectedLanguage})`,
                result: result,
            });
        } catch (e) {
            const userFriendlyMessage = handleApiError(e);
            setError(userFriendlyMessage);
        } finally {
            setIsLoading(false);
        }
    }, [productDetails, targetAudience, keywords, selectedTone, selectedLanguage]);
    
    const handleCopy = () => {
        if (!generatedCopy) return;
        navigator.clipboard.writeText(generatedCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const handleReset = useCallback(() => {
        setProductDetails('');
        setTargetAudience('');
        setKeywords('');
        setSelectedTone(tones[0]);
        setSelectedLanguage("Bahasa Malaysia");
        setGeneratedCopy('');
        setError(null);
        sessionStorage.removeItem(SESSION_KEY);
    }, []);

    const leftPanel = (
        <>
            <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Penulis Teks Pemasaran AI</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">Jana teks yang meyakinkan untuk iklan, pos, dan laman web.</p>
            </div>

            <div>
                <label htmlFor="product-details" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Butiran Produk/Perkhidmatan</label>
                <textarea
                    id="product-details"
                    value={productDetails}
                    onChange={(e) => setProductDetails(e.target.value)}
                    placeholder="cth., Mesin kopi mewah yang membancuh dalam 30 saat..."
                    rows={5}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
            </div>

            <div>
                <label htmlFor="target-audience" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Sasaran Audiens (Pilihan)</label>
                <input
                    id="target-audience"
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="cth., Profesional yang sibuk, pencinta kopi..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
            </div>

            <div>
                <label htmlFor="keywords" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Kata Kunci untuk Disertakan (Pilihan)</label>
                <input
                    id="keywords"
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="cth., cepat, premium, kopi pagi"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
            </div>

            <div>
                <label htmlFor="tone" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Nada Suara</label>
                <select
                    id="tone"
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                >
                    {tones.map(tone => <option key={tone} value={tone}>{tone}</option>)}
                </select>
            </div>
            
            <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Bahasa Output</label>
                <select
                    id="language"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                >
                    {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
            </div>

            <div className="pt-4 mt-auto">
                <div className="flex gap-4">
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Spinner /> : "Jana Teks"}
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={isLoading}
                        className="flex-shrink-0 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                    >
                        Set Semula
                    </button>
                </div>
                {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
            </div>
        </>
    );

    const rightPanel = (
        <>
             {generatedCopy && !isLoading && (
                <div className="absolute top-3 right-3 flex gap-2 z-10">
                    <button 
                      onClick={handleCopy}
                      className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                    >
                      {copied ? <CheckCircleIcon className="w-4 h-4 text-green-500"/> : <ClipboardIcon className="w-4 h-4"/>}
                      {copied ? "Disalin!" : "Salin"}
                    </button>
                    <button
                        onClick={() => downloadText(generatedCopy, `monoklix-marketing-copy-${Date.now()}.txt`)}
                        className="flex items-center gap-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                    >
                        <DownloadIcon className="w-4 h-4" /> Muat Turun
                    </button>
                </div>
            )}
             {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Spinner />
                    <p className="text-neutral-500 dark:text-neutral-400">Sedang menjana teks anda...</p>
                </div>
            ) : generatedCopy ? (
                <div className="prose dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap w-full h-full overflow-y-auto pr-2">
                    {generatedCopy}
                </div>
            ) : (
                 <div className="flex items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-600 p-4">
                    <div>
                        <MegaphoneIcon className="w-16 h-16 mx-auto" />
                        <p>Teks pemasaran yang anda jana akan muncul di sini.</p>
                    </div>
                </div>
            )}
        </>
    );

    // FIX: Pass the 'language' prop to TwoColumnLayout to fix type error.
    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};

export default MarketingCopyView;
