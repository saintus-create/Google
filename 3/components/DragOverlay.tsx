
import React from 'react';
import { CloudArrowUpIcon } from './icons/CloudArrowUpIcon';

interface DragOverlayProps {
    isDragging: boolean;
    onDrop: (files: FileList) => void;
    onLeave: () => void;
}

export const DragOverlay: React.FC<DragOverlayProps> = ({ isDragging, onDrop, onLeave }) => {
    if (!isDragging) return null;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onDrop(e.dataTransfer.files);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200"
            onDragOver={handleDragOver}
            onDragLeave={onLeave}
            onDrop={handleDrop}
        >
            <div className="w-[80%] h-[80%] border-4 border-dashed border-highlight/30 rounded-[3rem] flex flex-col items-center justify-center bg-blue-50/50 pointer-events-none shadow-2xl">
                <div className="p-10 bg-white rounded-full mb-8 border border-blue-100 shadow-xl shadow-blue-200">
                    <CloudArrowUpIcon className="w-24 h-24 text-highlight animate-bounce" />
                </div>
                <h2 className="text-5xl font-bold text-slate-800 tracking-tight mb-4">Drop Files to Upload</h2>
                <p className="text-slate-500 text-xl font-medium">Adding to Extraction Queue...</p>
            </div>
        </div>
    );
};
