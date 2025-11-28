'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

interface IntegrationStatus {
  projectId: string;
  projectName: string;
  connectedType: string;
  shopify: {
    connected: boolean;
    shopDomain?: string;
    installedAt?: string;
    scope?: string;
  };
}

export default function ProjectDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopDomain, setShopDomain] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchIntegrationStatus();

    // Check if we just returned from Shopify OAuth
    if (searchParams.get('shopify') === 'connected') {
      setSuccessMessage('Successfully connected to Shopify!');
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [projectId, searchParams]);

  const fetchIntegrationStatus = async () => {
    try {
      setLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/projects/${projectId}/integration-status`);

      if (!response.ok) {
        throw new Error('Failed to fetch integration status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching integration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectShopify = () => {
    if (!shopDomain) {
      alert('Please enter your Shopify store domain');
      return;
    }

    // Ensure the domain ends with .myshopify.com
    let formattedDomain = shopDomain.trim();
    if (!formattedDomain.includes('.myshopify.com')) {
      formattedDomain = `${formattedDomain}.myshopify.com`;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const installUrl = `${API_URL}/shopify/install?shop=${formattedDomain}&projectId=${projectId}`;

    // Redirect to Shopify OAuth flow
    window.location.href = installUrl;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600">Project not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-900 mb-2">{status.projectName}</h1>
      <p className="text-gray-600 mb-8">Project ID: {status.projectId}</p>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Integration Status</h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Connection Type:</p>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {status.connectedType}
          </span>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Shopify Integration</h3>

          {status.shopify.connected ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <svg
                  className="w-5 h-5 text-green-500 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-green-800 font-semibold">Connected</span>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <span className="font-medium">Store:</span> {status.shopify.shopDomain}
                </p>
                <p>
                  <span className="font-medium">Connected:</span>{' '}
                  {new Date(status.shopify.installedAt!).toLocaleDateString()}
                </p>
                {status.shopify.scope && (
                  <p>
                    <span className="font-medium">Scopes:</span> {status.shopify.scope}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 mb-4">Connect your Shopify store to sync products and apply AI-generated SEO optimizations.</p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="shopDomain" className="block text-sm font-medium text-gray-700 mb-2">
                    Shopify Store Domain
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="shopDomain"
                      value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                      placeholder="your-store"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="flex items-center text-gray-600 text-sm">.myshopify.com</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your Shopify store domain (e.g., &quot;my-store&quot; for my-store.myshopify.com)
                  </p>
                </div>

                <button
                  onClick={handleConnectShopify}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Connect Shopify Store
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Next Steps</h3>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          {!status.shopify.connected ? (
            <>
              <li>Connect your Shopify store using the form above</li>
              <li>Authorize SEOEngine.io in your Shopify admin</li>
              <li>Sync your products</li>
              <li>Start generating AI-powered SEO optimizations</li>
            </>
          ) : (
            <>
              <li>Sync products from your Shopify store</li>
              <li>Generate AI-powered SEO metadata</li>
              <li>Apply optimizations back to Shopify</li>
              <li>Track performance improvements</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
