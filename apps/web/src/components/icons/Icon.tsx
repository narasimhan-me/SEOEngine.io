'use client';

/**
 * ICONS-LOCAL-LIBRARY-1 - Icon Component
 *
 * Single rendering surface for Material Symbols icons.
 * Uses locally-served SVG sprite (no runtime CDN).
 *
 * Usage:
 *   <Icon name="nav.dashboard" />
 *   <Icon name="status.critical" size={24} className="text-red-500" />
 *   <Icon name="utility.search" ariaLabel="Search" />
 *
 * Accessibility:
 * - If ariaLabel provided: role="img" with <title> for screen readers
 * - Else: aria-hidden="true" (decorative icon)
 */

import { type ComponentPropsWithoutRef } from 'react';
import {
  type IconManifestKey,
  resolveIconName,
} from './material-symbols-manifest';

/**
 * Supported icon sizes in pixels.
 * Default is 20px per Stitch design system spec.
 */
export type IconSize = 16 | 20 | 24;

export interface IconProps extends Omit<
  ComponentPropsWithoutRef<'svg'>,
  'children'
> {
  /**
   * Semantic icon key from the manifest.
   * Format: 'category.name' (e.g., 'nav.dashboard', 'status.critical')
   */
  name: IconManifestKey;

  /**
   * Icon size in pixels. Default is 20.
   */
  size?: IconSize;

  /**
   * Accessible label for meaningful icons.
   * If provided, icon is announced to screen readers.
   * If omitted, icon is treated as decorative (aria-hidden).
   */
  ariaLabel?: string;
}

/**
 * Icon component using locally-served SVG sprite.
 *
 * Features:
 * - Uses semantic icon keys from manifest
 * - Supports 16/20/24px sizes (default: 20)
 * - Token-compatible via currentColor
 * - Stable alignment for buttons/nav (no layout shift)
 * - Accessible: meaningful icons labeled, decorative icons hidden
 */
export function Icon({
  name,
  size = 20,
  ariaLabel,
  className = '',
  ...props
}: IconProps) {
  const rawName = resolveIconName(name);
  const isDecorative = !ariaLabel;

  // Size classes for stable alignment
  const sizeClasses: Record<IconSize, string> = {
    16: 'h-4 w-4',
    20: 'h-5 w-5',
    24: 'h-6 w-6',
  };

  return (
    <svg
      className={`${sizeClasses[size]} shrink-0 ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={isDecorative ? 'true' : undefined}
      role={isDecorative ? undefined : 'img'}
      aria-label={ariaLabel}
      {...props}
    >
      {ariaLabel && <title>{ariaLabel}</title>}
      <use href={`/icons/material-symbols/sprite.svg#${rawName}`} />
    </svg>
  );
}

/**
 * Raw icon component for cases where you need to use the raw icon name directly.
 * Prefer using Icon with semantic keys when possible.
 */
export interface RawIconProps extends Omit<
  ComponentPropsWithoutRef<'svg'>,
  'children'
> {
  /**
   * Raw Material Symbol name (e.g., 'home', 'settings', 'check_circle')
   */
  rawName: string;

  /**
   * Icon size in pixels. Default is 20.
   */
  size?: IconSize;

  /**
   * Accessible label for meaningful icons.
   */
  ariaLabel?: string;
}

/**
 * RawIcon component for direct access to icons by raw name.
 * Use Icon with semantic keys for normal usage.
 */
export function RawIcon({
  rawName,
  size = 20,
  ariaLabel,
  className = '',
  ...props
}: RawIconProps) {
  const isDecorative = !ariaLabel;

  const sizeClasses: Record<IconSize, string> = {
    16: 'h-4 w-4',
    20: 'h-5 w-5',
    24: 'h-6 w-6',
  };

  return (
    <svg
      className={`${sizeClasses[size]} shrink-0 ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={isDecorative ? 'true' : undefined}
      role={isDecorative ? undefined : 'img'}
      aria-label={ariaLabel}
      {...props}
    >
      {ariaLabel && <title>{ariaLabel}</title>}
      <use href={`/icons/material-symbols/sprite.svg#${rawName}`} />
    </svg>
  );
}

export default Icon;
