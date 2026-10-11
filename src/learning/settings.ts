/**
 * 설정값 (PROJECT.md 6장 설정 화면)
 * 저장은 platform/storage.ts 의 settings 테이블에 'settings' 키 하나로 통째로 둔다.
 * 순수 함수: 기본값 채우기, 범위 제한, 문제 유형 순환 순서 만들기.
 */
import type { InputMode, QuestionType } from '../types'
import { NEW_PER_SESSION } from '../config'

/** 유형별 비중 0~3. 0 이면 그 유형은 내지 않는다 */
export type TypeWeights = Record<QuestionType, number>

export interface Settings {
  newPerDay: number                          // 하루 신규 단어 수 (1~20)
  weightsByLevel: Record<string, TypeWeights> // 급수별 문제 유형 비중
  inputMode: InputMode
  voice: string                              // 목소리 이름 (audio.ts 의 VOICE_NAME 과 같은 체계)
}

export const MAX_WEIGHT = 3
export const MIN_NEW_PER_DAY = 1
export const MAX_NEW_PER_DAY = 20

/** 급수별 기본 비중. N5 는 뜻 회상 중심에 읽기 고르기·발음 입력을 섞는다 (PROJECT.md 3장, 사용자 결정 2026-10-11) */
export const DEFAULT_WEIGHTS: Record<string, TypeWeights> = {
  N5: { A: 2, B: 1, C: 1 },
  N4: { A: 2, B: 1, C: 2 },
  N3: { A: 2, B: 1, C: 2 },
  N2: { A: 1, B: 1, C: 2 },
  N1: { A: 1, B: 1, C: 2 },
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: NEW_PER_SESSION,
  weightsByLevel: DEFAULT_WEIGHTS,
  inputMode: 'romaji',
  voice: 'ja-JP-Chirp3-HD-Charon',
}

export const SETTINGS_KEY = 'settings'

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : fallback
  return Math.min(max, Math.max(min, v))
}

/** 저장된 값(불완전할 수 있음)을 기본값으로 채워 올바른 설정으로 만든다 */
export function normalizeSettings(raw: unknown): Settings {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const weightsByLevel: Record<string, TypeWeights> = {}
  const rawWeights = (typeof r.weightsByLevel === 'object' && r.weightsByLevel !== null ? r.weightsByLevel : {}) as Record<string, unknown>
  for (const level of Object.keys(DEFAULT_WEIGHTS)) {
    const w = (typeof rawWeights[level] === 'object' && rawWeights[level] !== null ? rawWeights[level] : {}) as Record<string, unknown>
    const d = DEFAULT_WEIGHTS[level]
    weightsByLevel[level] = {
      A: clamp(w.A, 0, MAX_WEIGHT, d.A),
      B: clamp(w.B, 0, MAX_WEIGHT, d.B),
      C: clamp(w.C, 0, MAX_WEIGHT, d.C),
    }
  }
  return {
    newPerDay: clamp(r.newPerDay, MIN_NEW_PER_DAY, MAX_NEW_PER_DAY, DEFAULT_SETTINGS.newPerDay),
    weightsByLevel,
    inputMode: r.inputMode === 'kana' ? 'kana' : 'romaji',
    voice: typeof r.voice === 'string' && r.voice ? r.voice : DEFAULT_SETTINGS.voice,
  }
}

/** 급수의 비중. 없으면 N5 기본값 */
export function weightsFor(settings: Settings, level: string): TypeWeights {
  return settings.weightsByLevel[level] ?? DEFAULT_WEIGHTS.N5
}

/**
 * 비중을 출제 순서로 바꾼다. 예: {A:2, B:1, C:1} → [A, B, C, A]
 * 모든 비중이 0 이면 뜻 회상만 낸다 (아무 것도 안 내는 상태를 막기 위해)
 */
export function typeCycle(weights: TypeWeights): QuestionType[] {
  const out: QuestionType[] = []
  const types: QuestionType[] = ['A', 'B', 'C']
  const max = Math.max(weights.A, weights.B, weights.C)
  for (let i = 0; i < max; i++) {
    for (const t of types) if (weights[t] > i) out.push(t)
  }
  return out.length > 0 ? out : ['A']
}

/** 화면 표시용 유형 이름 */
export const TYPE_LABEL: Record<QuestionType, string> = { A: '뜻 회상', B: '읽기 고르기', C: '발음 입력' }
