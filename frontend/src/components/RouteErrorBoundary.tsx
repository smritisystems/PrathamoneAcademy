/**
 * @file        RouteErrorBoundary.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-05
 * @updated     2026-11-05
 *
 * @description Route-level Error Boundary isolating page crashes to preserve master layout navigation.
 */

import React from 'react'
import { ErrorBoundary, ErrorBoundaryProps } from './ErrorBoundary'

export interface RouteErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'isInline'> {
  routeName?: string
}

export const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = ({
  children,
  routeName,
  fallbackTitle,
  ...rest
}) => {
  return (
    <ErrorBoundary
      isInline={true}
      fallbackTitle={fallbackTitle || (routeName ? `${routeName} Unavailable` : undefined)}
      {...rest}
    >
      {children}
    </ErrorBoundary>
  )
}

