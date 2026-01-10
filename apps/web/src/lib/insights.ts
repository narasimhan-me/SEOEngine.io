/**
 * [INSIGHTS-1] Project Insights Types
 *
 * Read-only derived insights dashboard types.
 * Trust invariant: This data is computed from existing records only,
 * never triggers AI or mutates state.
 */

export interface ProjectInsightsResponse {
  projectId: string;
  generatedAt: string;

  /** Time window for all trend/metric data */
  window: {
    days: number;
    from: string;
    to: string;
  };

  /** Overview card data */
  overview: {
    /** DEO Score improvements */
    improved: {
      deoScore: {
        current: number;
        previous: number;
        delta: number;
        trend: 'up' | 'down' | 'flat';
      };
      /** Component deltas from v2 metadata */
      componentDeltas: Array<{
        componentId: string;
        label: string;
        current: number;
        previous: number;
        delta: number;
        trend: 'up' | 'down' | 'flat';
      }>;
    };

    /** AI efficiency and quota savings */
    saved: {
      aiRunsUsed: number;
      aiRunsAvoidedViaReuse: number;
      reuseRatePercent: number;
      quota: {
        limit: number | null;
        used: number;
        remaining: number | null;
        usedPercent: number | null;
      };
      trust: {
        applyAiRuns: number;
        invariantMessage: string;
      };
    };

    /** Issue resolution summary */
    resolved: {
      actionsCount: number;
      why: string;
    };

    /** Recommended next opportunity */
    next: {
      title: string;
      why: string;
      href: string;
    } | null;
  };

  /** DEO Progress section */
  progress: {
    /** Daily DEO score trend */
    deoScoreTrend: Array<{
      date: string;
      score: number;
    }>;

    /** Daily fixes applied trend */
    fixesAppliedTrend: Array<{
      date: string;
      count: number;
      pillar?: string;
    }>;

    /** Current open issues snapshot */
    openIssuesNow: {
      critical: number;
      warning: number;
      info: number;
      total: number;
    };
  };

  /** Issue Resolution section */
  issueResolution: {
    /** Issues by pillar */
    byPillar: Array<{
      pillarId: string;
      label: string;
      open: number;
      resolved: number;
      total: number;
    }>;

    /** Average time to fix (hours) */
    avgTimeToFixHours: number | null;

    /** Recently resolved issues */
    topRecent: Array<{
      issueId: string;
      title: string;
      resolvedAt: string;
      pillarId: string;
    }>;

    /** High-impact open issues */
    openHighImpact: Array<{
      issueId: string;
      title: string;
      severity: 'critical' | 'warning' | 'info';
      pillarId: string;
      affectedCount: number;
    }>;
  };

  /** Opportunities section */
  opportunities: Array<{
    id: string;
    title: string;
    why: string;
    pillarId: string;
    estimatedImpact: 'high' | 'medium' | 'low';
    href: string;
    fixType: 'automation' | 'manual';
  }>;

  /** [GEO-INSIGHTS-2] GEO Insights section */
  geoInsights: {
    overview: {
      productsAnswerReadyPercent: number;
      productsAnswerReadyCount: number;
      productsTotal: number;
      answersTotal: number;
      answersMultiIntentCount: number;
      reuseRatePercent: number;
      confidenceDistribution: {
        high: number;
        medium: number;
        low: number;
      };
      trustTrajectory: {
        improvedProducts: number;
        improvedEvents: number;
        windowDays: number;
        why: string;
      };
      whyThisMatters: string;
    };

    coverage: {
      byIntent: Array<{
        intentType: string;
        label: string;
        productsCovered: number;
        productsTotal: number;
        coveragePercent: number;
      }>;
      /** Intent types with zero product coverage */
      gaps: string[];
      whyThisMatters: string;
    };

    reuse: {
      topReusedAnswers: Array<{
        productId: string;
        productTitle: string;
        answerBlockId: string;
        questionId: string;
        questionText: string;
        mappedIntents: string[];
        potentialIntents: string[];
        why: string;
        href: string;
      }>;
      couldBeReusedButArent: Array<{
        productId: string;
        productTitle: string;
        answerBlockId: string;
        questionId: string;
        questionText: string;
        potentialIntents: string[];
        blockedBySignals: string[];
        why: string;
        href: string;
      }>;
      whyThisMatters: string;
    };

    trustSignals: {
      topBlockers: Array<{
        issueType: string;
        label: string;
        affectedProducts: number;
      }>;
      avgTimeToImproveHours: number | null;
      mostImproved: Array<{
        productId: string;
        productTitle: string;
        issuesResolvedCount: number;
        href: string;
      }>;
      whyThisMatters: string;
    };

    opportunities: Array<{
      id: string;
      title: string;
      why: string;
      estimatedImpact: 'high' | 'medium' | 'low';
      href: string;
      category: 'coverage' | 'reuse' | 'trust';
    }>;
  };
}
