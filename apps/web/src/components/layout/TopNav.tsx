'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { isAuthenticated, removeToken } from '@/lib/auth';
import { usersApi } from '@/lib/api';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export default function TopNav() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setMounted(true);
    const isAuth = isAuthenticated();
    setAuthenticated(isAuth);

    // Fetch user data to check role
    if (isAuth) {
      usersApi.me().then((userData: User) => {
        setUser(userData);
      }).catch(() => {
        // If fetch fails, clear auth state
        removeToken();
        setAuthenticated(false);
      });
    }
  }, []);

  const handleSignOut = () => {
    removeToken();
    router.push('/login');
  };

  // Prevent hydration mismatch by not rendering auth-dependent UI until mounted
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link
                href="/projects"
                className="flex items-center px-2 py-2"
              >
                <Image
                  src="/branding/engineo/logo-light.png"
                  alt="EngineO.ai"
                  width={160}
                  height={40}
                  priority
                />
              </Link>
            </div>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link
              href="/projects"
              className="flex items-center px-2 py-2"
            >
              <Image
                src="/branding/engineo/logo-light.png"
                alt="EngineO.ai"
                width={160}
                height={40}
                priority
              />
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/projects"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
              >
                Projects
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
              >
                Settings
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-purple-700 hover:text-purple-900"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {authenticated ? (
              <>
                <a
                  href="https://docs.seoengine.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-gray-600 hover:text-blue-600"
                >
                  Help
                </a>
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-gray-600 hover:text-blue-600"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 hover:text-blue-600"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
