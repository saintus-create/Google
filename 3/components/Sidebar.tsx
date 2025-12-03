
import React, { useMemo, useState, useCallback } from 'react';
import { Snippet, FileStatus } from '../types';
import { SaveStatus } from '../App';
import { Spinner } from './Spinner';
import { ExportIcon } from './icons/ExportIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TableCellsIcon } from './icons/TableCellsIcon';
import { GitIcon } from './icons/GitIcon';


interface SidebarProps {
  snippets: Snippet[];
  fileStatuses: Record<string, FileStatus>;
  selectedSnippetId: string | null;
  onSelectSnippet: (id: string) => void;
  onExport: (format: 'json' | 'csv' | 'pdf') => void;
  onFileUpload: (files: FileList) => void;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  onClearAll: () => void;
  onSelectCategory: (category: string) => void;
  selectedCategory: string | null;
  activeWorkers?: number;
  pendingCount?: number;
  onOpenGit: () => void;
}

const SaveStatusIndicator: React.FC<{ status: SaveStatus, lastSaved: Date | null, activeWorkers?: number, pendingCount?: number }> = ({ status, lastSaved, activeWorkers = 0, pendingCount = 0 }) => {
    if (activeWorkers > 0 || pendingCount > 0) {
        return (
            <div className="flex items-center text-[10px] uppercase tracking-wider text-highlight font-bold animate-pulse">
                <span className="w-1.5 h-1.5 bg-highlight rounded-full mr-2"></span>
                {activeWorkers} Swarm Nodes Active | {pendingCount} Pending
            </div>
        );
    }

    switch(status) {
        case 'syncing':
            return (
                <div className="flex items-center text-[10px] uppercase tracking-wider text-text-secondary animate-pulse font-bold">
                    <span className="w-1.5 h-1.5 bg-text-secondary rounded-full mr-2"></span>
                    Syncing...
                </div>
            );
        case 'synced':
            return (
                <div className="flex items-center text-[10px] uppercase tracking-wider text-emerald-600 font-bold">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
                    Systems Nominal
                </div>
            );
        case 'error':
            return (
                <div className="flex items-center text-[10px] uppercase tracking-wider text-red-500 font-bold">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    Sync Error
                </div>
            );
        default:
            return <div className="h-5"></div>;
    }
};

const SidebarUpload: React.FC<{ onUpload: (files: FileList) => void }> = ({ onUpload }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); }, []);
    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onUpload(e.dataTransfer.files);
        }
    }, [onUpload]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUpload(e.target.files);
            e.target.value = ''; // Reset
        }
    };

    const handleClick = () => fileInputRef.current?.click();

    return (
        <div className="p-4 border-t border-slate-200 bg-white/50 backdrop-blur-md">
            <div
                onClick={handleClick}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 group ${
                    isDragging ? 'border-highlight bg-blue-50' : 'border-slate-200 hover:border-highlight/50 hover:bg-slate-50'
                }`}
            >
                <PlusCircleIcon className="w-6 h-6 text-text-secondary group-hover:text-highlight mb-2 transition-colors"/>
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary group-hover:text-highlight">Drag & Drop Files Here</span>
                <span className="text-[9px] text-slate-400 font-mono mt-1">or click to browse</span>
            </div>
            <input id="sidebar-file-upload" type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv,.html,.json,.jsonl,.pdf,.txt" />
        </div>
    );
};


export const Sidebar: React.FC<SidebarProps> = ({ snippets, fileStatuses, selectedSnippetId, onSelectSnippet, onExport, onFileUpload, saveStatus, lastSaved, onClearAll, onSelectCategory, selectedCategory, activeWorkers, pendingCount, onOpenGit }) => {
  
  const categorizedSnippets = useMemo(() => {
    const categories: Record<string, Snippet[]> = {};
    snippets.forEach(snip => {
      const category = snip.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(snip);
    });
    
    const sortedCategories: Record<string, Snippet[]> = {};
    Object.keys(categories).sort().forEach(key => {
        sortedCategories[key] = categories[key].sort((a, b) => a.headline.localeCompare(b.headline));
    });
    return sortedCategories;
  }, [snippets]);

  return (
    <aside className="w-72 bg-white/80 backdrop-blur-2xl flex flex-col h-full border-r border-slate-200 relative z-20 shadow-sm">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-highlight to-cyan-400 rounded-lg shadow-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                Legal<span className="text-highlight">Atlas</span>
            </h1>
        </div>
        <div className="flex items-center space-x-1">
            <div className="relative group">
                <button 
                  className="p-2 text-slate-400 rounded-full hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <ExportIcon className="w-4 h-4" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-32 bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50 flex flex-col p-1">
                    <button onClick={() => onExport('json')} className="text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-md font-medium">JSON Backup</button>
                    <button onClick={() => onExport('csv')} className="text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-md font-medium">CSV Export</button>
                    <button onClick={() => onExport('pdf')} className="text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-md font-medium">PDF Report</button>
                </div>
            </div>
            <button 
              onClick={onClearAll}
              disabled={snippets.length === 0}
              title="Clear Archive"
              className="p-2 text-slate-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
        </div>
      </div>
      
      <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} activeWorkers={activeWorkers} pendingCount={pendingCount} />
      </div>
      
      <div className="p-4 space-y-2">
           <button
              onClick={() => onSelectSnippet('')}
              className={`w-full text-left px-4 py-3 text-sm font-semibold rounded-xl transition-all flex items-center shadow-sm ${
                !selectedSnippetId && !selectedCategory 
                    ? 'bg-gradient-to-r from-highlight to-blue-500 text-white shadow-blue-500/20' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <TableCellsIcon className={`w-5 h-5 mr-3 ${!selectedSnippetId && !selectedCategory ? 'text-white' : 'text-slate-400'}`} />
              Master Data Sheet
           </button>
           
           <button
              onClick={onOpenGit}
              className="w-full text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all flex items-center text-slate-500 hover:bg-slate-100"
            >
              <div className="w-5 h-5 mr-3 flex items-center justify-center bg-slate-200 rounded-md">
                  <GitIcon className="w-3.5 h-3.5 text-slate-600" />
              </div>
              Git Repository
           </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-3 mt-2">
            Taxonomy Index
        </div>
        {Object.keys(categorizedSnippets).length === 0 && (
          <div className="text-center text-xs text-slate-400 p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            No Data Stream
          </div>
        )}
        {Object.keys(categorizedSnippets).map(category => (
          <div key={category}>
            <button
              onClick={() => onSelectCategory(category)}
              className={`w-full flex justify-between items-center px-4 py-2.5 text-left text-sm rounded-lg transition-all group ${
                  selectedCategory === category 
                    ? 'bg-blue-50 text-highlight font-semibold' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="truncate max-w-[170px]">
                {category}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedCategory === category ? 'bg-highlight/10 text-highlight' : 'bg-slate-200 text-slate-500'
              }`}>
                  {categorizedSnippets[category].length}
              </span>
            </button>
          </div>
        ))}
      </nav>
      
      <SidebarUpload onUpload={onFileUpload} />

    </aside>
  );
};
