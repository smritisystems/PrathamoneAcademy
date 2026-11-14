/**
 * @file        custom.d.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.src
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-14
 * @updated     2026-11-14
 *
 * @description Type declarations for project asset modules and custom font imports.
 */

declare module '*.woff?url' {
  const assetUrl: string
  export default assetUrl
}

declare module 'node:fs/promises' {
  export function readFile(path: string): Promise<Uint8Array>
}

declare const process: {
  cwd(): string
}
