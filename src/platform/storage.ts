/**
 * 저장소 모듈 (Dexie = IndexedDB 를 쉽게 쓰게 해 주는 라이브러리)
 * 화면 코드와 학습 로직은 이 파일의 함수만 쓴다. Capacitor 전환 시 이 파일만 교체한다.
 *
 * 테이블
 *  - progress: 단어별 학습 상태 (키 word_id)
 *  - settings: 설정값 (키 key)
 * 구조 버전(SCHEMA_VERSION)을 올릴 때는 Dexie 의 version().upgrade() 로 옛 기록을 변환한다.
 */
import Dexie, { type EntityTable } from 'dexie'
import type { WordProgress } from '../types'

export const SCHEMA_VERSION = 1

interface SettingRow {
  key: string
  value: unknown
}

const db = new Dexie('jlpt-app') as Dexie & {
  progress: EntityTable<WordProgress, 'word_id'>
  settings: EntityTable<SettingRow, 'key'>
}

db.version(SCHEMA_VERSION).stores({
  progress: 'word_id, level',
  settings: 'key',
})

/** 브라우저에 "이 사이트 데이터는 지우지 말아 달라"고 요청한다 (아이폰 사파리의 7일 삭제 대비). 거절될 수 있다 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist()
  } catch {
    // 지원하지 않는 환경이면 조용히 넘어간다
  }
  return false
}

export async function loadAllProgress(): Promise<WordProgress[]> {
  return db.progress.toArray()
}

export async function saveProgress(p: WordProgress): Promise<void> {
  await db.progress.put(p)
}

/** 한 단어의 기록 삭제 (직전 평가 취소로 첫 기록을 되돌릴 때) */
export async function deleteProgress(wordId: string): Promise<void> {
  await db.progress.delete(wordId)
}

/** 전부 지우고 주어진 목록으로 바꾼다 (불러오기용) */
export async function replaceAllProgress(list: WordProgress[]): Promise<void> {
  await db.transaction('rw', db.progress, async () => {
    await db.progress.clear()
    await db.progress.bulkPut(list)
  })
}

export async function clearAllProgress(): Promise<void> {
  await db.progress.clear()
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key)
  return row?.value as T | undefined
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

export async function loadAllSettings(): Promise<Record<string, unknown>> {
  const rows = await db.settings.toArray()
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export async function replaceAllSettings(values: Record<string, unknown>): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    await db.settings.clear()
    await db.settings.bulkPut(Object.entries(values).map(([key, value]) => ({ key, value })))
  })
}
