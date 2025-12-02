// packages/shared/src/deo-jobs.ts
// Payload for DEO Score recompute jobs on deo_score_queue (Phase 2.1).

export type DeoScoreJobPayload = {
  projectId: string;
  triggeredByUserId?: string | null;
  reason?: string | null; // manual | scheduled | after_import
};

export type DeoScoreJobResult = {
  projectId: string;
  snapshotId: string;
};
