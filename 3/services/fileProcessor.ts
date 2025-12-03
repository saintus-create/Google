
import { LegalDocument } from '../types';

// Set up PDF.js worker
if (typeof window !== 'undefined' && 'pdfjsLib' in window) {
  (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => {
        const msg = reader.error ? reader.error.message : 'Unknown read error';
        reject(new Error(msg));
    };
    reader.readAsText(file);
  });
};

const readPdfContent = async (file: File): Promise<string> => {
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) {
        throw new Error("PDF.js library is not loaded.");
    }
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let content = '';
    
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            content += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
        return content;
    } catch (e: any) {
        throw new Error(`PDF parse error: ${e.message || e}`);
    }
};


export const readAllFiles = async (files: FileList): Promise<LegalDocument[]> => {
  const documents: LegalDocument[] = [];
  for (const file of Array.from(files)) {
    try {
      if (file.name.startsWith('.')) {
          // Ignore system files like .DS_Store
          continue;
      }

      if (file.size === 0) {
          // Silently skip empty files (often folders dragged in)
          continue;
      }

      // Basic type validation to filter out unsupported binary files (like images, zip, etc.)
      const supportedTypes = ['application/pdf', 'text/csv', 'text/html', 'application/json', 'text/plain'];
      // Allow jsonl and other text/* types loosely
      const isSupported = supportedTypes.includes(file.type) || file.name.endsWith('.jsonl') || file.type.startsWith('text/');

      if (!isSupported) {
          // Silently skip unsupported types to keep the queue clean
          continue;
      }

      let content = '';
      if (file.type === 'application/pdf') {
        content = await readPdfContent(file);
      } else {
        content = await readFileAsText(file);
      }
      documents.push({
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        type: file.type,
        content: content,
        snippets: [], // Initialize empty
        isProcessed: false
      });
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
          errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
          try {
              errorMessage = JSON.stringify(error);
          } catch {
              errorMessage = String(error);
          }
      } else {
          errorMessage = String(error);
      }

      documents.push({
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        type: file.type,
        content: `Error reading file: ${errorMessage}`,
        snippets: [],
        isProcessed: true,
        error: errorMessage
      });
    }
  }
  return documents;
};
