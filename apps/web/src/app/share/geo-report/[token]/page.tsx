'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { publicApi, type GeoReportPublicShareViewResponse } from '@/lib/api';

/**
 * [GEO-EXPORT-1] Public GEO Report Share View
 * [ENTERPRISE-GEO-1] Now supports passcode-protected links
 *
 * Public page for viewing shared GEO reports.
 * No authentication required - uses share token for access.
 *
 * Decision Locks:
 * - "Attribution readiness" instead of "citation confidence"
 * - "Answer engines" instead of specific vendor names
 * - Includes disclaimer about internal readiness signals
 */
export default function PublicGeoReportPage() {
  const params = useParams();
  const shareToken = params.token as string;

  const [loading, setLoading] = useState(true);
  const [viewData, setViewData] = useState<GeoReportPublicShareViewResponse | null>(null);

  // [ENTERPRISE-GEO-1] Passcode state
  const [passcode, setPasscode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [passcodeError, setPasscodeError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await publicApi.getGeoReportShareView(shareToken);
        setViewData(data);
      } catch (err) {
        console.error('Error fetching share view:', err);
        setViewData({ status: 'not_found' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [shareToken]);

  // [ENTERPRISE-GEO-1] Handle passcode verification
  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setPasscodeError('Please enter a passcode');
      return;
    }

    try {
      setVerifying(true);
      setPasscodeError('');
      const data = await publicApi.verifyAndGetGeoReportShareView(shareToken, passcode.trim());
      setViewData(data);
      if (data.status === 'passcode_invalid') {
        setPasscodeError('Invalid passcode. Please try again.');
      }
    } catch (err) {
      console.error('Error verifying passcode:', err);
      setPasscodeError('Failed to verify passcode');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading report...</div>
      </div>
    );
  }

  if (!viewData || viewData.status === 'not_found') {
    return <ErrorState type="not_found" />;
  }

  if (viewData.status === 'expired') {
    return <ErrorState type="expired" />;
  }

  if (viewData.status === 'revoked') {
    return <ErrorState type="revoked" />;
  }

  // [ENTERPRISE-GEO-1] Handle passcode-protected links
  if (viewData.status === 'passcode_required' || viewData.status === 'passcode_invalid') {
    return (
      <PasscodeForm
        passcodeLast4={viewData.passcodeLast4}
        passcode={passcode}
        setPasscode={setPasscode}
        onSubmit={handlePasscodeSubmit}
        verifying={verifying}
        error={passcodeError}
      />
    );
  }

  const report = viewData.report!;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* [DEO-UX-REFRESH-1] Header with EngineO.ai branding + share badges */}
      <div className="bg-white border-b border-gray-200 print:border-b-0">
        <div className="mx-auto max-w-5xl px-6 py-4 print:px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* [DEO-UX-REFRESH-1] EngineO.ai Logo/Wordmark */}
              <div className="flex items-center gap-2">
                <svg
                  className="h-6 w-6 text-blue-600"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span className="text-lg font-bold text-gray-900">EngineO.ai</span>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  Shared Report
                </span>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  Read-only
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {viewData.expiresAt && (
                <span className="print:hidden">Expires: {new Date(viewData.expiresAt).toLocaleDateString()}</span>
              )}
              <span className="hidden print:inline text-xs text-gray-400">
                Generated: {viewData.generatedAt ? new Date(viewData.generatedAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="mx-auto max-w-5xl px-6 py-8 print:px-4 print:py-4">
        <div className="bg-white rounded-lg shadow-sm print:shadow-none print:rounded-none">
          {/* Report Header */}
          <div className="border-b border-gray-200 px-8 py-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">GEO Readiness Report</h1>
                <p className="mt-1 text-gray-600">{report.projectName}</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                {viewData.generatedAt && (
                  <div>Generated: {new Date(viewData.generatedAt).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          </div>

          {/* Overview Section */}
          <div className="border-b border-gray-200 px-8 py-6 print:px-4 print:break-inside-avoid">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-md border border-gray-200 p-4 print:break-inside-avoid">
                <div className="text-sm text-gray-500">Answer Ready</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {report.overview.productsAnswerReadyPercent}%
                </div>
                <div className="text-xs text-gray-500">
                  {report.overview.productsAnswerReadyCount} of {report.overview.productsTotal} products
                </div>
              </div>
              <div className="rounded-md border border-gray-200 p-4 print:break-inside-avoid">
                <div className="text-sm text-gray-500">Total Answers</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {report.overview.answersTotal}
                </div>
              </div>
              <div className="rounded-md border border-gray-200 p-4 print:break-inside-avoid">
                <div className="text-sm text-gray-500">Reuse Rate</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {report.overview.reuseRatePercent}%
                </div>
              </div>
              <div className="rounded-md border border-gray-200 p-4 print:break-inside-avoid">
                <div className="text-sm text-gray-500">Attribution Readiness</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded-full bg-green-500"></span>
                    <span className="text-sm">{report.overview.confidenceDistribution.high}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded-full bg-yellow-500"></span>
                    <span className="text-sm">{report.overview.confidenceDistribution.medium}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded-full bg-red-500"></span>
                    <span className="text-sm">{report.overview.confidenceDistribution.low}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Intent Coverage */}
          <div className="border-b border-gray-200 px-8 py-6 print:px-4 print:break-inside-avoid">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Intent Coverage</h2>
            <div className="space-y-3">
              {report.coverage.byIntent.map((intent) => (
                <div key={intent.intentType} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{intent.label}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {intent.productsCovered}/{intent.productsTotal} products
                    </span>
                    <span className="text-xs text-gray-500">{intent.coveragePercent}%</span>
                  </div>
                </div>
              ))}
            </div>
            {report.coverage.gaps.length > 0 && (
              <div className="mt-4 rounded-md bg-amber-50 p-3">
                <p className="text-sm text-amber-800">
                  <strong>Coverage gaps:</strong> {report.coverage.gaps.map((g) => g.replace(/_/g, ' ')).join(', ')}
                </p>
              </div>
            )}
            <p className="mt-3 text-sm text-gray-600">{report.coverage.summary}</p>
          </div>

          {/* Trust Signals */}
          {report.trustSignals.topBlockers.length > 0 && (
            <div className="border-b border-gray-200 px-8 py-6 print:px-4 print:break-inside-avoid">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Trust Signals</h2>
              <div className="space-y-2">
                {report.trustSignals.topBlockers.map((blocker, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{blocker.label}</span>
                    <span className="text-gray-500">{blocker.affectedProducts} products</span>
                  </div>
                ))}
              </div>
              {report.trustSignals.avgTimeToImproveHours !== null && (
                <p className="mt-3 text-sm text-gray-600">
                  Avg. time to improve: {report.trustSignals.avgTimeToImproveHours}h
                </p>
              )}
              <p className="mt-3 text-sm text-gray-600">{report.trustSignals.summary}</p>
            </div>
          )}

          {/* Opportunities */}
          {report.opportunities.length > 0 && (
            <div className="border-b border-gray-200 px-8 py-6 print:px-4 print:break-inside-avoid">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Opportunities</h2>
              <div className="space-y-3">
                {report.opportunities.map((opp, idx) => (
                  <div key={idx} className="rounded-md border border-gray-200 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{opp.title}</h3>
                        <p className="mt-1 text-sm text-gray-600">{opp.why}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            opp.category === 'coverage'
                              ? 'bg-blue-100 text-blue-700'
                              : opp.category === 'reuse'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {opp.category}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            opp.estimatedImpact === 'high'
                              ? 'bg-green-100 text-green-800'
                              : opp.estimatedImpact === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {opp.estimatedImpact}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="px-8 py-6 print:px-4 bg-gray-50 rounded-b-lg print:rounded-none print:bg-white print:border-t print:border-gray-200">
            <p className="text-xs text-gray-500 italic">{report.disclaimer}</p>
          </div>
        </div>

        {/* [DEO-UX-REFRESH-1] Footer with EngineO.ai branding */}
        <div className="mt-6 text-center print:mt-8 print:border-t print:border-gray-200 print:pt-4">
          <p className="text-xs text-gray-400">
            Generated by{' '}
            <span className="font-medium text-gray-600">EngineO.ai</span>
            {' · '}
            <span className="print:hidden">
              <a
                href="https://engineo.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                engineo.ai
              </a>
            </span>
            <span className="hidden print:inline">engineo.ai</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ type }: { type: 'not_found' | 'expired' | 'revoked' }) {
  const messages = {
    not_found: {
      title: 'Report Not Found',
      description: 'This shared report link does not exist or may have been removed.',
      icon: (
        <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    expired: {
      title: 'Link Expired',
      description: 'This shared report link has expired. Please request a new link from the report owner.',
      icon: (
        <svg className="h-12 w-12 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    revoked: {
      title: 'Access Revoked',
      description: 'This shared report link has been revoked by the owner and is no longer accessible.',
      icon: (
        <svg className="h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    },
  };

  const { title, description, icon } = messages[type];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto mb-4">{icon}</div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-2 text-gray-600 max-w-md">{description}</p>
      </div>
    </div>
  );
}

/**
 * [ENTERPRISE-GEO-1] Passcode entry form for protected share links
 */
function PasscodeForm({
  passcodeLast4,
  passcode,
  setPasscode,
  onSubmit,
  verifying,
  error,
}: {
  passcodeLast4?: string;
  passcode: string;
  setPasscode: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  verifying: boolean;
  error: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Protected Report</h1>
            <p className="mt-2 text-gray-600">
              This report is protected. Enter the passcode to view.
            </p>
            {passcodeLast4 && (
              <p className="mt-1 text-sm text-gray-500">
                Hint: ends with <span className="font-mono font-medium">{passcodeLast4}</span>
              </p>
            )}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="passcode" className="sr-only">Passcode</label>
              <input
                type="text"
                id="passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                placeholder="Enter 8-character passcode"
                maxLength={8}
                className="block w-full rounded-md border-gray-300 text-center text-lg font-mono tracking-widest shadow-sm focus:border-blue-500 focus:ring-blue-500 uppercase"
                disabled={verifying}
                autoFocus
                autoComplete="off"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={verifying || passcode.length < 8}
              className="w-full flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </>
              ) : (
                'View Report'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Powered by{' '}
              <span className="font-medium text-gray-600">EngineO.ai</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
