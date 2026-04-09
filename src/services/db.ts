import { openDB } from 'idb';

const DB_NAME = 'nexus-chat-db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('statuses', { keyPath: 'id' });
      db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
    },
  });
};

export const saveStatus = async (status: any) => {
  const db = await initDB();
  await db.put('statuses', status);
};

export const getStatuses = async () => {
  const db = await initDB();
  return await db.getAll('statuses');
};

export const queueAction = async (action: any) => {
  const db = await initDB();
  await db.add('outbox', action);
};

export const getOutbox = async () => {
  const db = await initDB();
  return await db.getAll('outbox');
};

export const clearOutbox = async (id: number) => {
  const db = await initDB();
  await db.delete('outbox', id);
};
