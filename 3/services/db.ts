
import { LegalDocument } from '../types';

const DB_NAME = 'LegalDocDB';
const DB_VERSION = 2; // Bump version for safety, though schema is same generic object store
const STORE_NAME = 'documents';

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject('Error opening database.');
    };

    request.onsuccess = () => {
      db = request.result;
      
      db.onclose = () => {
        console.warn('Database connection closed unexpectedly. Resetting connection.');
        db = null;
      };
      
      db.onversionchange = () => {
        console.warn('Database version changed. Closing connection.');
        db?.close();
        db = null;
      };

      resolve(db);
    };

    request.onupgradeneeded = () => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const timeoutPromise = <T>(promise: Promise<T>, ms: number = 10000): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Database operation timed out")), ms);
        promise.then(
            (res) => { clearTimeout(timer); resolve(res); },
            (err) => { clearTimeout(timer); reject(err); }
        );
    });
};

export const addOrUpdateDocument = async (doc: LegalDocument): Promise<void> => {
  return timeoutPromise((async () => {
      try {
          const db = await openDB();
          return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.put(doc);
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => {
              console.error('Transaction error:', transaction.error);
              reject('Error saving document.');
            };
          });
      } catch (e) {
          db = null;
          throw e;
      }
  })());
};

export const getAllDocuments = async (): Promise<LegalDocument[]> => {
  return timeoutPromise((async () => {
      try {
          const db = await openDB();
          return new Promise<LegalDocument[]>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
        
            request.onsuccess = () => {
              resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('Get all request error:', request.error);
                reject('Error fetching documents.');
            };
          });
      } catch (e) {
          db = null;
          throw e;
      }
  })());
};

export const deleteDocument = async (id: string): Promise<void> => {
  return timeoutPromise((async () => {
      try {
          const db = await openDB();
          return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.delete(id);
        
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => {
              console.error('Transaction error:', transaction.error);
              reject('Error deleting document.');
            };
          });
      } catch (e) {
          db = null;
          throw e;
      }
  })());
};

export const clearAllDocuments = async (): Promise<void> => {
  return timeoutPromise((async () => {
      try {
          const db = await openDB();
          return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.clear();
        
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => {
              console.error('Transaction error:', transaction.error);
              reject('Error clearing documents.');
            };
          });
      } catch (e) {
          db = null;
          throw e;
      }
  })());
};
