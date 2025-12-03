
import React, { useState, useEffect } from 'react';
import { GitConfig, cloneRepository, syncDocumentsToGit, pullDocumentsFromGit } from '../services/gitService';
import { LegalDocument } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { Spinner } from './Spinner';

interface GitManagerProps {
    documents: LegalDocument[];
    onImport: (docs: LegalDocument[]) => void;
    onClose: () => void;
}

export const GitManager: React.FC<GitManagerProps> = ({ documents, onImport, onClose }) => {
    const [config, setConfig] = useState<GitConfig>({
        repoUrl: '',
        token: '',
        username: '',
        email: '',
        branch: 'main'
    });
    const [status, setStatus] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [commitMsg, setCommitMsg] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('legal_matrix_git_config');
        if (stored) {
            setConfig(JSON.parse(stored));
        }
    }, []);

    const saveConfig = () => {
        localStorage.setItem('legal_matrix_git_config', JSON.stringify(config));
    };

    const handleAction = async (action: 'clone' | 'push' | 'pull') => {
        setIsLoading(true);
        setStatus(`Executing ${action}...`);
        saveConfig();
        
        try {
            if (action === 'clone') {
                const msg = await cloneRepository(config);
                setStatus(msg);
            } else if (action === 'push') {
                const msg = await syncDocumentsToGit(documents, config, commitMsg);
                setStatus(msg);
                setCommitMsg('');
            } else if (action === 'pull') {
                const docs = await pullDocumentsFromGit(config);
                onImport(docs);
                setStatus(`Successfully pulled ${docs.length} documents.`);
            }
        } catch (e: any) {
            setStatus(`Error: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-secondary border border-white/10 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <header className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-highlight">GIT</span> VERSION CONTROL
                    </h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-white">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </header>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Status Console */}
                    <div className="bg-black/50 border border-white/10 rounded p-3 font-mono text-xs text-green-400 min-h-[3rem] whitespace-pre-wrap">
                        {isLoading && <Spinner />} {status || "Ready for commands..."}
                    </div>

                    {/* Config Form */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">Configuration</h3>
                        <input
                            type="text"
                            placeholder="Repository URL (e.g. https://github.com/user/repo)"
                            className="w-full bg-primary border border-white/10 rounded p-2 text-sm text-white focus:border-highlight outline-none"
                            value={config.repoUrl}
                            onChange={(e) => setConfig({ ...config, repoUrl: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="Branch (main)"
                                className="w-full bg-primary border border-white/10 rounded p-2 text-sm text-white focus:border-highlight outline-none"
                                value={config.branch}
                                onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                            />
                            <input
                                type="password"
                                placeholder="Personal Access Token (PAT)"
                                className="w-full bg-primary border border-white/10 rounded p-2 text-sm text-white focus:border-highlight outline-none"
                                value={config.token}
                                onChange={(e) => setConfig({ ...config, token: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="Git Username"
                                className="w-full bg-primary border border-white/10 rounded p-2 text-sm text-white focus:border-highlight outline-none"
                                value={config.username}
                                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                            />
                            <input
                                type="email"
                                placeholder="Git Email"
                                className="w-full bg-primary border border-white/10 rounded p-2 text-sm text-white focus:border-highlight outline-none"
                                value={config.email}
                                onChange={(e) => setConfig({ ...config, email: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">Operations</h3>
                        
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleAction('clone')}
                                disabled={isLoading}
                                className="flex-1 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded text-sm font-bold uppercase disabled:opacity-50"
                            >
                                Clone Repo
                            </button>
                            <button
                                onClick={() => handleAction('pull')}
                                disabled={isLoading}
                                className="flex-1 py-2 bg-highlight/10 border border-highlight/20 hover:bg-highlight/20 text-highlight rounded text-sm font-bold uppercase disabled:opacity-50"
                            >
                                Pull & Merge
                            </button>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <input 
                                type="text" 
                                placeholder="Commit message..."
                                className="flex-grow bg-primary border border-white/10 rounded p-2 text-sm text-white focus:border-highlight outline-none"
                                value={commitMsg}
                                onChange={(e) => setCommitMsg(e.target.value)}
                            />
                            <button
                                onClick={() => handleAction('push')}
                                disabled={isLoading}
                                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-bold uppercase disabled:opacity-50"
                            >
                                Push
                            </button>
                        </div>
                        <p className="text-[9px] text-text-secondary italic text-center">
                            * Requires a GitHub/GitLab token. Uses cors.isomorphic-git.org proxy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
