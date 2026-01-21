import LayoutShell from '@/components/layout/LayoutShell';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutShell>{children}</LayoutShell>;
}
