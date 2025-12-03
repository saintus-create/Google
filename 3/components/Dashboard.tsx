
import React, { useMemo } from 'react';
import { Snippet } from '../types';
import { UsersIcon } from './icons/UsersIcon';
import { FileIcon } from './icons/FileIcon';
import { ShieldExclamationIcon } from './icons/ShieldExclamationIcon';

interface DashboardProps {
    snippets: Snippet[];
    onSelectSnippet: (id: string) => void;
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

export const Dashboard: React.FC<DashboardProps> = ({ snippets, onSelectSnippet }) => {

    const stats = useMemo(() => {
        const totalSnippets = snippets.length;
        const highRelevance = snippets.filter(s => s.relevanceScore === 'High').length;
        
        // Calculate volume per category
        const categoryCounts: Record<string, number> = {};
        let anomalies = 0;

        // Initialize valid buckets
        CATEGORIES.forEach(cat => categoryCounts[cat] = 0);
        
        snippets.forEach(s => {
            if (categoryCounts[s.category] !== undefined) {
                categoryCounts[s.category]++;
            } else {
                // Count anything not in the strict rubric as an anomaly
                anomalies++;
            }
        });

        return { totalSnippets, highRelevance, categoryCounts, anomalies };
    }, [snippets]);

    // Group high relevance snippets
    const topSnippets = useMemo(() => {
        return snippets.filter(s => s.relevanceScore === 'High').slice(0, 5);
    }, [snippets]);

    // Find max for scaling bars (including anomalies to keep scale honest)
    const maxCategoryCount = Math.max(...(Object.values(stats.categoryCounts) as number[]), stats.anomalies, 1);

    return (
        <div className="p-10 h-full overflow-y-auto bg-slate-50/50 text-text-primary">
            <header className="mb-10 flex items-end justify-between border-b border-slate-200 pb-8">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">Intelligence <span className="text-highlight">Hub</span></h1>
                    <p className="text-sm text-slate-500 font-medium">REAL-TIME CASE ANALYTICS • {new Date().toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                    <div className="flex items-center justify-end text-emerald-600 text-sm font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></span>
                        SYSTEM ACTIVE
                    </div>
                </div>
            </header>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center relative overflow-hidden group">
                    <div className="p-5 rounded-xl bg-blue-50 text-highlight mr-6 border border-blue-100">
                        <FileIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Total Intelligence Points</p>
                        <p className="text-5xl font-bold text-slate-900 tracking-tight">{stats.totalSnippets}</p>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center relative overflow-hidden group">
                    <div className="p-5 rounded-xl bg-red-50 text-red-500 mr-6 border border-red-100">
                        <ShieldExclamationIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">High Priority Items</p>
                        <p className="text-5xl font-bold text-slate-900 tracking-tight">{stats.highRelevance}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Volume Analysis Column */}
                <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-lg shadow-slate-200/50 h-fit">
                    <h2 className="text-sm font-bold text-slate-900 mb-8 flex items-center pb-4 border-b border-slate-100 uppercase tracking-widest">
                        <UsersIcon className="w-4 h-4 mr-3 text-highlight" />
                        Legal Density Analysis
                    </h2>
                    <div className="space-y-6">
                        {CATEGORIES.map(cat => {
                            const count = stats.categoryCounts[cat] || 0;
                            const percentage = Math.round((count / maxCategoryCount) * 100);
                            
                            return (
                                <div key={cat} className="group">
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className={`font-semibold ${count > 0 ? 'text-slate-700' : 'text-slate-400'}`}>{cat}</span>
                                        <span className="text-slate-500 font-mono font-bold">{count}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-700 ease-out ${count > 0 ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-transparent'}`}
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Explicit Anomaly Bar */}
                        {stats.anomalies > 0 && (
                            <div className="group border-t border-slate-100 pt-6 mt-4">
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="font-bold text-red-500">Uncategorized / Anomalies</span>
                                    <span className="text-red-500 font-mono font-bold">{stats.anomalies}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                                    <div 
                                        className="h-full rounded-full bg-red-500 transition-all duration-700 ease-out"
                                        style={{ width: `${Math.round((stats.anomalies / maxCategoryCount) * 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10px] text-red-400 mt-2 font-medium">
                                    * Items detected outside strict rubric. Please review.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Critical Intel Column */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center border-b border-slate-200 pb-4 uppercase tracking-widest pl-2">
                        <ShieldExclamationIcon className="w-4 h-4 mr-3 text-red-500" />
                        Critical Intelligence Stream
                    </h2>
                    <div className="space-y-4">
                        {topSnippets.length === 0 ? (
                            <div className="text-center py-24 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                                <p className="text-slate-400 font-medium text-sm mb-2">No critical data extracted yet.</p>
                                <p className="text-xs text-slate-400 opacity-70">Upload documents to populate the matrix.</p>
                            </div>
                        ) : (
                            topSnippets.map((snip) => (
                                <div key={snip.id} className="bg-white rounded-xl p-6 border border-slate-100 shadow-md hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden ring-1 ring-slate-900/5 hover:ring-highlight/30" onClick={() => onSelectSnippet(snip.id)}>
                                    <div className="absolute top-0 left-0 w-1 h-full bg-highlight opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-highlight font-bold text-[10px] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100">{snip.category}</span>
                                        <span className="text-[10px] text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 font-mono">
                                            SRC: {snip.sourceDocName.substring(0, 20)}...
                                        </span>
                                    </div>
                                    <h3 className="text-slate-800 font-bold mb-3 text-lg group-hover:text-highlight transition-colors leading-snug">{snip.headline}</h3>
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 text-sm text-slate-600 font-serif italic leading-relaxed text-justify">
                                        "{snip.content.length > 250 ? snip.content.substring(0, 250) + '...' : snip.content}"
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                
            </div>
        </div>
    );
};
