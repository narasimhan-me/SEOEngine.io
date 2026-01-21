'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { useEffect, useState } from 'react';

interface CaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY || '';

// Cloudflare Turnstile test keys for development
// See: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const DEV_SITE_KEY = '1x00000000000000000000AA'; // Always passes

export function Captcha({ onVerify, onError, onExpire }: CaptchaProps) {
  const [hasError, setHasError] = useState(false);
  const siteKey = SITE_KEY || DEV_SITE_KEY;

  // Handle load errors gracefully
  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // If Turnstile fails to load, auto-verify in development
  useEffect(() => {
    if (hasError && !SITE_KEY) {
      // In dev mode without a real key, skip CAPTCHA on error
      console.warn(
        '[Captcha] Turnstile failed to load, auto-verifying for development'
      );
      onVerify('dev-bypass-token');
    }
  }, [hasError, onVerify]);

  if (hasError && !SITE_KEY) {
    return (
      <div className="text-sm text-gray-500 p-2 bg-gray-100 rounded">
        CAPTCHA skipped (development mode)
      </div>
    );
  }

  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={onVerify}
      onError={handleError}
      onExpire={onExpire}
    />
  );
}
