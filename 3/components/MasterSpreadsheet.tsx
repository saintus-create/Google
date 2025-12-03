
import React from 'react';
import { Snippet } from '../types';
import { FileIcon } from './icons/FileIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { PencilIcon } from './icons/PencilIcon';

interface MasterSpreadsheetProps {
    snippets: Snippet[];
    onSelectSnippet: (id: string) => void;
    onApprove: (id: string) => void;
    onEditCategory: (id: string) => void;
}

const CATEGORIES = [
    "Statute + Citation",
    "Doctrine",
    "Literary/Scholarly Reference",
    "Court/Judge/Legislative Opinions",
    "Templates",
    "Philosophy",
    "Psychology",
    "Case Law Reference"
];

export const MasterSpreadsheet: React.FC<MasterSpreadsheetProps> = ({ snippets, onSelectSnippet, onApprove, onEditCategory }) => {
    
    // Group snippets by category for the sheet
    const groupedSnippets = React.useMemo(() => {
        const groups: Record<string, Snippet[]> = {};
        CATEGORIES.forEach(cat => groups[cat] = []);
        // Also capture uncategorized
        groups["Uncategorized / Anomalies"] = [];

        snippets.forEach(s => {
            if (groups[s.category]) {
                groups[s.category].push(s);
            } else {
                groups["Uncategorized / Anomalies"].push(s);
            }
        });
        
        // Sort each group alphabetically
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => a.headline.localeCompare(b.headline));
        });

        return groups;
    }, [snippets]);

    return (
        <div className="flex flex-col h-full bg-slate-50/50 text-text-primary overflow-hidden">
            {/* Sheet Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-highlight font-bold text-lg shadow-sm">
                        #
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight leading-none">Master Index</h1>
                        <p className="text-xs text-slate-500 font-medium mt-1">FULL CASE DATABASE • AUTO-POPULATING</p>
                    </div>
                </div>
                <div className="text-xs font-semibold bg-slate-100 text-slate-600 px-4 py-2 rounded-full border border-slate-200">
                    Total Records: <span className="text-slate-900">{snippets.length}</span>
                </div>
            </div>

            {/* The Grid */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="border border-slate-200 rounded-2xl bg-white shadow-xl overflow-hidden ring-1 ring-black/5">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="p-4 w-16 text-center border-r border-slate-100">#</th>
                                <th className="p-4 w-28 border-r border-slate-100">Status</th>
                                <th className="p-4 w-1/5 border-r border-slate-100">Headline / Topic</th>
                                <th className="p-4 w-56 border-r border-slate-100">Legal Citation</th>
                                <th className="p-4 border-r border-slate-100">Verbatim Extract</th>
                                <th className="p-4 w-40 text-right">Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {CATEGORIES.map((category, catIndex) => {
                                const categoryItems = groupedSnippets[category] || [];
                                
                                return (
                                    <React.Fragment key={category}>
                                        {/* Section Header Row */}
                                        <tr className="bg-slate-50/80 border-y border-slate-200">
                                            <td colSpan={6} className="p-3 pl-5">
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-highlight font-bold text-sm opacity-60">{categoryIndex(catIndex)}</span>
                                                    <span className="text-slate-800 font-bold text-sm tracking-tight">{category}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-sm">{categoryItems.length}</span>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Data Rows */}
                                        {categoryItems.length === 0 ? (
                                            /* Empty State Row */
                                            <tr>
                                                <td className="p-4 text-center text-xs text-slate-300 border-r border-slate-100">{catIndex + 1}.0</td>
                                                <td colSpan={5} className="p-4 text-xs text-slate-400 italic pl-10">
                                                    Empty section. Upload documents to populate.
                                                </td>
                                            </tr>
                                        ) : (
                                            categoryItems.map((snip, index) => (
                                                <tr 
                                                    key={snip.id} 
                                                    onClick={() => onSelectSnippet(snip.id)}
                                                    className="group hover:bg-blue-50/50 cursor-pointer transition-colors"
                                                >
                                                    <td className="p-4 text-center text-[10px] text-slate-400 font-mono border-r border-slate-100 group-hover:text-highlight">
                                                        {catIndex + 1}.{index + 1}
                                                    </td>
                                                    <td className="p-4 border-r border-slate-100">
                                                        <div className="flex items-center space-x-2">
                                                            <span className={`w-2 h-2 rounded-full ${snip.status === 'approved' ? 'bg-emerald-500 shadow-sm' : 'bg-amber-400 shadow-sm'}`}></span>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{snip.status}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 border-r border-slate-100 font-semibold text-sm text-slate-700 truncate group-hover:text-highlight">
                                                        {snip.headline}
                                                    </td>
                                                    <td className="p-4 border-r border-slate-100 align-middle">
                                                        {snip.legalCitation ? (
                                                            <span className="bg-blue-50 text-blue-600 font-mono text-[10px] font-bold px-2 py-1 rounded border border-blue-100 inline-block truncate max-w-full">
                                                                {snip.legalCitation}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 text-[10px] font-mono">--</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 border-r border-slate-100 text-sm text-slate-600 font-serif italic line-clamp-1 group-hover:text-slate-900">
                                                        "{snip.content}"
                                                    </td>
                                                    <td className="p-4 text-right align-middle">
                                                        <div className="flex items-center justify-end space-x-3">
                                                            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]" title={snip.sourceDocName}>
                                                                {snip.sourceDocName}
                                                            </span>
                                                            {/* Quick Actions that appear on hover */}
                                                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded-lg border border-slate-200">
                                                                {snip.status !== 'approved' && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); onApprove(snip.id); }}
                                                                        className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-l-lg border-r border-slate-100"
                                                                        title="Approve"
                                                                    >
                                                                        <CheckCircleIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); onEditCategory(snip.id); }}
                                                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-r-lg"
                                                                    title="Move Category"
                                                                >
                                                                    <PencilIcon className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            
                            {/* Anomalies Section if exists */}
                            {groupedSnippets["Uncategorized / Anomalies"].length > 0 && (
                                <React.Fragment>
                                    <tr className="bg-red-50 border-y border-red-100">
                                        <td colSpan={6} className="p-3 pl-5">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-red-500 font-bold text-sm uppercase tracking-wider">ERR</span>
                                                <span className="text-red-600 font-bold text-sm tracking-tight">Uncategorized / Anomalies</span>
                                                <span className="text-[10px] text-red-500 font-bold bg-red-100 px-2 py-0.5 rounded-full">{groupedSnippets["Uncategorized / Anomalies"].length}</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {groupedSnippets["Uncategorized / Anomalies"].map((snip, index) => (
                                        <tr key={snip.id} onClick={() => onSelectSnippet(snip.id)} className="group hover:bg-red-50 cursor-pointer border-b border-red-50/50">
                                            <td className="p-4 text-center text-[10px] text-red-300 font-mono border-r border-slate-100">ERR.{index+1}</td>
                                            <td className="p-4 border-r border-slate-100 text-[10px] text-red-500 font-bold">REVIEW</td>
                                            <td className="p-4 border-r border-slate-100 font-medium text-sm text-slate-700">{snip.headline}</td>
                                            <td className="p-4 border-r border-slate-100 font-mono text-[10px] text-slate-300">--</td>
                                            <td className="p-4 border-r border-slate-100 text-sm text-slate-500 italic line-clamp-1">"{snip.content}"</td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onEditCategory(snip.id); }}
                                                    className="px-3 py-1.5 bg-white text-slate-600 text-xs font-semibold rounded shadow-sm border border-slate-200 hover:border-highlight hover:text-highlight"
                                                >
                                                    Fix Category
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const categoryIndex = (index: number) => {
    return (index + 1).toString().padStart(2, '0');
};
