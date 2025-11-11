import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { type Language, type User, type HistoryItem } from '../../types';
import { getTranslations } from '../../services/translations';
import { sendSocialPostToWebhook } from '../../services/webhookService';
import { generateText } from '../../services/geminiService';
import { getSocialPostStudioCaptionPrompt } from '../../services/promptManager';
import { MegaphoneIcon, XIcon, CheckCircleIcon, ImageIcon, VideoIcon, SparklesIcon, UserIcon, UsersIcon } from '../Icons';
import Spinner from '../common/Spinner';
import MediaSelectionModal from '../common/MediaSelectionModal';

interface SocialPostStudioViewProps {
  language: Language;
  currentUser: User;
}

// --- AI Writer Modal ---
interface AiAgent {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
}
const aiAgents: AiAgent[] = [
    { id: 'najwa', icon: UserIcon },
    { id: 'julia', icon: MegaphoneIcon },
    { id: 'musa', icon: UsersIcon },
];
const outputLanguages = ["English", "Bahasa Malaysia", "Chinese"];

interface AiWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: { caption: string; cta: string; hashtags: string }) => void;
  language: Language;
  translations: any;
}

const AiWriterModal: React.FC<AiWriterModalProps> = ({ isOpen, onClose, onConfirm, language, translations }) => {
    const [selectedAgentId, setSelectedAgentId] = useState('najwa');
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedText, setGeneratedText] = useState('');
    const [parsedResult, setParsedResult] = useState<{ caption: string, cta: string, hashtags: string } | null>(null);
    const [outputLanguage, setOutputLanguage] = useState(language === 'ms' ? 'Bahasa Malaysia' : 'English');

    useEffect(() => {
        if (!isOpen) {
            setInput('');
            setGeneratedText('');
            setParsedResult(null);
            setIsGenerating(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (generatedText) {
            try {
                const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (typeof parsed.caption === 'string' && typeof parsed.cta === 'string' && typeof parsed.hashtags === 'string') {
                        setParsedResult(parsed);
                        return;
                    }
                }
                setParsedResult({ caption: generatedText, cta: '', hashtags: '' });
            } catch (e) {
                console.error("Failed to parse AI response:", e);
                setParsedResult({ caption: generatedText, cta: '', hashtags: '' });
            }
        } else {
            setParsedResult(null);
        }
    }, [generatedText]);

    const handleGenerate = async () => {
        if (!input.trim()) return;
        setIsGenerating(true);
        setGeneratedText('');
        setParsedResult(null);
        try {
            const prompt = getSocialPostStudioCaptionPrompt({
                agentId: selectedAgentId,
                userInput: input,
                language: outputLanguage
            });
            const result = await generateText(prompt);
            setGeneratedText(result);
        } catch (err) {
            setGeneratedText(err instanceof Error ? err.message : 'An error occurred.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirm = () => {
        if (parsedResult) {
            onConfirm(parsedResult);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-zoomIn p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{translations.aiWriterModalTitle}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"><XIcon className="w-6 h-6"/></button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{translations.selectAgent}</label>
                            <div className="grid grid-cols-3 gap-3">
                                {aiAgents.map(agent => {
                                    const agentInfo = translations.agents[agent.id];
                                    const isSelected = agent.id === selectedAgentId;
                                    // FIX: Added 'return' statement to fix 'void[] is not assignable to ReactNode' error.
                                    return (
                                        <button
                                            key={agent.id}
                                            onClick={() => setSelectedAgentId(agent.id)}
                                            className={`flex items-center justify-start text-left gap-3 p-3 rounded-lg border-2 transition-all duration-200 w-full ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <agent.icon className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500'}`} />
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm">{agentInfo.name}</p>
                                                    {/* FIX: Removed this line which caused a 'Cannot find name selectedAgent' error. The description is not available in the translations object anyway. */}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{translations.outputLanguage}</label>
                            <select value={outputLanguage} onChange={e => setOutputLanguage(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3">
                                {outputLanguages.map(lang => <option key={lang}>{lang}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{translations.agentDescription}</label>
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={translations.agentInputPlaceholder}
                            rows={4}
                            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3"
                        />
                    </div>
                    <button onClick={handleGenerate} disabled={isGenerating || !input.trim()} className="w-full bg-primary-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                        {isGenerating ? <Spinner/> : <SparklesIcon className="w-5 h-5"/>}
                        {isGenerating ? translations.generating : translations.generate}
                    </button>
                    {parsedResult && (
                        <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 animate-zoomIn">
                            <div>
                                <h4 className="font-semibold text-sm mb-1">{translations.generatedCaption}</h4>
                                <p className="text-sm p-3 bg-neutral-100 dark:bg-neutral-800/50 rounded-md">{parsedResult.caption}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-sm mb-1">{translations.generatedHashtags}</h4>
                                    <p className="text-sm p-3 bg-neutral-100 dark:bg-neutral-800/50 rounded-md">{parsedResult.hashtags}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm mb-1">{translations.generatedCta}</h4>
                                    <p className="text-sm p-3 bg-neutral-100 dark:bg-neutral-800/50 rounded-md">{parsedResult.cta}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 bg-neutral-200 dark:bg-neutral-700 font-semibold rounded-lg">{translations.close}</button>
                    <button onClick={handleConfirm} disabled={!parsedResult} className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg disabled:opacity-50">{translations.useText}</button>
                </div>
            </div>
        </div>
    );
};


// --- Main Component ---
const SocialPostStudioView: React.FC<SocialPostStudioViewProps> = ({ language, currentUser }) => {
    const [caption, setCaption] = useState('');
    const [hashtags, setHashtags] = useState('');
    const [cta, setCta] = useState('');
    const [link, setLink] = useState('');
    const [scheduleDate, setScheduleDate] = useState('');
    const [mediaItems, setMediaItems] = useState<HistoryItem[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
    const [isAiWriterOpen, setIsAiWriterOpen] = useState(false);
    const T = getTranslations(language).socialPostStudioView;
    const commonT = getTranslations(language).common;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!caption) return;

        setIsSending(true);
        setSendStatus({ type: 'idle', message: '' });
        
        const result = await sendSocialPostToWebhook(caption, hashtags, cta, link, scheduleDate, mediaItems);
        
        if (result.success) {
            setSendStatus({ type: 'success', message: T.sendSuccess });
            // Clear fields on success
            setCaption('');
            setHashtags('');
            setCta('');
            setLink('');
            setMediaItems([]);
        } else {
            setSendStatus({ type: 'error', message: `${T.sendError} ${result.message}` });
        }
        setIsSending(false);

        setTimeout(() => setSendStatus({ type: 'idle', message: '' }), 5000);
    };

    const handleConfirmMedia = (selected: HistoryItem[]) => {
        setMediaItems(selected);
    };
    
    const handleConfirmAiWriter = (result: { caption: string; cta: string; hashtags: string }) => {
        setCaption(result.caption);
        setCta(result.cta);
        setHashtags(result.hashtags);
        setIsAiWriterOpen(false);
    };

    const removeMediaItem = (id: string) => {
        setMediaItems(prev => prev.filter(item => item.id !== id));
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold sm:text-3xl flex items-center gap-3">
                <MegaphoneIcon className="w-8 h-8 text-primary-500" />
                {T.title}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">{T.subtitle}</p>

            {!currentUser.webhookUrl && (
                <div className="mt-6 bg-yellow-100 dark:bg-yellow-900/50 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 p-4 rounded-r-lg">
                    <p className="font-bold">{T.noWebhookTitle}</p>
                    <p className="text-sm">{T.noWebhookBody}</p>
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{T.textContentLabel}</label>
                        <div className="relative">
                            <textarea
                                value={caption}
                                onChange={e => setCaption(e.target.value)}
                                placeholder={T.textContentPlaceholder}
                                rows={10}
                                className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-primary-500"
                            />
                            <button type="button" onClick={() => setIsAiWriterOpen(true)} className="absolute bottom-3 right-3 flex items-center gap-2 bg-primary-600 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-primary-700">
                                <SparklesIcon className="w-4 h-4" />
                                {T.generateWithAi}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{T.hashtagsLabel}</label>
                        <input
                            type="text"
                            value={hashtags}
                            onChange={e => setHashtags(e.target.value)}
                            placeholder="#socialmedia #marketing #aipowered"
                            className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
                        />
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{T.mediaLabel}</label>
                        <div className="p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 min-h-[150px]">
                            {mediaItems.length === 0 ? (
                                <p className="text-sm text-neutral-500">{T.noMedia}</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {mediaItems.map(item => (
                                        <div key={item.id} className="relative group">
                                            {item.type === 'Video' ? (
                                                 <div className="w-full aspect-square bg-black rounded-md flex items-center justify-center">
                                                    <VideoIcon className="w-8 h-8 text-white"/>
                                                </div>
                                            ) : (
                                                <div className="w-full aspect-square bg-neutral-200 dark:bg-neutral-700 rounded-md flex items-center justify-center">
                                                    <ImageIcon className="w-8 h-8 text-neutral-500"/>
                                                </div>
                                            )}
                                            <button type="button" onClick={() => removeMediaItem(item.id)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100">
                                                <XIcon className="w-3 h-3"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button type="button" onClick={() => setIsMediaModalOpen(true)} className="text-sm font-semibold text-primary-600 hover:underline">{T.addMediaButton}</button>
                            {/* <span className="text-sm text-neutral-400">or</span>
                            <button type="button" className="text-sm font-semibold text-primary-600 hover:underline">{T.uploadFromDesktop}</button> */}
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{T.ctaLabel}</label>
                        <input type="text" value={cta} onChange={e => setCta(e.target.value)} placeholder={T.ctaPlaceholder} className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"/>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{T.linkLabel}</label>
                        <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder={T.linkPlaceholder} className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"/>
                    </div>
                     <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{T.scheduleLabel}</label>
                        <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"/>
                    </div>
                </div>

                {/* Submit button */}
                <div className="md:col-span-2">
                    <button type="submit" disabled={!currentUser.webhookUrl || isSending} className="w-full bg-primary-600 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                        {isSending ? <Spinner/> : null}
                        {isSending ? T.sending : T.sendButton}
                    </button>
                    {sendStatus.type !== 'idle' && (
                        <p className={`text-sm text-center mt-2 ${sendStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                            {sendStatus.message}
                        </p>
                    )}
                </div>
            </form>
            
            <MediaSelectionModal 
                isOpen={isMediaModalOpen}
                onClose={() => setIsMediaModalOpen(false)}
                onConfirm={handleConfirmMedia}
                language={language}
            />
            
            <AiWriterModal
                isOpen={isAiWriterOpen}
                onClose={() => setIsAiWriterOpen(false)}
                onConfirm={handleConfirmAiWriter}
                language={language}
                translations={T}
            />

        </div>
    );
};

export default SocialPostStudioView;
