
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { SendIcon } from './icons/SendIcon';
import { Spinner } from './Spinner';

interface ChatbotProps {
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    onClose: () => void;
    isLoading: boolean;
}

export const Chatbot: React.FC<ChatbotProps> = ({ messages, onSendMessage, onClose, isLoading }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    return (
        <div className="fixed bottom-8 right-8 w-96 h-[36rem] bg-white shadow-2xl rounded-2xl flex flex-col z-50 border border-slate-200 ring-1 ring-black/5 animate-in slide-in-from-bottom-4 duration-300">
            <header className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl backdrop-blur-sm">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Legal Assistant</h3>
                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-highlight animate-pulse"></span>
                        Swarm: Kimi + GPT-OSS + Codestral
                    </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                    <CloseIcon className="w-5 h-5" />
                </button>
            </header>
            <main className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-5 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                            msg.role === 'user' 
                                ? 'bg-highlight text-white rounded-br-none' 
                                : 'bg-slate-100 text-slate-800 rounded-bl-none'
                        }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex justify-start">
                         <div className="px-5 py-3 rounded-2xl rounded-bl-none bg-slate-50 border border-slate-100 flex items-center space-x-3">
                            <Spinner />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Processing...</span>
                         </div>
                     </div>
                )}
                <div ref={messagesEndRef} />
            </main>
            <footer className="p-4 border-t border-slate-100 bg-white rounded-b-2xl">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a legal question..."
                        className="flex-1 bg-slate-50 text-slate-900 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-highlight/20 focus:border-highlight outline-none disabled:opacity-50 placeholder:text-slate-400 text-sm transition-all"
                        disabled={isLoading}
                    />
                    <button type="submit" className="p-3 bg-highlight text-white rounded-xl hover:bg-blue-600 disabled:bg-slate-200 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/20" disabled={isLoading}>
                        <SendIcon className="w-5 h-5" />
                    </button>
                </form>
            </footer>
        </div>
    );
};
