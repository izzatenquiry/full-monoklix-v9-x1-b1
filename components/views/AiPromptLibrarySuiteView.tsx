import React from 'react';
import LibraryView from './LibraryView';
import { type Language } from '../../types';

interface AiPromptLibrarySuiteViewProps {
    onUsePrompt: (prompt: string) => void;
    language: Language;
}

const AiPromptLibrarySuiteView: React.FC<AiPromptLibrarySuiteViewProps> = ({ onUsePrompt, language }) => {
    return (
        <div className="h-full flex flex-col">
            {/* We no longer render Tabs, just the LibraryView directly */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {/* FIX: Pass language prop to LibraryView */}
                <LibraryView onUsePrompt={onUsePrompt} language={language} />
            </div>
        </div>
    );
};

export default AiPromptLibrarySuiteView;
