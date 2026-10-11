/**
 * 백업 파일 형식 (JSON 내보내기/불러오기, PROJECT.md 7장)
 * 순수 함수. 파일 저장·읽기는 platform/file.ts, 저장소는 platform/storage.ts 가 맡는다.
 *
 * 형식:
 * { app: "jlpt-app", schema: 1, exported_at: ISO, progress: WordProgress[], settings: {...} }
 * fsrs_card 의 due, last_review 는 JSON 에서 문자열이 되므로 불러올 때 Date 로 되돌린다.
 */
import type { WordProgress } from '../types'

export const BACKUP_APP = 'jlpt-app'
export const BACKUP_SCHEMA = 1

export interface Backup {
  app: string
  schema: number
  exported_at: string
  progress: WordProgress[]
  settings: Record<string, unknown>
}

export function serializeBackup(progress: WordProgress[], settings: Record<string, unknown>, now: Date): string {
  const data: Backup = {
    app: BACKUP_APP,
    schema: BACKUP_SCHEMA,
    exported_at: now.toISOString(),
    progress,
    settings,
  }
  return JSON.stringify(data, null, 2)
}

export function backupFilename(now: Date): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `jlpt-backup-${y}${m}${d}.json`
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 백업 문자열을 검사하고 Date 를 되살린다. 형식이 틀리면 이유를 담은 Error 를 던진다 */
export function parseBackup(text: string): { progress: WordProgress[]; settings: Record<string, unknown> } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('JSON 파일이 아닙니다')
  }
  if (!isRecord(raw) || raw.app !== BACKUP_APP) throw new Error('이 앱의 백업 파일이 아닙니다')
  if (typeof raw.schema !== 'number' || raw.schema > BACKUP_SCHEMA) {
    throw new Error('더 새로운 버전의 앱에서 만든 백업입니다. 앱을 업데이트하세요')
  }
  if (!Array.isArray(raw.progress)) throw new Error('학습 기록 목록이 없습니다')

  const progress: WordProgress[] = raw.progress.map((item, i) => {
    if (!isRecord(item) || typeof item.word_id !== 'string' || !isRecord(item.fsrs_card)) {
      throw new Error(`${i + 1}번째 기록의 형식이 틀렸습니다`)
    }
    const card = { ...item.fsrs_card } as Record<string, unknown>
    card.due = new Date(String(card.due))
    if (typeof card.last_review === 'string') card.last_review = new Date(card.last_review)
    if (Number.isNaN((card.due as Date).getTime())) throw new Error(`${item.word_id} 의 복습 날짜가 올바르지 않습니다`)
    return {
      word_id: item.word_id,
      level: typeof item.level === 'string' ? item.level : '',
      fsrs_card: card as unknown as WordProgress['fsrs_card'],
      review_log: Array.isArray(item.review_log) ? (item.review_log as WordProgress['review_log']) : [],
    }
  })

  const settings = isRecord(raw.settings) ? raw.settings : {}
  return { progress, settings }
}
