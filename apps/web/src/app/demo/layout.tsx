'use client';

import LayoutShell from '@/components/layout/LayoutShell';

/**
 * Layout wrapper for all /demo/* routes.
 * Provides LayoutShell context (including RightContextPanelProvider) to demo pages.
 */
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutShell>{children}</LayoutShell>;
}
