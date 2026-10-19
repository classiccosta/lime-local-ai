import { openDB } from 'idb';

const DB_NAME = 'ai-chat';
const STORE = 'sessions';
const OPEN_TIMEOUT_MS = 5000;

let dbPromise = null;
let connection = null;

function connect() {
  let timer;

  const opening = openDB(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('updatedAt', 'updatedAt');
    },
    blocking() {
      connection?.close();
      connection = null;
      dbPromise = null;
    },
    terminated() {
      connection = null;
      dbPromise = null;
    },
  }).then((db) => {
    connection = db;
    return db;
  });

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Storage did not open — another tab may be blocking it.')),
      OPEN_TIMEOUT_MS,
    );
  });

  return Promise.race([opening, timeout])
    .finally(() => clearTimeout(timer))
    .catch((error) => {
      dbPromise = null;
      throw error;
    });
}

function getDb() {
  if (!dbPromise) dbPromise = connect();
  return dbPromise;
}

export async function listSessions() {
  const db = await getDb();
  return (await db.getAllFromIndex(STORE, 'updatedAt')).reverse();
}

export async function getSession(id) {
  const db = await getDb();
  return db.get(STORE, id);
}

export async function saveSession({ id, name, messages }) {
  const db = await getDb();
  const record = { name, messages, updatedAt: Date.now() };
  if (id != null) record.id = id;
  return db.put(STORE, record);
}

export async function deleteSession(id) {
  const db = await getDb();
  return db.delete(STORE, id);
}
