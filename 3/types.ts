
export type FileStatus = 'pending' | 'processing' | 'done' | 'error';

export interface GroundingSource {
    title: string;
    url: string;
}

export interface Snippet {
  id: string;
  sourceDocId: string;
  sourceDocName: string;
  headline: string; // Short title for the sidebar
  category: "Statute + Citation" | "Doctrine" | "Literary/Scholarly Reference" | "Court/Judge/Legislative Opinions" | "Templates" | "Philosophy" | "Psychology" | "Case Law Reference" | "Uncategorized";
  content: string; // The verbatim quote from the document
  legalCitation?: string; // The AI-generated standard citation (Bluebook style)
  relevanceScore: 'High' | 'Medium' | 'Low';
  status: 'pending' | 'approved';
}

export interface LegalDocument {
  id: string;
  name: string;
  type: string;
  content: string;
  snippets: Snippet[];
  groundingSources?: GroundingSource[];
  isProcessed: boolean;
  error?: string;
}

export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};
