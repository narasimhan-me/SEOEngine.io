'use client';

import { GuardedLink } from '@/components/navigation/GuardedLink';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { isAuthenticated, removeToken } from '@/lib/auth';
import { usersApi } from '@/lib/api';
import { useEffect, useState, useRef } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  adminRole?: 'SUPPORT_AGENT' | 'OPS_ADMIN' | 'MANAGEMENT_CEO' | null;
  // [SELF-SERVICE-1] Account role for customer permissions
  accountRole?: 'OWNER' | 'EDITOR' | 'VIEWER';
}

// [NAV-IA-CONSISTENCY-1] Theme preference key
const THEME_STORAGE_KEY = 'engineo_theme';

export default function TopNav() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  // [SELF-SERVICE-1] Account menu dropdown state
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  // [NAV-IA-CONSISTENCY-1] Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    const isAuth = isAuthenticated();
    setAuthenticated(isAuth);

    // [NAV-IA-CONSISTENCY-1] Load theme preference
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        setTheme('dark');
        document.documentElement.classList.add('dark');
      }
    }

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

  // [SELF-SERVICE-1] Close account menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [accountMenuOpen]);

  const handleSignOut = () => {
    removeToken();
    router.push('/login');
  };

  // [NAV-IA-CONSISTENCY-1] Toggle theme and persist
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Prevent hydration mismatch by not rendering auth-dependent UI until mounted
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <GuardedLink
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
              </GuardedLink>
            </div>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <GuardedLink
              href="/projects"
              className="flex items-center px-2 py-2"
            >
              <Image
                src="/branding/engineo/logo-light.png"
                alt="EngineO.ai"
                width={160}
                height={40}
                priority
                className="dark:hidden"
              />
              <Image
                src="/branding/engineo/logo-dark.png"
                alt="EngineO.ai"
                width={160}
                height={40}
                priority
                className="hidden dark:block"
              />
            </GuardedLink>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <GuardedLink
                href="/projects"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-foreground hover:text-primary"
              >
                Projects
              </GuardedLink>
              {/* [NAV-IA-CONSISTENCY-1] Admin link in top nav (not in dropdown) - conditional */}
              {user?.role === 'ADMIN' && !!user?.adminRole && (
                <GuardedLink
                  href="/admin"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300"
                >
                  Admin
                </GuardedLink>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {authenticated ? (
              <>
                {/* [NAV-IA-CONSISTENCY-1] Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
                  title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                  data-testid="theme-toggle"
                >
                  {theme === 'light' ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </button>

                {/* [SELF-SERVICE-1] Account Menu Dropdown */}
                <div className="relative" ref={accountMenuRef}>
                  <button
                    onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                    className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
                    data-testid="account-menu-button"
                  >
                    <span className="sr-only">Open account menu</span>
                    <svg
                      className="h-5 w-5 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Account
                    <svg
                      className={`ml-1 h-4 w-4 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {accountMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-background ring-1 ring-border z-50" data-testid="account-dropdown">
                      <div className="py-1" role="menu">
                        {/* User info header */}
                        <div className="px-4 py-2 border-b border-border">
                          <p className="text-sm font-medium text-foreground truncate">{user?.name || 'User'}</p>
                          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        </div>

                        {/* [NAV-IA-CONSISTENCY-1] Account menu items - exact labels and order */}
                        <GuardedLink
                          href="/settings/profile"
                          className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Profile
                        </GuardedLink>
                        <GuardedLink
                          href="/settings/organization"
                          className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Stores
                        </GuardedLink>
                        <GuardedLink
                          href="/settings/billing"
                          className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Plan & Billing
                        </GuardedLink>
                        <GuardedLink
                          href="/settings/ai-usage"
                          className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          AI Usage
                        </GuardedLink>
                        <GuardedLink
                          href="/settings/security"
                          className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Security
                        </GuardedLink>
                        <GuardedLink
                          href="/settings/preferences"
                          className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Preferences
                        </GuardedLink>
                        <GuardedLink
                          href="/settings/help"
                          className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Help & Support
                        </GuardedLink>

                        {/* Sign out */}
                        <div className="border-t border-border my-1" />
                        <button
                          onClick={() => {
                            setAccountMenuOpen(false);
                            handleSignOut();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <GuardedLink
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  Sign in
                </GuardedLink>
                <GuardedLink
                  href="/signup"
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90"
                >
                  Create account
                </GuardedLink>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
