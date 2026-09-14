const DATABASE = 'callweave-local-recordings';
const STORE = 'sessions';

function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listLocalRecordings() {
  const db = await database();
  const records = await new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return records.sort((left, right) => right.startedAt - left.startedAt);
}

export async function saveLocalRecording(recording) {
  const db = await database();
  await new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(recording);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
  db.close();
}
