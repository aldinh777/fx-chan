export type BaseTransaction = {
  type: "deposit" | "withdraw";
  coin: string;
  amount: number;
  price: number;
  time: string;
  fee: number;
  vault: string;
  note: string;
};

export type SwapTransaction = {
  from: { coin: string; amount: number; vault: string };
  to: { coin: string; amount: number; vault: string };
  rate: number;
  time: string;
  protocol: string;
  gas: { coin: string; amount: number; vault: string };
  fee: number;
  cut: number;
  note: string;
};

export type TransactionData = {
  transfers: BaseTransaction[];
  swaps: SwapTransaction[];
};

const databaseName = "fx-chan";
const databaseVersion = 1;
const storeName = "transactions";
const recordKey = "default";

export const createEmptyTransactionData = (): TransactionData => ({
  transfers: [],
  swaps: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

const normalizeBaseTransaction = (value: unknown): BaseTransaction => {
  const record = isRecord(value) ? value : {};

  return {
    type: record.type === "withdraw" ? "withdraw" : "deposit",
    coin: asString(record.coin),
    amount: asNumber(record.amount),
    price: asNumber(record.price),
    time: asString(record.time),
    fee: asNumber(record.fee),
    vault: asString(record.vault),
    note: asString(record.note),
  };
};

const normalizeSwapTransaction = (value: unknown): SwapTransaction => {
  const record = isRecord(value) ? value : {};
  const from = isRecord(record.from) ? record.from : {};
  const to = isRecord(record.to) ? record.to : {};
  const gas = isRecord(record.gas) ? record.gas : {};

  return {
    from: {
      coin: asString(from.coin),
      amount: asNumber(from.amount),
      vault: asString(from.vault),
    },
    to: {
      coin: asString(to.coin),
      amount: asNumber(to.amount),
      vault: asString(to.vault),
    },
    rate: asNumber(record.rate),
    time: asString(record.time),
    protocol: asString(record.protocol),
    gas: {
      coin: asString(gas.coin),
      amount: asNumber(gas.amount),
      vault: asString(gas.vault),
    },
    fee: asNumber(record.fee),
    cut: asNumber(record.cut),
    note: asString(record.note),
  };
};

export const normalizeTransactionData = (value: unknown): TransactionData => {
  const record = isRecord(value) ? value : {};

  return {
    transfers: Array.isArray(record.transfers)
      ? record.transfers.map(normalizeBaseTransaction)
      : [],
    swaps: Array.isArray(record.swaps)
      ? record.swaps.map(normalizeSwapTransaction)
      : [],
  };
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open transaction database."));
  });

const readRecord = async (): Promise<unknown> => {
  const db = await openDatabase();

  try {
    return await new Promise<unknown>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(recordKey);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Failed to read transactions."));
    });
  } finally {
    db.close();
  }
};

const writeRecord = async (data: TransactionData): Promise<void> => {
  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(normalizeTransactionData(data), recordKey);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Failed to save transactions."));
      transaction.onerror = () => reject(transaction.error ?? new Error("Failed to save transactions."));
    });
  } finally {
    db.close();
  }
};

export async function loadTransactionData(): Promise<TransactionData> {
  try {
    const stored = await readRecord();

    if (!stored) {
      return createEmptyTransactionData();
    }

    return normalizeTransactionData(stored);
  } catch {
    return createEmptyTransactionData();
  }
}

export async function saveTransactionData(data: TransactionData): Promise<void> {
  try {
    await writeRecord(data);
  } catch {
    // Ignore persistence failures so the UI remains usable offline or when IndexedDB is blocked.
  }
}

export async function readTransactionJson(file: File): Promise<TransactionData> {
  const text = await file.text();

  try {
    return normalizeTransactionData(JSON.parse(text));
  } catch {
    return createEmptyTransactionData();
  }
}

export function serializeTransactionJson(data: TransactionData): string {
  return JSON.stringify(normalizeTransactionData(data), null, 2);
}
