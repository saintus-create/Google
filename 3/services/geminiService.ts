
import { Snippet, ChatMessage, GroundingSource } from '../types';

// CONFIGURATION
const GROQ_API_KEY = "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";
const MISTRAL_API_KEY = "0nOJ1EeKCYeyQptguQYJNOlMWPdPmFk9";
const CODESTRAL_API_KEY = "vzNn973kVxLJMmla9DlMxmtzFrWyr8tJ";

// Define the Swarm Cluster - 7 Cores
const MODELS = [
    { provider: 'GROQ', model: 'llama-3.3-70b-versatile', contextLimit: 100000 },
    { provider: 'GROQ', model: 'llama-3.1-8b-instant', contextLimit: 100000 },
    { provider: 'GROQ', model: 'openai/gpt-oss-20b', contextLimit: 65000 },
    { provider: 'GROQ', model: 'moonshotai/kimi-k2-instruct-0905', contextLimit: 200000 }, // Huge Context
    { provider: 'MISTRAL', model: 'mistral-small-latest', contextLimit: 30000 },
    { provider: 'CODESTRAL', model: 'codestral-latest', contextLimit: 32000 },
    { provider: 'GROQ', model: 'meta-llama/llama-4-maverick-17b-128e-instruct', contextLimit: 100000 } // Bonus Preview Model
];

let requestCounter = 0;

// Strict 8-Point Rubric
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

const SYSTEM_PROMPT = `
ROLE: Legal Data Surveyor & Research Clerk.
TASK: Deconstruct the document and EXTRACT verbatim snippets into the specific legal categories below.
OUTPUT FORMAT: Strict JSON only. No markdown. No commentary.

CATEGORIES (STRICT RUBRIC):
1. Statute + Citation
2. Doctrine
3. Literary/Scholarly Reference
4. Court/Judge/Legislative Opinions
5. Templates
6. Philosophy
7. Psychology
8. Case Law Reference

INSTRUCTIONS:
1. "VERBATIM TRANSFER": Scan the text. When you find content matching a category, COPY it exactly. Do not summarize.
2. "CITATION RECOVERY": If the text vaguely mentions a law/case (e.g., 'Rule 11' or 'Roe'), you MUST identify the specific authority and output the FULL official citation in 'legal_citation'.
3. "TOTALITY": Scan the entire provided text. A single document usually contains snippets for MULTIPLE categories. Extract them all.
4. "DATA ENTRY": If a category is not present, DO NOT create a snippet for it. Only output found data.
5. "NO HALLUCINATIONS": Do not invent categories. Do not cite "Note 1". Only cite real legal authorities.

JSON SCHEMA:
{
  "snippets": [
    {
      "headline": "Brief Title of Fact/Issue",
      "category": "One of the 8 categories above",
      "content": "Exact verbatim text from source...",
      "legal_citation": "Standard Citation (e.g. 384 U.S. 436) or null",
      "relevanceScore": "High" | "Medium" | "Low"
    }
  ]
}
`;

const callGroq = async (model: string, content: string, signal: AbortSignal) => {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: content }
            ],
            model: model,
            response_format: { type: "json_object" },
            temperature: 0.1
        }),
        signal
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Groq Error (${model}): ${err.error?.message || response.statusText}`);
    }
    return await response.json();
};

const callMistral = async (model: string, content: string, signal: AbortSignal) => {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${MISTRAL_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: content }
            ],
            model: model,
            response_format: { type: "json_object" },
            temperature: 0.1
        }),
        signal
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Mistral Error: ${err.message || response.statusText}`);
    }
    return await response.json();
};

const callCodestral = async (model: string, content: string, signal: AbortSignal) => {
    const response = await fetch("https://codestral.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${CODESTRAL_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: content }
            ],
            model: model,
            response_format: { type: "json_object" },
            temperature: 0.1
        }),
        signal
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Codestral Error: ${err.message || response.statusText}`);
    }
    return await response.json();
};

export const analyzeDocumentContent = async (content: string, docId: string, docName: string): Promise<{ snippets: Snippet[], groundingSources: GroundingSource[] }> => {
    
    // Select Model from Swarm (Round Robin)
    const workerIndex = requestCounter % MODELS.length;
    const worker = MODELS[workerIndex];
    requestCounter = (requestCounter + 1) % 1000; // Keep counter safe

    // Truncate based on specific model's capacity
    const safeContent = content.substring(0, worker.contextLimit); 
    const prompt = `DOCUMENT NAME: ${docName}\n\nCONTENT:\n${safeContent}`;

    console.log(`[SWARM] Assigning document ${docName} to Worker ${workerIndex + 1}: ${worker.provider} (${worker.model})`);

    // 60s Timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
        let data;
        if (worker.provider === 'GROQ') {
            data = await callGroq(worker.model, prompt, controller.signal);
        } else if (worker.provider === 'MISTRAL') {
            data = await callMistral(worker.model, prompt, controller.signal);
        } else if (worker.provider === 'CODESTRAL') {
            data = await callCodestral(worker.model, prompt, controller.signal);
        }
        
        clearTimeout(timeoutId);

        const textResponse = data.choices[0].message.content;
        const parsed = JSON.parse(textResponse);

        if (!parsed.snippets || !Array.isArray(parsed.snippets)) {
            return { snippets: [], groundingSources: [] };
        }

        const snippets: Snippet[] = parsed.snippets.map((s: any, index: number) => ({
            id: `${docId}-snip-${index}-${Date.now()}`,
            sourceDocId: docId,
            sourceDocName: docName,
            headline: s.headline || "Untitled Extraction",
            category: CATEGORIES.includes(s.category) ? s.category : "Uncategorized",
            content: s.content || "No content extracted",
            legalCitation: s.legal_citation || undefined,
            relevanceScore: ["High", "Medium", "Low"].includes(s.relevanceScore) ? s.relevanceScore : "Medium",
            status: 'pending' // Review workflow
        }));

        return { snippets, groundingSources: [] };

    } catch (error: any) {
        clearTimeout(timeoutId);
        console.warn(`[SWARM] Model ${worker.model} failed. Error: ${error.message}`);
        // The App queue retry logic will handle re-queueing this document
        // potentially picking up a different model next time due to rotation.
        throw error;
    }
};

export const sendMessageToChatbot = async (messages: ChatMessage[]): Promise<string> => {
    // Chatbot always uses the fastest model for responsiveness
    const fastModel = 'llama-3.1-8b-instant';
    
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: [
                    { 
                        role: "system", 
                        content: "You are an expert Defense Attorney Assistant. Be precise, cite legal precedents where possible, and identify weaknesses in prosecution arguments." 
                    },
                    ...messages
                ],
                model: fastModel,
                temperature: 0.3
            })
        });

        if (!response.ok) throw new Error("Chat Error");
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (e) {
        console.error(e);
        return "I am having trouble connecting to the legal network right now.";
    }
};
