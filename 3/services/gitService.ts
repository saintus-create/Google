
import { LegalDocument } from '../types';

// Types for libraries loaded via CDN
declare const LightningFS: any;
declare const git: any;

const FS_NAMESPACE = 'legal-matrix-fs';
const PROXY_URL = 'https://cors.isomorphic-git.org';

let fs: any;
let pfs: any;

// Initialize the virtual file system
const initFS = () => {
    if (!fs) {
        fs = new LightningFS(FS_NAMESPACE);
        pfs = fs.promises;
    }
    return { fs, pfs };
};

export interface GitConfig {
    repoUrl: string;
    token: string;
    username: string;
    email: string;
    branch?: string;
    corsProxy?: string;
}

export const cloneRepository = async (config: GitConfig): Promise<string> => {
    const { fs, pfs } = initFS();
    const dir = '/repo';

    try {
        // Clean existing directory if it exists to ensure fresh clone
        try {
            await pfs.readdir(dir);
            // If it exists, we might want to delete it or just pull. 
            // For simplicity in this "clone" action, we wipe it.
            // Note: recursive delete in lightning-fs can be tricky, 
            // so usually we rely on the user to "Clone" only once or clear data.
        } catch (e) {
            await pfs.mkdir(dir);
        }

        await git.clone({
            fs,
            http: git.http,
            dir,
            corsProxy: config.corsProxy || PROXY_URL,
            url: config.repoUrl,
            ref: config.branch || 'main',
            singleBranch: true,
            depth: 1,
            onAuth: () => ({ username: config.token }),
        });

        return "Repository cloned successfully.";
    } catch (e: any) {
        throw new Error(`Git Clone Failed: ${e.message}`);
    }
};

export const syncDocumentsToGit = async (documents: LegalDocument[], config: GitConfig, commitMessage: string): Promise<string> => {
    const { fs, pfs } = initFS();
    const dir = '/repo';

    try {
        // 1. Ensure repo exists (simple check)
        try {
            await pfs.readdir(dir);
        } catch {
            throw new Error("Repository not initialized. Please Clone first.");
        }

        // 2. Write Documents to Virtual FS
        // We structure them as individual JSON files in a 'documents' folder
        const docsDir = `${dir}/documents`;
        try { await pfs.mkdir(docsDir); } catch {}

        for (const doc of documents) {
            const filePath = `${docsDir}/${sanitizeFilename(doc.name)}.json`;
            const fileContent = JSON.stringify(doc, null, 2);
            await pfs.writeFile(filePath, fileContent, 'utf8');
        }

        // 3. Git Add
        await git.add({ fs, dir, filepath: '.' });

        // 4. Git Commit
        await git.commit({
            fs,
            dir,
            message: commitMessage || `Update legal matrix: ${new Date().toISOString()}`,
            author: {
                name: config.username,
                email: config.email,
            },
        });

        // 5. Git Push
        await git.push({
            fs,
            http: git.http,
            dir,
            url: config.repoUrl,
            corsProxy: config.corsProxy || PROXY_URL,
            onAuth: () => ({ username: config.token }),
        });

        return "Successfully pushed changes to remote.";

    } catch (e: any) {
        throw new Error(`Git Sync Failed: ${e.message}`);
    }
};

export const pullDocumentsFromGit = async (config: GitConfig): Promise<LegalDocument[]> => {
    const { fs, pfs } = initFS();
    const dir = '/repo';

    try {
        // 1. Pull changes
        await git.pull({
            fs,
            http: git.http,
            dir,
            url: config.repoUrl,
            corsProxy: config.corsProxy || PROXY_URL,
            singleBranch: true,
            author: {
                name: config.username,
                email: config.email,
            },
            onAuth: () => ({ username: config.token }),
        });

        // 2. Read from Virtual FS
        const docsDir = `${dir}/documents`;
        const files = await pfs.readdir(docsDir);
        const docs: LegalDocument[] = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                const content = await pfs.readFile(`${docsDir}/${file}`, 'utf8');
                try {
                    const parsed = JSON.parse(content);
                    // Basic validation
                    if (parsed.id && parsed.name) {
                        docs.push(parsed);
                    }
                } catch (err) {
                    console.warn(`Skipping corrupt file: ${file}`);
                }
            }
        }

        return docs;

    } catch (e: any) {
        throw new Error(`Git Pull Failed: ${e.message}`);
    }
};

const sanitizeFilename = (name: string) => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};
