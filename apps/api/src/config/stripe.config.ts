'use strict';

import Stripe from 'stripe';

/**
 * Stripe Configuration Module
 *
 * This module validates required Stripe environment variables at startup
 * and provides a centralized configuration object for Stripe integration.
 *
 * Required environment variables:
 * - STRIPE_SECRET_KEY: Your Stripe secret key (sk_test_... or sk_live_...)
 * - STRIPE_PRICE_PRO: Stripe Price ID for Pro plan ($29/mo)
 * - STRIPE_PRICE_BUSINESS: Stripe Price ID for Business plan ($99/mo)
 *
 * Optional:
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret for verifying Stripe events
 *
 * See docs/STRIPE_SETUP.md for setup instructions.
 */

const REQUIRED_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_PRO',
  'STRIPE_PRICE_BUSINESS',
] as const;

type RequiredVar = (typeof REQUIRED_VARS)[number];

function getEnv(name: RequiredVar | string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

const missing = REQUIRED_VARS.filter((key) => !getEnv(key));

if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    `[Stripe] Configuration incomplete. Missing environment variables: ${missing.join(
      ', '
    )}. See docs/STRIPE_SETUP.md for setup instructions.`
  );
}

export const stripeConfig = {
  /** Whether all required Stripe env vars are configured */
  enabled: missing.length === 0,
  /** Stripe secret key */
  secretKey: getEnv('STRIPE_SECRET_KEY') ?? '',
  /** Webhook signing secret (optional, for webhook verification) */
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  /** Stripe Price ID for Pro plan */
  pricePro: getEnv('STRIPE_PRICE_PRO') ?? '',
  /** Stripe Price ID for Business plan */
  priceBusiness: getEnv('STRIPE_PRICE_BUSINESS') ?? '',
};

/** Shared Stripe client instance (null if not configured) */
export const stripeClient = stripeConfig.enabled
  ? new Stripe(stripeConfig.secretKey, {
      apiVersion: '2023-10-16',
    })
  : null;
