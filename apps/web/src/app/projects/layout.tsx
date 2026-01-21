import LayoutShell from '@/components/layout/LayoutShell';

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutShell>{children}</LayoutShell>;
}
