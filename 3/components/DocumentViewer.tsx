
import React from 'react';
import { Snippet, LegalDocument } from '../types';
import { MasterSpreadsheet } from './MasterSpreadsheet';
import { SnippetTable } from './SnippetTable';
import { ShieldExclamationIcon } from './icons/ShieldExclamationIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { TrashIcon } from './icons/TrashIcon';

interface DocumentViewerProps {
  snippet: Snippet | null;
  document: LegalDocument | null;
  allSnippets: Snippet[]; 
  categoryView: { category: string; snippets: Snippet[] } | null;
  onUpdate: (updatedDoc: LegalDocument) => void;
  onDelete: (id: string) => void;
  onSelectSnippet: (id: string) => void;
  onApproveSnippet: (id: string) => void;
  onEditSnippetCategory: (id: string) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
    snippet, 
    document, 
    allSnippets, 
    categoryView,
    onUpdate, 
    onDelete, 
    onSelectSnippet,
    onApproveSnippet,
    onEditSnippetCategory
}) => {
    
    if (categoryView && !snippet) {
        return (
            <SnippetTable 
                snippets={categoryView.snippets} 
                category={categoryView.category} 
                onSelectSnippet={onSelectSnippet}
                onApprove={onApproveSnippet}
                onEditCategory={onEditSnippetCategory}
            />
        );
    }

    if (!snippet) {
        return (
            <MasterSpreadsheet 
                snippets={allSnippets} 
                onSelectSnippet={onSelectSnippet}
                onApprove={onApproveSnippet}
                onEditCategory={onEditSnippetCategory}
            />
        );
    }

    if (!document) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center p-8 border border-red-100 bg-red-50 rounded-xl">
                    <p className="text-red-500 font-bold mb-2 uppercase tracking-widest text-xs">Error: Source Missing</p>
                    <p className="text-xs font-mono text-red-400">ID: {snippet.sourceDocId}</p>
                </div>
            </div>
        );
    }
    
    const handleDeleteDoc = () => {
      if (window.confirm(`Are you sure you want to permanently delete the source document "${document.name}" and all its snippets?`)) {
          onDelete(document.id);
      }
    };

    const renderHighlightedContent = () => {
        if (!snippet.content) return <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{document.content}</pre>;

        const parts = document.content.split(snippet.content);
        
        if (parts.length === 1) {
            return <pre className="whitespace-pre-wrap text-slate-600 font-sans text-sm leading-8">{document.content}</pre>;
        }

        return (
            <pre className="whitespace-pre-wrap text-slate-600 font-sans text-sm leading-8">
                {parts.map((part, i) => (
                    <span key={i}>
                        {part}
                        {i < parts.length - 1 && (
                            <span className="bg-yellow-100 text-slate-900 border-b-2 border-yellow-400 font-semibold px-1">
                                {snippet.content}
                            </span>
                        )}
                    </span>
                ))}
            </pre>
        );
    };

    return (
        <div className="p-10 h-full overflow-y-auto flex flex-col bg-slate-50/50">
            {/* Snippet Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                    <div className="relative z-10 w-full pr-10">
                        <div className="flex items-center space-x-3 mb-4">
                             <span className="bg-blue-50 text-highlight border border-blue-100 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                {snippet.category}
                             </span>
                             {snippet.relevanceScore === 'High' && (
                                 <span className="bg-red-50 text-red-500 border border-red-100 text-[10px] font-bold px-3 py-1 rounded-full flex items-center uppercase tracking-widest">
                                     <ShieldExclamationIcon className="w-3 h-3 mr-1"/> High Priority
                                 </span>
                             )}
                             <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border ${
                                 snippet.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-500 border-amber-100'
                             }`}>
                                 {snippet.status}
                             </span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight leading-tight">{snippet.headline}</h1>
                        
                        {/* Generated Citation Box */}
                        {snippet.legalCitation && (
                            <div className="mt-2 inline-block bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg">
                                <span className="text-highlight font-mono font-bold text-sm tracking-wide">
                                    {snippet.legalCitation}
                                </span>
                            </div>
                        )}

                        <p className="text-slate-400 text-xs flex items-center font-bold mt-6 uppercase tracking-wider">
                            Source Document: <span className="text-slate-700 ml-2">{snippet.sourceDocName}</span>
                        </p>
                    </div>
                    
                    <div className="flex space-x-2 relative z-10">
                        <button 
                            onClick={() => onEditSnippetCategory(snippet.id)}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:border-highlight hover:text-highlight rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm"
                        >
                            Reclassify
                        </button>
                        {snippet.status !== 'approved' && (
                            <button 
                                onClick={() => onApproveSnippet(snippet.id)}
                                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-bold text-xs uppercase tracking-wide shadow-lg shadow-emerald-500/20"
                            >
                                Approve
                            </button>
                        )}
                        <button 
                            onClick={handleDeleteDoc}
                            className="text-slate-400 hover:text-red-500 p-2 border border-transparent hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Source"
                        >
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 text-base text-slate-700 font-serif italic leading-relaxed shadow-inner">
                    "{snippet.content}"
                </div>
            </div>

            {/* Source Document Context */}
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/50">
                <div className="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                        Original Source Text
                    </h3>
                    {document.groundingSources && document.groundingSources.length > 0 && (
                         <div className="flex items-center text-[10px] text-emerald-600 uppercase tracking-widest border border-emerald-200 px-3 py-1.5 rounded-full bg-white shadow-sm font-bold">
                             <GlobeIcon className="w-3 h-3 mr-2" />
                             Verified Sources
                         </div>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-12 bg-white max-w-4xl mx-auto w-full shadow-sm my-4 border border-slate-100 min-h-[500px]">
                    {renderHighlightedContent()}
                </div>
            </div>
        </div>
    );
};
