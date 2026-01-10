'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { isAuthenticated } from '@/lib/auth';
import { projectsApi, type GeoReportData, type GeoReportShareLinkResponse } from '@/lib/api';

/**
 * [GEO-EXPORT-1] GEO Report Export Page
 *
 * Provides print-friendly report view and share link management.
 * Decision Lock: "Attribution readiness" instead of "citation confidence"
 */

/**
 * [ENTERPRISE-GEO-1] Passcode Modal Component
 * Shows the one-time passcode with acknowledgement requirement.
 */
function PasscodeModal({
  passcode,
  onClose,
}: {
  passcode: string;
  onClose: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPasscode = async () => {
    try {
      await navigator.clipboard.writeText(passcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Failed to copy passcode');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Share Link Created</h3>
            <p className="text-sm text-gray-500">This passcode protects your shared report</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Passcode</div>
          <div className="flex items-center justify-between">
            <code className="text-2xl font-mono font-bold text-gray-900 tracking-widest">{passcode}</code>
            <button
              onClick={handleCopyPasscode}
              className="ml-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              I understand this passcode will not be shown again and cannot be recovered.
              Anyone with this passcode can access the shared report.
            </span>
          </label>
        </div>

        <button
          onClick={onClose}
          disabled={!acknowledged}
          className={`w-full py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
            acknowledged
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function GeoReportExportPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState<GeoReportData | null>(null);
  const [shareLinks, setShareLinks] = useState<GeoReportShareLinkResponse[]>([]);
  const [creatingLink, setCreatingLink] = useState(false);
  // [ENTERPRISE-GEO-1] One-time passcode display state
  const [passcodeToShow, setPasscodeToShow] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [reportData, linksData] = await Promise.all([
        projectsApi.assembleGeoReport(projectId),
        projectsApi.listGeoReportShareLinks(projectId),
      ]);
      setReport(reportData);
      setShareLinks(linksData);
    } catch (err) {
      console.error('Error fetching export data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router, fetchData]);

  const handlePrint = () => {
    window.print();
  };

  const handleCreateShareLink = async () => {
    try {
      setCreatingLink(true);
      const response = await projectsApi.createGeoReportShareLink(projectId);
      setShareLinks((prev) => [response.shareLink, ...prev]);
      // [ENTERPRISE-GEO-1] If passcode was generated, show it in modal once
      if (response.passcode) {
        setPasscodeToShow(response.passcode);
      }
    } catch (err) {
      console.error('Error creating share link:', err);
      alert(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setCreatingLink(false);
    }
  };

  const handleClosePasscodeModal = () => {
    // Clear passcode from memory immediately
    setPasscodeToShow(null);
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!confirm('Revoke this share link? Anyone with the link will no longer be able to access it.')) {
      return;
    }
    try {
      await projectsApi.revokeGeoReportShareLink(projectId, linkId);
      setShareLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, status: 'REVOKED' as const } : l)),
      );
    } catch (err) {
      console.error('Error revoking link:', err);
      alert(err instanceof Error ? err.message : 'Failed to revoke link');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Link copied to clipboard!');
    } catch {
      alert('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded border border-red-400 bg-red-100 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* [ENTERPRISE-GEO-1] Passcode Modal - shown once after creating protected link */}
      {passcodeToShow && (
        <PasscodeModal passcode={passcodeToShow} onClose={handleClosePasscodeModal} />
      )}

      {/* [DEO-UX-REFRESH-1] Header - hidden on print */}
      <div className="bg-white border-b border-gray-200 print:hidden">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/projects/${projectId}/insights/geo-insights`}
                className="text-gray-500 hover:text-gray-700"
              >
                &larr; Back to GEO Insights
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Save PDF
              </button>
              <button
                onClick={handleCreateShareLink}
                disabled={creatingLink}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {creatingLink ? 'Creating...' : 'Create Share Link'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Links Section - hidden on print */}
      {shareLinks.length > 0 && (
        <div className="bg-white border-b border-gray-200 print:hidden">
          <div className="mx-auto max-w-5xl px-6 py-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Share Links</h3>
            <div className="space-y-2">
              {shareLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          link.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : link.status === 'EXPIRED'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {link.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        Expires: {new Date(link.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 truncate mt-1">{link.shareUrl}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {link.status === 'ACTIVE' && (
                      <>
                        <button
                          onClick={() => copyToClipboard(link.shareUrl)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleRevokeLink(link.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Revoke
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Printable Report Content */}
      <div className="mx-auto max-w-5xl px-6 py-8 print:px-4 print:py-4">
        {/* [DEO-UX-REFRESH-1] Print header with EngineO.ai branding */}
        <div className="hidden print:block print:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-blue-600"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-base font-bold text-gray-900">EngineO.ai</span>
            </div>
            <span className="text-xs text-gray-500">Read-only snapshot</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm print:shadow-none print:rounded-none">
          {/* Report Header */}
          <div className="border-b border-gray-200 px-8 py-6 print:px-4 print:break-inside-avoid">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">GEO Readiness Report</h1>
                <p className="mt-1 text-gray-600">{report.projectName}</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <div>Generated: {new Date(report.generatedAt).toLocaleDateString()}</div>
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    Read-only snapshot
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Overview Section */}
          <div className="border-b border-gray-200 px-8 py-6 print:px-4 print:break-inside-avoid">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-md border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Answer Ready</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {report.overview.productsAnswerReadyPercent}%
                </div>
                <div className="text-xs text-gray-500">
                  {report.overview.productsAnswerReadyCount} of {report.overview.productsTotal} products
                </div>
              </div>
              <div className="rounded-md border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Total Answers</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {report.overview.answersTotal}
                </div>
              </div>
              <div className="rounded-md border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Reuse Rate</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {report.overview.reuseRatePercent}%
                </div>
              </div>
              <div className="rounded-md border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Attribution Readiness</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-green-500"></span>
                  <span className="text-sm">High: {report.overview.confidenceDistribution.high}</span>
                  <span className="inline-block h-3 w-3 rounded-full bg-yellow-500 ml-2"></span>
                  <span className="text-sm">Med: {report.overview.confidenceDistribution.medium}</span>
                  <span className="inline-block h-3 w-3 rounded-full bg-red-500 ml-2"></span>
                  <span className="text-sm">Low: {report.overview.confidenceDistribution.low}</span>
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

        {/* [DEO-UX-REFRESH-1] Print footer with EngineO.ai branding */}
        <div className="hidden print:block print:mt-8 print:border-t print:border-gray-200 print:pt-4 text-center">
          <p className="text-xs text-gray-400">
            Generated by <span className="font-medium text-gray-600">EngineO.ai</span> · engineo.ai
          </p>
        </div>
      </div>
    </div>
  );
}
