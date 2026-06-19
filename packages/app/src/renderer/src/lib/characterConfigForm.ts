import type { ArousalData, CharacterConfig } from '@gen-adventure/shared'

export interface ValidationError {
  message: string
}

export interface ArousalFieldMeta {
  key: keyof ArousalData
  label: string
  type: 'number' | 'boolean'
  required?: boolean
  /** Hidden (and stripped on save) unless the matching anatomy flag is on. */
  gate?: 'penis' | 'vagina'
  /** Verbatim from the schema comments — shown as a hover tooltip. */
  tooltip?: string
}

// Order: required ttos, then vagina-gated, penis-gated, receiver ttos, multipliers.
export const AROUSAL_FIELDS: ArousalFieldMeta[] = [
  { key: 'vaginal_sex_tto', label: 'Vaginal sex tto', type: 'number', required: true },
  { key: 'anal_sex_tto', label: 'Anal sex tto', type: 'number', required: true },
  { key: 'fingering_anus_tto', label: 'Fingering anus tto', type: 'number', required: true, tooltip: 'for anus character' },

  { key: 'orgasm_time', label: 'Orgasm time (s)', type: 'number', tooltip: 'only for vagina characters in seconds' },
  { key: 'squirt_time', label: 'Squirt time (s)', type: 'number', gate: 'vagina', tooltip: 'only for vagina characters in seconds' },
  { key: 'fingering_tto', label: 'Fingering tto', type: 'number', gate: 'vagina', tooltip: 'for vagina character' },

  { key: 'manual_boner', label: 'Manual boner', type: 'boolean', gate: 'penis', tooltip: 'only for player with penis. ignores auto_boner_orgasm_percent' },
  { key: 'manual_ejaculate', label: 'Manual ejaculate', type: 'boolean', gate: 'penis', tooltip: 'only for player with penis. can cum at any time' },
  { key: 'auto_boner_orgasm_percent', label: 'Auto boner orgasm %', type: 'number', gate: 'penis', tooltip: 'only for penis character' },
  { key: 'boner_after_sexual_arousal', label: 'Boner after sexual arousal', type: 'number', gate: 'penis', tooltip: 'only for npc with penis' },

  { key: 'handjob_tto', label: 'Handjob tto', type: 'number', tooltip: 'for penis character' },
  { key: 'blowjob_tto', label: 'Blowjob tto', type: 'number', tooltip: 'for penis character' },
  { key: 'tit_job_tto', label: 'Tit job tto', type: 'number', tooltip: 'for penis character' },
  { key: 'foot_job_tto', label: 'Foot job tto', type: 'number', tooltip: 'for penis character' },

  { key: 'handjob_mult', label: 'Handjob mult', type: 'number', tooltip: 'for hand character' },
  { key: 'blowjob_mult', label: 'Blowjob mult', type: 'number', tooltip: 'for sucking character' },
  { key: 'tit_job_mult', label: 'Tit job mult', type: 'number', tooltip: 'for tit character' },
  { key: 'foot_job_mult', label: 'Foot job mult', type: 'number', tooltip: 'for foot character' }
]

export const REQUIRED_TTOS = ['vaginal_sex_tto', 'anal_sex_tto', 'fingering_anus_tto'] as const

export function defaultArousal(): ArousalData {
  return {
    orgasm_time: 30,
    squirt_time: 10,
    vaginal_sex_tto: 2,
    anal_sex_tto: 2,
    fingering_tto: 4,
    fingering_anus_tto: 4
  }
}

export function emptyConfig(): CharacterConfig {
  return {
    pronouns: { heShe: '', himHer: '', hisHer: '' },
    appearanceEntryIds: [],
    arousalData: defaultArousal()
  }
}

/** Normalize a (possibly partial/malformed) CharacterConfig JSON string into a full
 *  CharacterConfig. Returns null on empty or malformed input so callers can keep
 *  their current state. */
export function parseCharacterConfig(raw: string): CharacterConfig | null {
  try {
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CharacterConfig>
    return {
      pronouns: {
        heShe: parsed.pronouns?.heShe ?? '',
        himHer: parsed.pronouns?.himHer ?? '',
        hisHer: parsed.pronouns?.hisHer ?? ''
      },
      personalityId: parsed.personalityId,
      appearanceEntryIds: parsed.appearanceEntryIds ?? [],
      hasTits: parsed.hasTits,
      hasVagina: parsed.hasVagina,
      hasPenis: parsed.hasPenis,
      arousalData: { ...defaultArousal(), ...(parsed.arousalData ?? {}) }
    }
  } catch {
    return null
  }
}

export function isVisible(f: ArousalFieldMeta, config: CharacterConfig): boolean {
  if (f.gate === 'penis') return !!config.hasPenis
  if (f.gate === 'vagina') return !!config.hasVagina
  return true
}

export function isFiniteArousal(config: CharacterConfig, key: keyof ArousalData): boolean {
  const v = config.arousalData[key]
  return typeof v === 'number' && Number.isFinite(v)
}

export function collectErrors(config: CharacterConfig, appearanceIdSet: Set<string>): ValidationError[] {
  const errs: ValidationError[] = []

  if (!config.pronouns.heShe.trim()) errs.push({ message: 'Pronouns: he/she is required' })
  if (!config.pronouns.himHer.trim()) errs.push({ message: 'Pronouns: him/her is required' })
  if (!config.pronouns.hisHer.trim()) errs.push({ message: 'Pronouns: his/her is required' })

  const seen = new Set<string>()
  config.appearanceEntryIds.forEach((id, i) => {
    if (!id) errs.push({ message: `Appearance entry #${i + 1}: none selected` })
    else if (!appearanceIdSet.has(id)) errs.push({ message: `Appearance entry "${id}" not found` })
    else if (seen.has(id)) errs.push({ message: `Appearance entry "${id}" is duplicated` })
    if (id) seen.add(id)
  })

  for (const key of REQUIRED_TTOS) {
    if (!isFiniteArousal(config, key)) errs.push({ message: `Arousal "${key}": a number is required` })
  }
  return errs
}

/** Strips hidden / inapplicable fields, keeping required ttos plus visible values. */
export function buildOutput(config: CharacterConfig): CharacterConfig {
  const arousal: Record<string, number | boolean> = {
    vaginal_sex_tto: config.arousalData.vaginal_sex_tto,
    anal_sex_tto: config.arousalData.anal_sex_tto,
    fingering_anus_tto: config.arousalData.fingering_anus_tto
  }
  for (const f of AROUSAL_FIELDS) {
    if (f.required || !isVisible(f, config)) continue
    const v = config.arousalData[f.key]
    if (v === undefined || v === null) continue
    arousal[f.key] = v
  }

  const out: CharacterConfig = {
    pronouns: config.pronouns,
    appearanceEntryIds: config.appearanceEntryIds.filter(Boolean),
    arousalData: arousal as unknown as ArousalData
  }
  if (config.personalityId) out.personalityId = config.personalityId
  if (config.hasTits) out.hasTits = true
  if (config.hasVagina) out.hasVagina = true
  if (config.hasPenis) out.hasPenis = true
  return out
}
