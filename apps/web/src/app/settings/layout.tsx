import TopNav from '@/components/layout/TopNav';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
