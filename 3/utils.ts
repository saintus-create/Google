
export const downloadJson = (data: any, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadCsv = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
      console.warn("No data to export");
      return;
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  const csvRows = [
      headers.join(','),
      ...data.map(row => {
          return headers.map(fieldName => {
              const val = (row as any)[fieldName];
              // Handle quotes and commas by escaping
              const escaped = String(val === undefined || val === null ? '' : val).replace(/"/g, '""');
              return `"${escaped}"`;
          }).join(',');
      })
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadPdf = async (data: any[], filename: string) => {
    // Dynamically load jsPDF from CDN if not present
    if (!(window as any).jspdf) {
        try {
            await new Promise<void>((resolve, reject) => {
                const script = document.createElement('script');
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
                script.onload = () => resolve();
                script.onerror = () => reject(new Error("Failed to load jsPDF"));
                document.head.appendChild(script);
            });
        } catch (e) {
            console.error("PDF Generation failed:", e);
            alert("Could not load PDF generation library.");
            return;
        }
    }

    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text("Legal Case Report", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    doc.setTextColor(0);
    
    let y = 35;
    const lineHeight = 6;
    const pageHeight = doc.internal.pageSize.height;
    
    data.forEach((item: any, index: number) => {
        // Check for page break availability
        if (y > pageHeight - 40) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const title = `${index + 1}. ${item.headline || 'Untitled Snippet'}`;
        doc.text(title, 14, y);
        y += lineHeight + 2;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        if (item.category) {
            doc.text(`Category: ${item.category}`, 14, y);
            y += lineHeight;
        }
        
        if (item.legalCitation) {
            doc.text(`Citation: ${item.legalCitation}`, 14, y);
            y += lineHeight;
        }

        y += 2;

        // Content wrapping
        const contentText = item.content || '';
        const splitContent = doc.splitTextToSize(contentText, 180);
        
        // Check if content fits on page
        if (y + (splitContent.length * lineHeight) > pageHeight - 20) {
             doc.addPage();
             y = 20;
        }

        doc.text(splitContent, 14, y);
        y += splitContent.length * lineHeight + 6;
        
        // Separator
        doc.setDrawColor(220, 220, 220);
        doc.line(14, y, 196, y);
        y += 10;
    });

    doc.save(filename);
};

export const stripHtml = (html: string): string => {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  } catch (e) {
    console.error("Could not parse HTML", e);
    return "";
  }
};
