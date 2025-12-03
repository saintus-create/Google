
import React, { useState, useMemo } from 'react';
import { Snippet } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { PencilIcon } from './icons/PencilIcon';
import { FileIcon } from './icons/FileIcon';

interface SnippetTableProps {
    snippets: Snippet[];
    category: string;
    onSelectSnippet: (id: string) => void;
    onApprove: (id: string) => void;
    onEditCategory: (id: string) => void;
}

export const SnippetTable: React.FC<SnippetTableProps> = ({ snippets, category, onSelectSnippet, onApprove, onEditCategory }) => {
    const [sortConfig, setSortConfig] = useState<{ key: keyof Snippet, direction: 'ascending' | 'descending' }>({ key: 'headline', direction: 'ascending' });

    const sortedSnippets = useMemo(() => {
        let sortableSnippets = [...snippets];
        if (sortConfig !== null) {
            sortableSnippets.sort((a, b) => {
                const aVal = a[sortConfig.key] || '';
                const bVal = b[sortConfig.key] || '';
                
                if (aVal < bVal) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableSnippets;
    }, [snippets, sortConfig]);

    const requestSort = (key: keyof Snippet) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 text-text-primary">
            <header className="px-10 py-8 flex justify-between items-end border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center tracking-tight">
                        <span className="mr-3 text-highlight text-3xl font-light">/</span> 
                        {category}
                    </h2>
                    <p className="text-slate-500 text-xs font-semibold mt-1 pl-6 uppercase tracking-wider">{snippets.length} DATA POINTS EXTRACTED</p>
                </div>
            </header>

            <div className="flex-1 overflow-auto bg-transparent px-10 py-8">
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xl bg-white ring-1 ring-black/5">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 font-bold text-[11px] uppercase tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="p-5 w-28 text-center border-r border-slate-100">Status</th>
                                <th 
                                    className="p-5 cursor-pointer hover:text-slate-800 transition-colors w-1/4 border-r border-slate-100"
                                    onClick={() => requestSort('headline')}
                                >
                                    Headline {sortConfig.key === 'headline' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                                </th>
                                <th className="p-5 w-56 border-r border-slate-100">Legal Citation</th>
                                <th className="p-5 border-r border-slate-100">Verbatim Extract</th>
                                <th className="p-5 w-28 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans text-sm">
                            {sortedSnippets.map((snip, index) => (
                                <tr key={snip.id} className={`group transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-blue-50/50`}>
                                    <td className="p-5 align-top border-r border-slate-100">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center justify-center w-fit mx-auto ${
                                            snip.status === 'approved' 
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                : 'bg-amber-50 text-amber-600 border border-amber-100'
                                        }`}>
                                            {snip.status || 'pending'}
                                        </span>
                                    </td>
                                    <td className="p-5 font-semibold text-slate-700 cursor-pointer group-hover:text-highlight transition-colors align-top border-r border-slate-100" onClick={() => onSelectSnippet(snip.id)}>
                                        {snip.headline}
                                        <div className="mt-2 flex items-center text-[10px] text-slate-400 font-medium">
                                            <FileIcon className="w-3 h-3 mr-1"/> 
                                            <span className="truncate max-w-[150px]">{snip.sourceDocName}</span>
                                        </div>
                                    </td>
                                    <td className="p-5 align-top border-r border-slate-100">
                                        {snip.legalCitation ? (
                                            <span className="bg-blue-50 text-highlight font-mono text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-100 inline-block">
                                                {snip.legalCitation}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 text-[10px] font-mono">--</span>
                                        )}
                                    </td>
                                    <td className="p-5 cursor-pointer align-top border-r border-slate-100" onClick={() => onSelectSnippet(snip.id)}>
                                        <p className="text-slate-600 text-sm font-serif italic line-clamp-2 leading-relaxed">
                                            "{snip.content}"
                                        </p>
                                    </td>
                                    <td className="p-5 text-right align-top">
                                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-lg border border-slate-200 shadow-sm w-fit ml-auto">
                                            {snip.status !== 'approved' && (
                                                <button 
                                                    onClick={() => onApprove(snip.id)} 
                                                    className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded transition-colors" 
                                                    title="Approve"
                                                >
                                                    <CheckCircleIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => onEditCategory(snip.id)} 
                                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" 
                                                title="Edit Category"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
