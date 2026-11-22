/**
 * @file        index.ts
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
 * @created     2026-11-07
 * @updated     2026-11-22
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
export { default as LicenseModeBanner } from './LicenseModeBanner'
export { default as EnvironmentSwitchModal } from './EnvironmentSwitchModal'

export { default as SortableHeader } from './SortableHeader'
export type { SortableHeaderProps } from './SortableHeader'

export { default as TableSortSelect } from './TableSortSelect'
export type { TableSortSelectProps, TableSortOption } from './TableSortSelect'

export { default as ContextualHelpButton, resolveContextualHelpPath } from './ContextualHelpButton'

export { ConcessionTraceModal } from './ConcessionTraceModal'

export { default as AgingReceivablesStackedBar } from './AgingReceivablesStackedBar'
export type {
  AgingReceivablesStackedBarProps,
  AgingBucket,
  AgingBracketId,
  DefaulterRecord,
} from './AgingReceivablesStackedBar'

export { default as AdmissionsFunnelChart } from './AdmissionsFunnelChart'
export { default as NepRoadmapModal } from './NepRoadmapModal'
export type { NepMilestone } from './NepRoadmapModal'

export type {
  AdmissionsFunnelChartProps,
  FunnelStageConfig,
} from './AdmissionsFunnelChart'

export { default as BatchCapacityBulletMeter } from './BatchCapacityBulletMeter'
export type {
  BatchCapacityBulletMeterProps,
} from './BatchCapacityBulletMeter'

