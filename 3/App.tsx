
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { LegalDocument, FileStatus, ChatMessage, Snippet } from './types';
import { Sidebar } from './components/Sidebar';
import { DocumentViewer } from './components/DocumentViewer';
import { ChatBubble } from './components/ChatBubble';
import { Chatbot } from './components/Chatbot';
import { DragOverlay } from './components/DragOverlay';
import { GitManager } from './components/GitManager';
import { readAllFiles } from './services/fileProcessor';
import { analyzeDocumentContent, sendMessageToChatbot } from './services/geminiService';
import { downloadJson, downloadCsv, downloadPdf } from './utils';
import { getAllDocuments, addOrUpdateDocument, deleteDocument, clearAllDocuments } from './services/db';

export type SaveStatus = 'synced' | 'syncing' | 'error';

// SWARM SETTINGS: Run 7 parallel threads (1 for each model in rotation)
const MAX_CONCURRENCY = 7;

const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error?.error?.message) return error.error.message;
  if (error?.message) return error.message;
  
  try {
    return JSON.stringify(error);
  } catch {
    return 'An unknown error occurred';
  }
};

const App: React.FC = () => {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatus>>({});
  
  // Selection state
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('synced');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);

  // Parallel Processing State
  const [activeWorkers, setActiveWorkers] = useState(0);
  const processingDocsRef = useRef<Set<string>>(new Set());

  // Git State
  const [isGitOpen, setIsGitOpen] = useState(false);

  // Derived list of all snippets for the sidebar
  const allSnippets = useMemo(() => {
    return documents.flatMap(doc => doc.snippets || []);
  }, [documents]);

  // Derived counts for sidebar
  const processingCount = activeWorkers;
  const pendingCount = documents.filter(d => 
    !d.isProcessed && 
    !fileStatuses[d.id]?.includes('processing') &&
    !processingDocsRef.current.has(d.id)
  ).length;

  const handleDbOperation = useCallback(async (operation: () => Promise<void>) => {
    setSaveStatus('syncing');
    try {
        await operation();
        setSaveStatus('synced');
        setLastSaved(new Date());
    } catch (e) {
        console.error("Database operation failed", e);
        setSaveStatus('error');
    }
  }, []);

  // Worker Loop - Fixed to prevent race conditions and infinite loops
  useEffect(() => {
      const processNext = async () => {
          // Find next pending document that isn't already processing
          const nextDoc = documents.find(d => 
              !d.isProcessed && 
              fileStatuses[d.id] !== 'processing' && 
              fileStatuses[d.id] !== 'error' &&
              !processingDocsRef.current.has(d.id)
          );
          
          if (!nextDoc) return;

          // Claim the work immediately using ref to prevent race conditions
          processingDocsRef.current.add(nextDoc.id);
          setActiveWorkers(prev => prev + 1);
          setFileStatuses(prev => ({ ...prev, [nextDoc.id]: 'processing' }));

          try {
              if (nextDoc.content.startsWith('Error reading file:')) {
                  throw new Error("Skipping analysis due to file read error.");
              }

              // Analyze
              const { snippets, groundingSources } = await analyzeDocumentContent(nextDoc.content, nextDoc.id, nextDoc.name);
              
              const updatedDoc = { 
                  ...nextDoc, 
                  snippets, 
                  groundingSources, 
                  isProcessed: true,
                  error: undefined
              };
              
              // Persist
              await addOrUpdateDocument(updatedDoc);
              setLastSaved(new Date());

              // Update UI
              setDocuments(prevDocs => prevDocs.map(d => d.id === nextDoc.id ? updatedDoc : d));
              setFileStatuses(prev => ({ ...prev, [nextDoc.id]: 'done' }));

          } catch (error: any) {
              console.error(`Worker failed for ${nextDoc.name}:`, error);
              const errorMessage = getErrorMessage(error);
              
              const errorDoc = { ...nextDoc, error: errorMessage, isProcessed: true };
              await addOrUpdateDocument(errorDoc);
              
              setDocuments(prevDocs => prevDocs.map(d => d.id === nextDoc.id ? errorDoc : d));
              setFileStatuses(prev => ({ ...prev, [nextDoc.id]: 'error' }));
          } finally {
              processingDocsRef.current.delete(nextDoc.id);
              setActiveWorkers(prev => prev - 1);
          }
      };

      // Trigger workers if we have capacity and work
      if (activeWorkers < MAX_CONCURRENCY) {
          const hasPending = documents.some(d => 
              !d.isProcessed && 
              fileStatuses[d.id] !== 'processing' && 
              fileStatuses[d.id] !== 'error' &&
              !processingDocsRef.current.has(d.id)
          );
          if (hasPending) {
              processNext();
          }
      }
  }, [activeWorkers, documents, fileStatuses]);


  useEffect(() => {
    const loadData = async () => {
      try {
        const storedDocs = await getAllDocuments();
        
        // Scan for failed docs due to "Decommissioned" error and auto-retry them
        const fixedDocs = storedDocs.map(d => {
            if (d.error && (d.error.includes("decommissioned") || d.error.includes("Rate limit"))) {
                return { ...d, isProcessed: false, error: undefined }; // Reset to pending
            }
            return d;
        });

        setDocuments(fixedDocs);

        // Re-hydrate statuses
        const initialStatuses: Record<string, FileStatus> = {};
        fixedDocs.forEach(doc => {
            if (doc.isProcessed) {
                initialStatuses[doc.id] = doc.error ? 'error' : 'done';
            } else {
                initialStatuses[doc.id] = 'pending';
            }
        });
        setFileStatuses(initialStatuses);

        setLastSaved(new Date());
        setSaveStatus('synced');
      } catch (e) {
        console.error("Could not load documents from database.", e);
        setSaveStatus('error');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);


  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsDragging(false); 
    const newDocs = await readAllFiles(files);
    const validDocs = newDocs.filter(d => d.content.length > 0);

    if (validDocs.length === 0) return;

    // Optimistic UI update
    setDocuments(prev => [...prev, ...validDocs]);
    
    // Set status to pending
    const newStatuses: Record<string, FileStatus> = {};
    validDocs.forEach(d => {
        newStatuses[d.id] = d.content.startsWith('Error') ? 'error' : 'pending';
    });
    setFileStatuses(prev => ({...prev, ...newStatuses}));

    // Background Save
    handleDbOperation(async () => {
        for (const doc of validDocs) {
            await addOrUpdateDocument(doc);
        }
    });

  }, [handleDbOperation]);
  
  // Global Drag Events
  useEffect(() => {
      const handleWindowDragEnter = (e: DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer?.types.includes('Files')) {
              setIsDragging(true);
          }
      };
      const handleWindowDragOver = (e: DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
      };
      const handleWindowDrop = (e: DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
      };

      window.addEventListener('dragenter', handleWindowDragEnter);
      window.addEventListener('dragover', handleWindowDragOver);
      window.addEventListener('drop', handleWindowDrop);

      return () => {
          window.removeEventListener('dragenter', handleWindowDragEnter);
          window.removeEventListener('dragover', handleWindowDragOver);
          window.removeEventListener('drop', handleWindowDrop);
      };
  }, []);

  const handleUpdateDocument = async (updatedDoc: LegalDocument) => {
    setDocuments(prevDocs => prevDocs.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc));
    await handleDbOperation(() => addOrUpdateDocument(updatedDoc));
  };

  const handleApproveSnippet = async (snippetId: string) => {
      const doc = documents.find(d => d.snippets?.some(s => s.id === snippetId));
      if (!doc) return;

      const updatedSnippets = doc.snippets.map(s => s.id === snippetId ? { ...s, status: 'approved' as const } : s);
      const updatedDoc = { ...doc, snippets: updatedSnippets };
      
      await handleUpdateDocument(updatedDoc);
  };

  const handleEditSnippetCategory = async (snippetId: string) => {
      const doc = documents.find(d => d.snippets?.some(s => s.id === snippetId));
      if (!doc) return;
      const snippet = doc.snippets.find(s => s.id === snippetId);
      if(!snippet) return;

      const newCategory = window.prompt("Enter new category:", snippet.category);
      if (newCategory) {
           const updatedSnippets = doc.snippets.map(s => s.id === snippetId ? { ...s, category: newCategory as any } : s);
           const updatedDoc = { ...doc, snippets: updatedSnippets };
           await handleUpdateDocument(updatedDoc);
      }
  };

  const handleDeleteDocument = async (id: string) => {
    await handleDbOperation(() => deleteDocument(id));
    const newDocs = documents.filter(doc => doc.id !== id);
    setDocuments(newDocs);
    if (selectedSnippetId && allSnippets.find(s => s.id === selectedSnippetId)?.sourceDocId === id) {
        setSelectedSnippetId(null);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all documents? This action cannot be undone.')) {
        await handleDbOperation(clearAllDocuments);
        setDocuments([]);
        setFileStatuses({});
        processingDocsRef.current.clear();
        setSelectedSnippetId(null);
        setSelectedCategory(null);
    }
  };
  
  const handleExport = (format: 'json' | 'csv' | 'pdf') => {
        const exportData = documents;
        if (format === 'json') {
            downloadJson(exportData, 'legal_snippets_archive.json');
        } else if (format === 'csv') {
            downloadCsv(allSnippets, 'legal_evidence_matrix.csv');
        } else if (format === 'pdf') {
            downloadPdf(allSnippets, 'legal_case_report.pdf');
        }
  };

  const handleGitImport = (importedDocs: LegalDocument[]) => {
      setDocuments(importedDocs);
      processingDocsRef.current.clear();
      
      // Re-hydrate statuses based on processed state
      const newStatuses: Record<string, FileStatus> = {};
      importedDocs.forEach(d => {
          newStatuses[d.id] = d.isProcessed ? 'done' : 'pending';
      });
      setFileStatuses(newStatuses);
      
      // Save to local DB to persist
      handleDbOperation(async () => {
          for (const doc of importedDocs) {
              await addOrUpdateDocument(doc);
          }
      });
  };

  const handleSendMessage = async (message: string) => {
    const newUserMessage: ChatMessage = { role: 'user', content: message };
    const updatedMessages = [...chatMessages, newUserMessage];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    try {
      const response = await sendMessageToChatbot(updatedMessages);
      const modelMessage: ChatMessage = { role: 'model', content: response };
      setChatMessages([...updatedMessages, modelMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: ChatMessage = { role: 'model', content: 'Sorry, I encountered an error. Please try again.' };
      setChatMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const selectedSnippet = useMemo(() => {
      return allSnippets.find(s => s.id === selectedSnippetId) || null;
  }, [allSnippets, selectedSnippetId]);

  const sourceDocument = useMemo(() => {
      if (!selectedSnippet) return null;
      return documents.find(d => d.id === selectedSnippet.sourceDocId) || null;
  }, [documents, selectedSnippet]);

  const handleSidebarSelect = (id: string) => {
      if (id === '') {
          setSelectedSnippetId(null);
          setSelectedCategory(null);
      }
      else {
          setSelectedSnippetId(id);
          setSelectedCategory(null);
      }
  };

  const handleCategorySelect = (category: string) => {
      setSelectedCategory(category);
      setSelectedSnippetId(null);
  };

  const categorySnippets = useMemo(() => {
      if (!selectedCategory) return [];
      return allSnippets.filter(s => s.category === selectedCategory);
  }, [allSnippets, selectedCategory]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white text-slate-800 font-sans">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-highlight rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium">Loading Legal Atlas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white text-text-primary font-sans relative overflow-hidden">
      <DragOverlay isDragging={isDragging} onDrop={handleFileUpload} onLeave={() => setIsDragging(false)} />
      
      {isGitOpen && (
          <GitManager 
            documents={documents} 
            onImport={handleGitImport} 
            onClose={() => setIsGitOpen(false)} 
          />
      )}

      <Sidebar
        snippets={allSnippets}
        fileStatuses={fileStatuses}
        selectedSnippetId={selectedSnippetId}
        onSelectSnippet={handleSidebarSelect}
        onExport={handleExport}
        onFileUpload={handleFileUpload}
        saveStatus={saveStatus}
        lastSaved={lastSaved}
        onClearAll={handleClearAll}
        onSelectCategory={handleCategorySelect}
        selectedCategory={selectedCategory}
        activeWorkers={activeWorkers}
        pendingCount={pendingCount}
        onOpenGit={() => setIsGitOpen(true)}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50/50 relative z-10">
        <DocumentViewer 
            snippet={selectedSnippet}
            document={sourceDocument}
            allSnippets={allSnippets}
            categoryView={selectedCategory ? { category: selectedCategory, snippets: categorySnippets } : null}
            onUpdate={handleUpdateDocument} 
            onDelete={handleDeleteDocument} 
            onSelectSnippet={handleSidebarSelect}
            onApproveSnippet={handleApproveSnippet}
            onEditSnippetCategory={handleEditSnippetCategory}
        />
      </main>
      <ChatBubble onClick={() => setIsChatOpen(true)} />
      {isChatOpen && (
        <Chatbot
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          onClose={() => setIsChatOpen(false)}
          isLoading={isChatLoading}
        />
      )}
    </div>
  );
};

export default App;
