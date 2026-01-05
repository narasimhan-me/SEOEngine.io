'use client';

import { GuardedLink } from '@/components/navigation/GuardedLink';
import { useRouter } from 'next/navigation';
import { isAuthenticated, removeToken } from '@/lib/auth';
import { usersApi } from '@/lib/api';
import { useEffect, useState, useRef } from 'react';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/theme-toggle';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  adminRole?: 'SUPPORT_AGENT' | 'OPS_ADMIN' | 'MANAGEMENT_CEO' | null;
  // [SELF-SERVICE-1] Account role for customer permissions
  accountRole?: 'OWNER' | 'EDITOR' | 'VIEWER';
}

export default function TopNav() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  // [SELF-SERVICE-1] Account menu dropdown state
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

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

  // Prevent hydration mismatch by not rendering auth-dependent UI until mounted
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <GuardedLink
                href="/projects"
                className="flex items-center px-2 py-2"
              >
                <Logo withText={true} className="h-8" />
              </GuardedLink>
            </div>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/10">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <GuardedLink
              href="/projects"
              className="flex items-center px-2 py-2"
            >
              <Logo withText={true} className="h-8" />
            </GuardedLink>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <GuardedLink
                href="/projects"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-foreground hover:text-signal transition-colors uppercase tracking-wide"
              >
                Projects
              </GuardedLink>
              <GuardedLink
                href="/settings"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-foreground hover:text-signal transition-colors uppercase tracking-wide"
              >
                Settings
              </GuardedLink>
              {user?.role === 'ADMIN' && !!user?.adminRole && (
                <GuardedLink
                  href="/admin"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-wide"
                >
                  Admin
                </GuardedLink>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {authenticated ? (
              <>
                {/* [SELF-SERVICE-1] Account Menu Dropdown */}
                <div className="relative" ref={accountMenuRef}>
                  <button
                    onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                    className="flex items-center text-sm font-medium text-muted-foreground hover:text-signal transition-colors uppercase tracking-wide"
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
                    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-card ring-1 ring-border/10 z-50 border border-border/10">
                      <div className="py-1" role="menu">
                        {/* User info header */}
                        <div className="px-4 py-2 border-b border-border/10">
                          <p className="text-sm font-medium text-foreground truncate">{user?.name || 'User'}</p>
                          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        </div>

                        {/* Account menu items */}
                        <GuardedLink
                          href="/settings/profile"
                          className="block px-4 py-2 text-sm text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Profile
                        </GuardedLink>
                        <GuardedLink
                          href="/settings/organization"
                          className="block px-4 py-2 text-sm text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Organization / Stores
                        </GuardedLink>
                        <GuardedLink
                          href="/settings/billing"
                          className="block px-4 py-2 text-sm text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Plan & Billing
                        </GuardedLink>
                        <GuardedLink
                          href="/settings/ai-usage"
                          className="block px-4 py-2 text-sm text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          AI Usage
                        </GuardedLink>
                        <GuardedLink
                          href="/settings/preferences"
                          className="block px-4 py-2 text-sm text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Preferences
                        </GuardedLink>
                        <GuardedLink
                          href="/settings/security"
                          className="block px-4 py-2 text-sm text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Security
                        </GuardedLink>
                        <GuardedLink
                          href="/settings/help"
                          className="block px-4 py-2 text-sm text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Help & Support
                        </GuardedLink>

                        {/* Admin link (gated to internal admins) */}
                        {user?.role === 'ADMIN' && !!user?.adminRole && (
                          <>
                            <div className="border-t border-border/10 my-1" />
                            <GuardedLink
                              href="/admin"
                              className="block px-4 py-2 text-sm text-purple-400 hover:bg-purple-900/20 transition-colors"
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              Admin Dashboard
                            </GuardedLink>
                          </>
                        )}

                        {/* Sign out */}
                        <div className="border-t border-border/10 my-1" />
                        <button
                          onClick={() => {
                            setAccountMenuOpen(false);
                            handleSignOut();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors"
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
                  className="text-sm font-medium text-muted-foreground hover:text-signal transition-colors uppercase tracking-wide"
                >
                  Sign in
                </GuardedLink>
                <GuardedLink
                  href="/signup"
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-primary-foreground bg-primary hover:bg-primary/90 uppercase tracking-wide transition-colors"
                >
                  Sign up
                </GuardedLink>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
