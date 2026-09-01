export const mockTranscripts = {
  baseline:
    "Indexing works by creating a separate data structure, usually a B-tree, that stores column values alongside pointers to the actual rows. This lets the database jump straight to matching rows instead of scanning the whole table, which turns an O(n) lookup into roughly O(log n).",
  pressure:
    "Okay so, um, indexing can hurt performance because, like, every time you insert or update a row the database also has to, uh, update the index, so writes get slower, and also, um, if you index a column that doesn't get queried much you're just wasting storage and, uh, memory basically for no reason.",
  retry:
    "Indexes speed up reads but slow down writes, since every insert or update also has to update the index structure. Definition: an index is extra bookkeeping for faster lookups. Reason: that bookkeeping costs time on every write. Example: a heavily-indexed logging table can slow ingestion significantly.",
} as const;

export type TranscriptStage = keyof typeof mockTranscripts;
