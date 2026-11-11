/**
 * @file        index.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.common
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-07
 * @updated     2026-11-12
 *
 * @description Central export index for shared common components including View-First Edit Mode governance tools.
 */

export { default as EditModeBar } from './EditModeBar'
export type { EditModeBarProps } from './EditModeBar'

export { default as DeleteConfirmationModal } from './DeleteConfirmationModal'
export type { DeleteConfirmationModalProps } from './DeleteConfirmationModal'

export {
  LockedButton,
  LockedIconButton,
  LockedLinkButton,
} from './LockedAction'
export type {
  LockedButtonProps,
  LockedIconButtonProps,
  LockedLinkButtonProps,
} from './LockedAction'

export { default as DemoBadge } from './DemoBadge'
export { default as TrainingModeBanner } from './TrainingModeBanner'
export { default as EnvironmentSwitchModal } from './EnvironmentSwitchModal'

export { default as SortableHeader } from './SortableHeader'
export type { SortableHeaderProps } from './SortableHeader'

export { default as TableSortSelect } from './TableSortSelect'
export type { TableSortSelectProps, TableSortOption } from './TableSortSelect'

export { ConcessionTraceModal } from './ConcessionTraceModal'
export { default as ContextualHelpButton, resolveContextualHelpPath } from './ContextualHelpButton'
