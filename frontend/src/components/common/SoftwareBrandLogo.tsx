/**
 * @file        SoftwareBrandLogo.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.common
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-28
 * @updated     2026-11-28
 *
 * @description Single-source-of-truth adaptive PrathamOne EduOS platform logo component that automatically switches between navy-ink (light surface) and white-ink (dark surface) variants.
 */

import React from 'react'
import { BRANDING_CONFIG, useBranding } from '../../config/branding'
import { useResolvedAppearance } from '../../store/appearanceStore'

export interface SoftwareBrandLogoProps {
  /** 'full' renders the wide horizontal wordmark+tagline lockup; 'icon' renders the square emblem mark. */
  variant?: 'full' | 'icon'
  /** 'auto' follows active light/dark appearance; 'light'/'dark' force contrast for fixed-color surfaces (e.g. paper print vs navy header). */
  surface?: 'auto' | 'light' | 'dark'
  alt?: string
  title?: string
  className?: string
  ariaHidden?: boolean
}

export const SoftwareBrandLogo: React.FC<SoftwareBrandLogoProps> = ({
  variant = 'full',
  surface = 'auto',
  alt = 'PrathamOne EduOS',
  title,
  className = '',
  ariaHidden,
}) => {
  const branding = useBranding()
  const resolvedAppearance = useResolvedAppearance()
  const isDarkSurface = surface === 'dark' || (surface === 'auto' && resolvedAppearance === 'dark')

  const src =
    variant === 'icon'
      ? isDarkSurface
        ? branding.assets.softwareIconWhiteSvgUrl ||
          branding.assets.symbolMarkDarkUrl ||
          BRANDING_CONFIG.assets.softwareIconWhiteSvgUrl
        : branding.assets.softwareIconSvgUrl || BRANDING_CONFIG.assets.softwareIconSvgUrl
      : isDarkSurface
        ? branding.assets.horizontalLogoDarkUrl ||
          branding.assets.monoWhiteSvgUrl ||
          BRANDING_CONFIG.assets.horizontalLogoDarkUrl
        : branding.assets.softwareLogoSvgUrl || BRANDING_CONFIG.assets.softwareLogoSvgUrl

  return (
    <img
      src={src}
      alt={ariaHidden ? '' : alt}
      title={title}
      aria-hidden={ariaHidden}
      className={className}
    />
  )
}

export default SoftwareBrandLogo
