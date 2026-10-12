import type { Word } from '../types'

/** 급수 목록 (쉬운 순) */
export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const
export type Level = (typeof LEVELS)[number]

/**
 * 급수별 단어장 불러오기 (급수별 분리 로딩, PROJECT.md 5장·10장 7단계)
 * 파일이 있는 급수만 여기 등록한다. 동적 import 라서 선택한 급수의 파일만 내려받는다.
 */
const loaders: Partial<Record<Level, () => Promise<Word[]>>> = {
  N5: () => import('./words_n5.json').then((m) => m.default as Word[]),
  N4: () => import('./words_n4.json').then((m) => m.default as Word[]),
  N3: () => import('./words_n3.json').then((m) => m.default as Word[]),
}

/** 단어장이 준비된 급수인지 */
export function hasWordList(level: string): boolean {
  return level in loaders
}

/** 단어장이 준비된 급수 목록 */
export function availableLevels(): Level[] {
  return LEVELS.filter((l) => hasWordList(l))
}

/** 급수의 단어장. 준비되지 않은 급수는 빈 목록 */
export async function loadWords(level: string): Promise<Word[]> {
  const load = loaders[level as Level]
  return load ? load() : []
}
