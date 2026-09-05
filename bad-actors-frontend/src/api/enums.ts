// Enum display helpers — DB values are already English, so maps are identity passthrough.
// Kept as thin wrappers so CrudPage configs don't need to change.

const id = <T extends string>(v: T, _map?: Record<string, string>) => v

export const ACTOR_TYPES: Record<string, string> = {}
export const ORG_TYPES: Record<string, string> = {}
export const RELATION_TYPES: Record<string, string> = {}
export const EVENT_CATEGORIES: Record<string, string> = {}
export const SEVERITY: Record<string, string> = {}
export const IMPORTANCE: Record<string, string> = {}
export const CONFIDENCE: Record<string, string> = {}
export const RISK_STATUS: Record<string, string> = {}
export const SIGNAL_STATUS: Record<string, string> = {}
export const INVESTIGATION_STATUS: Record<string, string> = {}
export const SOURCE_TYPES: Record<string, string> = {}
export const EVIDENCE_TYPES: Record<string, string> = {}
export const SIGNAL_TYPES: Record<string, string> = {}
export const RISK_CATEGORIES: Record<string, string> = {}
export const ENTRY_TYPES: Record<string, string> = {}
export const PROPERTY_TYPES: Record<string, string> = {}

export const t = id
