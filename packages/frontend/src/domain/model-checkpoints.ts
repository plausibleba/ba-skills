/**
 * model-checkpoints.ts — D-118 Phase 1: Pre-Enrichment Checkpointing
 *
 * Automatic checkpoints in IndexedDB before each enrichment runs.
 * Diagnostics do NOT trigger checkpoints (they don't modify the scaffold).
 *
 * Storage: IndexedDB database "vcc-model-versions" with two object stores:
 *   - checkpoints: serialised scaffold + metadata
 *   - pins: user-pinned checkpoint IDs (exempt from auto-pruning)
 *
 * @see docs/DECISIONS.md D-118
 */

import { computeScaffoldHash } from "./scaffold-hash";
import type { ReadinessState } from "./enrichment-taxonomy";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Checkpoint {
  /** Unique ID: scaffoldHash + sequence number */
  id: string;
  /** Content hash of the scaffold at this point */
  scaffoldHash: string;
  /** Monotonic sequence number for ordering */
  sequence: number;
  /** ISO timestamp */
  createdAt: string;
  /** Which enrichment was about to run */
  beforeOperation: string;
  /** Model readiness state at this point */
  readiness: ReadinessState | null;
  /** Serialised scaffold JSON (stored as string to minimise IDB overhead) */
  scaffoldJson: string;
  /** Optional user-supplied label */
  label?: string;
  /** Whether this checkpoint is pinned (exempt from auto-pruning) */
  pinned: boolean;
  /** Branch this checkpoint belongs to (default: "main") */
  branch: string;
}

export interface CheckpointSummary {
  id: string;
  scaffoldHash: string;
  sequence: number;
  createdAt: string;
  beforeOperation: string;
  readiness: ReadinessState | null;
  label?: string;
  pinned: boolean;
  branch: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DB_NAME = "vcc-model-versions";
const DB_VERSION = 1;
const CHECKPOINT_STORE = "checkpoints";
const MAX_AUTO_CHECKPOINTS = 50; // per branch, excludes pinned

// ─── IndexedDB Setup ─────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CHECKPOINT_STORE)) {
        const store = db.createObjectStore(CHECKPOINT_STORE, { keyPath: "id" });
        store.createIndex("by-sequence", "sequence", { unique: true });
        store.createIndex("by-branch", "branch", { unique: false });
        store.createIndex("by-hash", "scaffoldHash", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Sequence Counter ────────────────────────────────────────────────────────

let _nextSequence: number | null = null;

async function getNextSequence(): Promise<number> {
  if (_nextSequence !== null) return _nextSequence++;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKPOINT_STORE, "readonly");
    const store = tx.objectStore(CHECKPOINT_STORE);
    const index = store.index("by-sequence");
    const req = index.openCursor(null, "prev"); // highest sequence first
    req.onsuccess = () => {
      const cursor = req.result;
      _nextSequence = cursor ? (cursor.value as Checkpoint).sequence + 2 : 1;
      resolve(_nextSequence - 1);
    };
    req.onerror = () => reject(req.error);
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Create a checkpoint before an enrichment runs.
 * Returns the checkpoint ID.
 */
export async function createCheckpoint(
  scaffold: any,
  beforeOperation: string,
  readiness: ReadinessState | null,
  branch = "main"
): Promise<string> {
  const scaffoldHash = computeScaffoldHash(scaffold);
  const sequence = await getNextSequence();
  const id = `cp_${scaffoldHash}_${sequence}`;

  const checkpoint: Checkpoint = {
    id,
    scaffoldHash,
    sequence,
    createdAt: new Date().toISOString(),
    beforeOperation,
    readiness,
    scaffoldJson: JSON.stringify(scaffold),
    pinned: false,
    branch,
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKPOINT_STORE, "readwrite");
    const store = tx.objectStore(CHECKPOINT_STORE);
    const req = store.put(checkpoint);
    req.onsuccess = () => {
      // Auto-prune after insert
      pruneOldCheckpoints(branch).catch(console.error);
      resolve(id);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * List all checkpoints for a branch, newest first.
 * Returns summaries (without the full scaffold JSON).
 */
export async function listCheckpoints(
  branch = "main"
): Promise<CheckpointSummary[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKPOINT_STORE, "readonly");
    const store = tx.objectStore(CHECKPOINT_STORE);
    const index = store.index("by-branch");
    const req = index.getAll(branch);
    req.onsuccess = () => {
      const checkpoints = (req.result as Checkpoint[])
        .sort((a, b) => b.sequence - a.sequence)
        .map(({ scaffoldJson: _, ...summary }) => summary);
      resolve(checkpoints);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Restore a scaffold from a checkpoint.
 * Returns the parsed scaffold JSON.
 */
export async function restoreCheckpoint(checkpointId: string): Promise<any> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKPOINT_STORE, "readonly");
    const store = tx.objectStore(CHECKPOINT_STORE);
    const req = store.get(checkpointId);
    req.onsuccess = () => {
      const cp = req.result as Checkpoint | undefined;
      if (!cp) {
        reject(new Error(`Checkpoint not found: ${checkpointId}`));
        return;
      }
      resolve(JSON.parse(cp.scaffoldJson));
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Pin or unpin a checkpoint. Pinned checkpoints are exempt from auto-pruning.
 */
export async function togglePin(
  checkpointId: string,
  pinned: boolean
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKPOINT_STORE, "readwrite");
    const store = tx.objectStore(CHECKPOINT_STORE);
    const req = store.get(checkpointId);
    req.onsuccess = () => {
      const cp = req.result as Checkpoint | undefined;
      if (!cp) {
        reject(new Error(`Checkpoint not found: ${checkpointId}`));
        return;
      }
      cp.pinned = pinned;
      store.put(cp);
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Label a checkpoint with a user-supplied name.
 */
export async function labelCheckpoint(
  checkpointId: string,
  label: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKPOINT_STORE, "readwrite");
    const store = tx.objectStore(CHECKPOINT_STORE);
    const req = store.get(checkpointId);
    req.onsuccess = () => {
      const cp = req.result as Checkpoint | undefined;
      if (!cp) {
        reject(new Error(`Checkpoint not found: ${checkpointId}`));
        return;
      }
      cp.label = label;
      store.put(cp);
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Auto-prune old unpinned checkpoints beyond the rolling window.
 */
async function pruneOldCheckpoints(branch: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKPOINT_STORE, "readwrite");
    const store = tx.objectStore(CHECKPOINT_STORE);
    const index = store.index("by-branch");
    const req = index.getAll(branch);
    req.onsuccess = () => {
      const all = (req.result as Checkpoint[]).sort(
        (a, b) => b.sequence - a.sequence
      );
      const unpinned = all.filter((cp) => !cp.pinned);
      if (unpinned.length <= MAX_AUTO_CHECKPOINTS) {
        resolve();
        return;
      }
      // Delete oldest unpinned beyond the window
      const toDelete = unpinned.slice(MAX_AUTO_CHECKPOINTS);
      for (const cp of toDelete) {
        store.delete(cp.id);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete all checkpoints (e.g., when user resets project). Use with caution.
 */
export async function clearAllCheckpoints(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKPOINT_STORE, "readwrite");
    const store = tx.objectStore(CHECKPOINT_STORE);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
