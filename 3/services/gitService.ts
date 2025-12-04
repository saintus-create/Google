
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

// Helper function to recursively delete directory
const deleteDir = async (pfs: any, dirPath: string) => {
    try {
        const entries = await pfs.readdir(dirPath);
        for (const entry of entries) {
            const fullPath = `${dirPath}/${entry}`;
            try {
                const stat = await pfs.stat(fullPath);
                if (stat.isDirectory()) {
                    await deleteDir(pfs, fullPath);
                } else {
                    await pfs.unlink(fullPath);
                }
            } catch (e) {
                console.warn(`Failed to delete ${fullPath}:`, e);
            }
        }
        await pfs.rmdir(dirPath);
    } catch (e) {
        console.warn(`Failed to delete directory ${dirPath}:`, e);
    }
};

export const cloneRepository = async (config: GitConfig): Promise<string> => {
    if (!config.repoUrl || !config.token) {
        throw new Error("Repository URL and token are required.");
    }

    const { fs, pfs } = initFS();
    const dir = '/repo';

    try {
        // Clean existing directory if it exists to ensure fresh clone
        try {
            await pfs.stat(dir);
            await deleteDir(pfs, dir);
        } catch (e) {
            // Directory doesn't exist, which is fine
        }

        await pfs.mkdir(dir);

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
    if (!config.repoUrl || !config.token || !config.username || !config.email) {
        throw new Error("Complete Git configuration required for push.");
    }

    const { fs, pfs } = initFS();
    const dir = '/repo';

    try {
        // 1. Ensure repo exists (simple check)
        try {
            await pfs.stat(dir);
        } catch {
            throw new Error("Repository not initialized. Please Clone first.");
        }

        // 2. Write Documents to Virtual FS
        // We structure them as individual JSON files in a 'documents' folder
        const docsDir = `${dir}/documents`;
        try { 
            await pfs.mkdir(docsDir); 
        } catch {
            // Directory already exists, that's fine
        }

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
            remote: 'origin',
            ref: config.branch || 'main',
            corsProxy: config.corsProxy || PROXY_URL,
            onAuth: () => ({ username: config.token }),
        });

        return "Successfully pushed changes to remote.";

    } catch (e: any) {
        throw new Error(`Git Sync Failed: ${e.message}`);
    }
};

export const pullDocumentsFromGit = async (config: GitConfig): Promise<LegalDocument[]> => {
    if (!config.repoUrl || !config.token || !config.username || !config.email) {
        throw new Error("Complete Git configuration required for pull.");
    }

    const { fs, pfs } = initFS();
    const dir = '/repo';

    try {
        // 1. Ensure repo exists
        try {
            await pfs.stat(dir);
        } catch {
            throw new Error("Repository not initialized. Please Clone first.");
        }

        // 2. Fetch changes from remote
        await git.fetch({
            fs,
            http: git.http,
            dir,
            corsProxy: config.corsProxy || PROXY_URL,
            ref: config.branch || 'main',
            singleBranch: true,
            onAuth: () => ({ username: config.token }),
        });

        // 3. Merge fetched changes
        await git.merge({
            fs,
            dir,
            ours: config.branch || 'main',
            theirs: `origin/${config.branch || 'main'}`,
            author: {
                name: config.username,
                email: config.email,
            },
        });

        // 4. Read from Virtual FS
        const docsDir = `${dir}/documents`;
        let files: string[] = [];
        
        try {
            files = await pfs.readdir(docsDir);
        } catch (e) {
            console.warn("No documents folder found in repository");
            return [];
        }

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
