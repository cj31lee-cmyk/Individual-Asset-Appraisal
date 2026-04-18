import type { CaseData } from "./types";

const KEY = "npl-analysis-history-v2";

export interface Snapshot {
  id: string;
  label: string;
  savedAt: string;
  cases: CaseData[]; // 다건등록 스냅샷
}

interface CurrentSlot {
  savedAt: string;
  detailCases?: CaseData[];
  bulkCases?: CaseData[];
  // legacy
  cases?: CaseData[];
}

interface Store {
  current: CurrentSlot | null;
  history: Snapshot[];
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { current: null, history: [] };
    return JSON.parse(raw) as Store;
  } catch {
    return { current: null, history: [] };
  }
}

function write(s: Store) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function loadCurrent(): { detailCases: CaseData[] | null; bulkCases: CaseData[] | null } {
  const s = read();
  if (!s.current) return { detailCases: null, bulkCases: null };
  // Backward compat: legacy `cases` becomes bulkCases
  const detailCases = s.current.detailCases ?? null;
  const bulkCases = s.current.bulkCases ?? s.current.cases ?? null;
  return { detailCases, bulkCases };
}

export function saveCurrent(detailCases: CaseData[], bulkCases: CaseData[]) {
  const s = read();
  s.current = {
    savedAt: new Date().toISOString(),
    detailCases,
    bulkCases,
  };
  write(s);
}

export function listSnapshots(): Snapshot[] {
  return read().history.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveSnapshot(label: string, cases: CaseData[]): Snapshot {
  const s = read();
  const snap: Snapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    savedAt: new Date().toISOString(),
    cases: JSON.parse(JSON.stringify(cases)),
  };
  s.history.push(snap);
  write(s);
  return snap;
}

export function deleteSnapshot(id: string) {
  const s = read();
  s.history = s.history.filter((h) => h.id !== id);
  write(s);
}

export function loadSnapshot(id: string): CaseData[] | null {
  const snap = read().history.find((h) => h.id === id);
  return snap ? snap.cases : null;
}
