'use client';

import FriendlyError from '@/components/ui/FriendlyError';

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('Project error:', error);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FriendlyError
        title="Something went wrong in this project"
        message="Please try again. If the problem persists, try reloading the project."
        onRetry={reset}
      />
    </div>
  );
}
