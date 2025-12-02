export type DeoScoreBreakdown = {
    overall: number;
    content?: number | null;
    entities?: number | null;
    technical?: number | null;
    visibility?: number | null;
};
export type DeoScoreSnapshot = {
    id: string;
    projectId: string;
    version: string;
    computedAt: string;
    breakdown: DeoScoreBreakdown;
    metadata?: Record<string, unknown>;
};
export type DeoScoreLatestResponse = {
    projectId: string;
    latestScore: DeoScoreBreakdown | null;
    latestSnapshot: DeoScoreSnapshot | null;
};
