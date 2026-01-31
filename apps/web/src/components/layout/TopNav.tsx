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

// [NAV-IA-CONSISTENCY-1] [DARK-MODE-SYSTEM-1] Theme preference key and types
const THEME_STORAGE_KEY = 'engineo_theme';
type ThemeMode = 'system' | 'light' | 'dark';

export default function TopNav() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  // [SELF-SERVICE-1] Account menu dropdown state
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  // [DARK-MODE-SYSTEM-1] Theme state: system | light | dark
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  // [DARK-MODE-SYSTEM-1] Theme selector dropdown state
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // [DARK-MODE-SYSTEM-1] Apply theme based on mode and system preference
  const applyTheme = (mode: ThemeMode) => {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    const shouldBeDark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  };

  useEffect(() => {
    setMounted(true);
    const isAuth = isAuthenticated();
    setAuthenticated(isAuth);

    // [DARK-MODE-SYSTEM-1] Load theme preference (backward compatible with light/dark values)
    const savedTheme = localStorage.getItem(
      THEME_STORAGE_KEY
    ) as ThemeMode | null;
    const mode: ThemeMode =
      savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system'
        ? savedTheme
        : 'system';
    setThemeMode(mode);
    applyTheme(mode);

    // Fetch user data to check role
    if (isAuth) {
      usersApi
        .me()
        .then((userData: User) => {
          setUser(userData);
        })
        .catch(() => {
          // If fetch fails, clear auth state
          removeToken();
          setAuthenticated(false);
        });
    }
  }, []);

  // [DARK-MODE-SYSTEM-1] Listen for OS theme changes when in system mode
  useEffect(() => {
    if (themeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  // [SELF-SERVICE-1] Close account menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    }

    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [accountMenuOpen]);

  // [DARK-MODE-SYSTEM-1] Close theme menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        themeMenuRef.current &&
        !themeMenuRef.current.contains(event.target as Node)
      ) {
        setThemeMenuOpen(false);
      }
    }

    if (themeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [themeMenuOpen]);

  // [KEYBOARD-&-FOCUS-INTEGRITY-1] Theme menu keyboard state
  const [themeFocusedIndex, setThemeFocusedIndex] = useState(-1);
  const themeMenuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // [KEYBOARD-&-FOCUS-INTEGRITY-1] Account menu keyboard state
  const [accountFocusedIndex, setAccountFocusedIndex] = useState(-1);
  const accountMenuItemRefs = useRef<(HTMLElement | null)[]>([]);

  // [KEYBOARD-&-FOCUS-INTEGRITY-1] Reset focus index when menus open/close
  useEffect(() => {
    if (themeMenuOpen) {
      setThemeFocusedIndex(0);
    } else {
      setThemeFocusedIndex(-1);
    }
  }, [themeMenuOpen]);

  useEffect(() => {
    if (accountMenuOpen) {
      setAccountFocusedIndex(0);
    } else {
      setAccountFocusedIndex(-1);
    }
  }, [accountMenuOpen]);

  // [KEYBOARD-&-FOCUS-INTEGRITY-1] Focus item when index changes
  useEffect(() => {
    if (themeMenuOpen && themeFocusedIndex >= 0) {
      themeMenuItemRefs.current[themeFocusedIndex]?.focus();
    }
  }, [themeMenuOpen, themeFocusedIndex]);

  useEffect(() => {
    if (accountMenuOpen && accountFocusedIndex >= 0) {
      accountMenuItemRefs.current[accountFocusedIndex]?.focus();
    }
  }, [accountMenuOpen, accountFocusedIndex]);

  // [KEYBOARD-&-FOCUS-INTEGRITY-1] Handle theme menu keyboard navigation
  const handleThemeMenuKeyDown = (event: React.KeyboardEvent) => {
    const themeOptions = ['system', 'light', 'dark'] as const;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setThemeFocusedIndex((prev) => (prev < 2 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setThemeFocusedIndex((prev) => (prev > 0 ? prev - 1 : 2));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (themeFocusedIndex >= 0) {
          setTheme(themeOptions[themeFocusedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setThemeMenuOpen(false);
        break;
      case 'Tab':
        setThemeMenuOpen(false);
        break;
    }
  };

  // [KEYBOARD-&-FOCUS-INTEGRITY-1] Handle account menu keyboard navigation
  const handleAccountMenuKeyDown = (event: React.KeyboardEvent) => {
    const itemCount = 8; // Profile, Stores, Plan & Billing, AI Usage, Security, Preferences, Help, Sign out
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setAccountFocusedIndex((prev) => (prev < itemCount - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setAccountFocusedIndex((prev) => (prev > 0 ? prev - 1 : itemCount - 1));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        accountMenuItemRefs.current[accountFocusedIndex]?.click();
        break;
      case 'Escape':
        event.preventDefault();
        setAccountMenuOpen(false);
        break;
      case 'Tab':
        setAccountMenuOpen(false);
        break;
    }
  };

  const handleSignOut = () => {
    removeToken();
    router.push('/login');
  };

  // [DARK-MODE-SYSTEM-1] Set theme mode and persist
  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    applyTheme(mode);
    setThemeMenuOpen(false);
  };

  // [DARK-MODE-SYSTEM-1] Get current effective theme for icon display
  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (themeMode === 'system') {
      return typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return themeMode;
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

  // [KAN-94: EA-54] Redesigned TopNav for calm, premium feel
  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border/60">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
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
            {/* [KAN-94: EA-54] Primary nav links with improved active states */}
            <div className="hidden sm:ml-8 sm:flex sm:items-center sm:gap-1">
              <GuardedLink
                href="/projects"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-foreground relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-4/5 after:h-0.5 after:rounded-full after:bg-[hsl(var(--nav-active-indicator,var(--primary)))] hover:bg-muted/30 transition-colors rounded"
              >
                Projects
              </GuardedLink>
              {/* [NAV-IA-CONSISTENCY-1] Admin link in top nav (not in dropdown) - conditional */}
              {user?.role === 'ADMIN' && !!user?.adminRole && (
                <GuardedLink
                  href="/admin"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors rounded"
                >
                  Admin
                </GuardedLink>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {authenticated ? (
              <>
                {/* [DARK-MODE-SYSTEM-1] Theme Toggle - 3-mode selector */}
                <div className="relative" ref={themeMenuRef}>
                  <button
                    onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
                    title={`Theme: ${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}`}
                    data-testid="theme-toggle"
                  >
                    {/* Show icon based on effective theme */}
                    {themeMode === 'system' ? (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    ) : getEffectiveTheme() === 'dark' ? (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    )}
                  </button>

                  {themeMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-36 rounded-md shadow-lg bg-background ring-1 ring-border z-50"
                      data-testid="theme-dropdown"
                      role="listbox"
                      aria-label="Theme options"
                      aria-activedescendant={themeFocusedIndex >= 0 ? `theme-option-${themeFocusedIndex}` : undefined}
                      onKeyDown={handleThemeMenuKeyDown}
                    >
                      <div className="py-1">
                        <button
                          ref={(el) => { themeMenuItemRefs.current[0] = el; }}
                          id="theme-option-0"
                          role="option"
                          aria-selected={themeMode === 'system'}
                          tabIndex={themeFocusedIndex === 0 ? 0 : -1}
                          onClick={() => setTheme('system')}
                          className={`flex items-center w-full px-4 py-2 text-sm hover:bg-muted focus:bg-muted focus:outline-none ${themeMode === 'system' ? 'text-primary font-medium' : 'text-foreground'} ${themeFocusedIndex === 0 ? 'bg-muted' : ''}`}
                        >
                          <svg
                            className="h-4 w-4 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          System
                          {themeMode === 'system' && (
                            <svg
                              className="h-4 w-4 ml-auto"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                        <button
                          ref={(el) => { themeMenuItemRefs.current[1] = el; }}
                          id="theme-option-1"
                          role="option"
                          aria-selected={themeMode === 'light'}
                          tabIndex={themeFocusedIndex === 1 ? 0 : -1}
                          onClick={() => setTheme('light')}
                          className={`flex items-center w-full px-4 py-2 text-sm hover:bg-muted focus:bg-muted focus:outline-none ${themeMode === 'light' ? 'text-primary font-medium' : 'text-foreground'} ${themeFocusedIndex === 1 ? 'bg-muted' : ''}`}
                        >
                          <svg
                            className="h-4 w-4 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                          Light
                          {themeMode === 'light' && (
                            <svg
                              className="h-4 w-4 ml-auto"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                        <button
                          ref={(el) => { themeMenuItemRefs.current[2] = el; }}
                          id="theme-option-2"
                          role="option"
                          aria-selected={themeMode === 'dark'}
                          tabIndex={themeFocusedIndex === 2 ? 0 : -1}
                          onClick={() => setTheme('dark')}
                          className={`flex items-center w-full px-4 py-2 text-sm hover:bg-muted focus:bg-muted focus:outline-none ${themeMode === 'dark' ? 'text-primary font-medium' : 'text-foreground'} ${themeFocusedIndex === 2 ? 'bg-muted' : ''}`}
                        >
                          <svg
                            className="h-4 w-4 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                            />
                          </svg>
                          Dark
                          {themeMode === 'dark' && (
                            <svg
                              className="h-4 w-4 ml-auto"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {accountMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-background ring-1 ring-border z-50"
                      data-testid="account-dropdown"
                      role="listbox"
                      aria-label="Account options"
                      aria-activedescendant={accountFocusedIndex >= 0 ? `account-option-${accountFocusedIndex}` : undefined}
                      onKeyDown={handleAccountMenuKeyDown}
                    >
                      <div className="py-1">
                        {/* User info header */}
                        <div className="px-4 py-2 border-b border-border">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user?.name || 'User'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user?.email}
                          </p>
                        </div>

                        {/* [NAV-IA-CONSISTENCY-1] Account menu items - exact labels and order */}
                        {/* [KEYBOARD-&-FOCUS-INTEGRITY-1] Added keyboard navigation support */}
                        <GuardedLink
                          ref={(el) => { accountMenuItemRefs.current[0] = el; }}
                          id="account-option-0"
                          role="option"
                          aria-selected={accountFocusedIndex === 0}
                          tabIndex={accountFocusedIndex === 0 ? 0 : -1}
                          href="/settings/profile"
                          className={`block px-4 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none ${accountFocusedIndex === 0 ? 'bg-muted' : ''}`}
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Profile
                        </GuardedLink>
                        <GuardedLink
                          ref={(el) => { accountMenuItemRefs.current[1] = el; }}
                          id="account-option-1"
                          role="option"
                          aria-selected={accountFocusedIndex === 1}
                          tabIndex={accountFocusedIndex === 1 ? 0 : -1}
                          href="/settings/organization"
                          className={`block px-4 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none ${accountFocusedIndex === 1 ? 'bg-muted' : ''}`}
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Stores
                        </GuardedLink>
                        <GuardedLink
                          ref={(el) => { accountMenuItemRefs.current[2] = el; }}
                          id="account-option-2"
                          role="option"
                          aria-selected={accountFocusedIndex === 2}
                          tabIndex={accountFocusedIndex === 2 ? 0 : -1}
                          href="/settings/billing"
                          className={`block px-4 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none ${accountFocusedIndex === 2 ? 'bg-muted' : ''}`}
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Plan & Billing
                        </GuardedLink>
                        <GuardedLink
                          ref={(el) => { accountMenuItemRefs.current[3] = el; }}
                          id="account-option-3"
                          role="option"
                          aria-selected={accountFocusedIndex === 3}
                          tabIndex={accountFocusedIndex === 3 ? 0 : -1}
                          href="/settings/ai-usage"
                          className={`block px-4 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none ${accountFocusedIndex === 3 ? 'bg-muted' : ''}`}
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          AI Usage
                        </GuardedLink>
                        <GuardedLink
                          ref={(el) => { accountMenuItemRefs.current[4] = el; }}
                          id="account-option-4"
                          role="option"
                          aria-selected={accountFocusedIndex === 4}
                          tabIndex={accountFocusedIndex === 4 ? 0 : -1}
                          href="/settings/security"
                          className={`block px-4 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none ${accountFocusedIndex === 4 ? 'bg-muted' : ''}`}
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Security
                        </GuardedLink>
                        <GuardedLink
                          ref={(el) => { accountMenuItemRefs.current[5] = el; }}
                          id="account-option-5"
                          role="option"
                          aria-selected={accountFocusedIndex === 5}
                          tabIndex={accountFocusedIndex === 5 ? 0 : -1}
                          href="/settings/preferences"
                          className={`block px-4 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none ${accountFocusedIndex === 5 ? 'bg-muted' : ''}`}
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Preferences
                        </GuardedLink>
                        <GuardedLink
                          ref={(el) => { accountMenuItemRefs.current[6] = el; }}
                          id="account-option-6"
                          role="option"
                          aria-selected={accountFocusedIndex === 6}
                          tabIndex={accountFocusedIndex === 6 ? 0 : -1}
                          href="/settings/help"
                          className={`block px-4 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none ${accountFocusedIndex === 6 ? 'bg-muted' : ''}`}
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Help & Support
                        </GuardedLink>

                        {/* Sign out */}
                        <div className="border-t border-border my-1" />
                        <button
                          ref={(el) => { accountMenuItemRefs.current[7] = el; }}
                          id="account-option-7"
                          role="option"
                          aria-selected={accountFocusedIndex === 7}
                          tabIndex={accountFocusedIndex === 7 ? 0 : -1}
                          onClick={() => {
                            setAccountMenuOpen(false);
                            handleSignOut();
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none ${accountFocusedIndex === 7 ? 'bg-muted' : ''}`}
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
