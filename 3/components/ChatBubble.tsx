import React from 'react';
import { ChatIcon } from './icons/ChatIcon';

interface ChatBubbleProps {
    onClick: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            title="Open AI Assistant"
            className="fixed bottom-6 right-6 w-16 h-16 bg-highlight rounded-full text-white shadow-lg flex items-center justify-center hover:bg-sky-400 transition-all transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-highlight focus:ring-opacity-50"
        >
            <ChatIcon className="w-8 h-8" />
        </button>
    );
};
