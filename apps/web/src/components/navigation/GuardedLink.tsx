'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { useUnsavedChanges } from '@/components/unsaved-changes/UnsavedChangesProvider';

type GuardedLinkProps = React.ComponentProps<typeof Link>;

export function GuardedLink(props: GuardedLinkProps) {
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges();
  const { onClick, ...rest } = props;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (hasUnsavedChanges) {
      const shouldLeave = window.confirm(
        'You have unsaved changes. If you leave this page, they will be lost. Continue without saving?'
      );

      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      setHasUnsavedChanges(false);
    }

    if (onClick) {
      onClick(event);
    }
  };

  return <Link {...rest} onClick={handleClick} />;
}
