'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usersApi, twoFactorApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  name: string | null;
  twoFactorEnabled: boolean;
}

interface SetupResponse {
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 2FA setup state
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchUser();
  }, [router]);

  const fetchUser = async () => {
    try {
      const userData = await usersApi.me();
      setUser(userData);
    } catch (err: any) {
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupInit = async () => {
    setError('');
    setSuccess('');
    setIsSettingUp(true);

    try {
      const data = await twoFactorApi.setupInit();
      setSetupData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize 2FA setup');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsEnabling(true);

    try {
      await twoFactorApi.enable(verificationCode);
      setSuccess('Two-factor authentication has been enabled successfully!');
      setSetupData(null);
      setVerificationCode('');
      // Refresh user data to show updated status
      await fetchUser();
    } catch (err: any) {
      setError(err.message || 'Failed to enable 2FA. Please check your code and try again.');
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisable = async () => {
    setError('');
    setSuccess('');
    setIsDisabling(true);

    try {
      await twoFactorApi.disable();
      setSuccess('Two-factor authentication has been disabled.');
      // Refresh user data to show updated status
      await fetchUser();
    } catch (err: any) {
      setError(err.message || 'Failed to disable 2FA');
    } finally {
      setIsDisabling(false);
    }
  };

  const cancelSetup = () => {
    setSetupData(null);
    setVerificationCode('');
    setError('');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link href="/settings" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Settings
        </Link>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Security Settings</h1>
      <p className="text-gray-600 mb-8">Manage your account security settings</p>

      {/* Status messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Two-Factor Authentication Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Two-Factor Authentication (2FA)
        </h2>

        {user?.twoFactorEnabled ? (
          // 2FA is enabled
          <div>
            <div className="flex items-center mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Enabled
              </span>
            </div>
            <p className="text-gray-600 mb-4">
              Your account is protected with two-factor authentication. You will need to enter a code from your authenticator app when logging in.
            </p>
            <button
              onClick={handleDisable}
              disabled={isDisabling}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDisabling ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </div>
        ) : setupData ? (
          // 2FA setup in progress - show QR code
          <div>
            <p className="text-gray-600 mb-4">
              Scan the QR code below with your authenticator app (Google Authenticator, 1Password, Authy, etc.), then enter the 6-digit code to verify.
            </p>

            <div className="flex flex-col items-center mb-6">
              <img
                src={setupData.qrCodeDataUrl}
                alt="2FA QR Code"
                className="w-48 h-48 border border-gray-200 rounded-lg mb-4"
              />
              <p className="text-xs text-gray-500 text-center max-w-xs break-all">
                Can&apos;t scan? Enter this code manually:<br />
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {setupData.otpauthUrl.split('secret=')[1]?.split('&')[0] || ''}
                </code>
              </p>
            </div>

            <form onSubmit={handleEnable} className="max-w-xs">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                id="code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                pattern="[0-9]{6}"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
              />
              <div className="mt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={isEnabling || verificationCode.length !== 6}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEnabling ? 'Verifying...' : 'Enable 2FA'}
                </button>
                <button
                  type="button"
                  onClick={cancelSetup}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          // 2FA not enabled - show enable button
          <div>
            <div className="flex items-center mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                Not enabled
              </span>
            </div>
            <p className="text-gray-600 mb-4">
              Add an extra layer of security to your account by enabling two-factor authentication.
              You&apos;ll need an authenticator app like Google Authenticator, 1Password, or Authy.
            </p>
            <button
              onClick={handleSetupInit}
              disabled={isSettingUp}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSettingUp ? 'Setting up...' : 'Enable 2FA'}
            </button>
          </div>
        )}

        {/* TODO: Add backup codes section in a future update */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Coming Soon</h3>
          <p className="text-sm text-gray-400">
            Backup codes for account recovery will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
