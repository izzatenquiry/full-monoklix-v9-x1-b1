import React, { useState, useEffect, useMemo } from 'react';
import VideoGenerationView from './VideoGenerationView';
import { VideoCombinerView } from './VideoCombinerView';
import VoiceStudioView from './VoiceStudioView';
import { ProductReviewView } from './ProductReviewView';
import Tabs, { type Tab } from '../common/Tabs';
// FIX: Import Language type.
import { type BatchProcessorPreset, type User, type Language } from '../../types';
import BatchProcessorView from './BatchProcessorView';


type TabId = 'generation' | 'storyboard' | 'batch' | 'combiner' | 'voice';

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface AiVideoSuiteViewProps {
  preset: VideoGenPreset | null;
  clearPreset: () => void;
  onReEdit: (preset: ImageEditPreset) => void;
  onCreateVideo: (preset: VideoGenPreset) => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
  // FIX: Add language to props interface.
  language: Language;
}

const AiVideoSuiteView: React.FC<AiVideoSuiteViewProps> = ({ preset, clearPreset, onReEdit, onCreateVideo, currentUser, onUserUpdate, language }) => {
    const [activeTab, setActiveTab] = useState<TabId>('generation');

    const tabs: Tab<TabId>[] = [
        { id: 'generation', label: "Penjanaan Video" },
        { id: 'storyboard', label: "Papan Cerita Video" },
        { id: 'batch', label: "Pemprosesan Berkelompok", adminOnly: true },
        { id: 'combiner', label: "Penggabung Video", adminOnly: true },
        { id: 'voice', label: "Studio Suara" }
    ];

    useEffect(() => {
        if (preset) {
            setActiveTab('generation');
        }
    }, [preset]);
    
    useEffect(() => {
        if (currentUser.role !== 'admin' && (activeTab === 'batch' || activeTab === 'combiner')) {
            setActiveTab('generation');
        }
    }, [currentUser.role, activeTab]);

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'generation':
                // FIX: Pass 'language' prop to VideoGenerationView.
                return <VideoGenerationView 
                            preset={preset} 
                            clearPreset={clearPreset} 
                            currentUser={currentUser}
                            onUserUpdate={onUserUpdate}
                            language={language}
                        />;
            case 'storyboard':
                return <ProductReviewView 
                            onReEdit={onReEdit} 
                            onCreateVideo={onCreateVideo} 
                            currentUser={currentUser}
                            onUserUpdate={onUserUpdate}
// FIX: Pass the 'language' prop to ProductReviewView to fix missing prop error.
                            language={language}
                        />;
            case 'batch':
                return <BatchProcessorView preset={null} clearPreset={() => {}} />;
            case 'combiner':
                // FIX: Pass 'language' prop to VideoCombinerView.
                return <VideoCombinerView language={language} />;
            case 'voice':
                // FIX: Passed language prop to VoiceStudioView to provide the required 'language' prop.
                return <VoiceStudioView language={language} />;
            default:
                // FIX: Pass 'language' prop to VideoGenerationView.
                return <VideoGenerationView 
                            preset={preset} 
                            clearPreset={clearPreset} 
                            currentUser={currentUser}
                            onUserUpdate={onUserUpdate}
                            language={language}
                        />;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 mb-6 flex justify-center">
                <Tabs 
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isAdmin={currentUser.role === 'admin'}
                />
            </div>
            <div className="flex-1 overflow-y-auto">
                {renderActiveTabContent()}
            </div>
        </div>
    );
};

export default AiVideoSuiteView;
