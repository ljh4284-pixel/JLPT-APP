import { useState } from 'react'
import type { InputMode, QuestionType } from '../types'
import {
  MAX_NEW_PER_DAY,
  MAX_WEIGHT,
  MIN_NEW_PER_DAY,
  SESSION_MINUTE_OPTIONS,
  TYPE_LABEL,
  typeCycle,
  weightsFor,
  type Settings as SettingsValue,
} from '../learning/settings'
import { RomajiHelp } from './RomajiHelp'

interface Props {
  level: string
  settings: SettingsValue
  voices: { name: string; label: string }[]
  suspended: { id: string; label: string }[]   // 일시 제외한 단어
  message: string | null
  onChange: (next: SettingsValue) => void
  onRestore: (id: string) => void
  onExport: () => void
  onImport: () => void
  onReset: () => void
  onClose: () => void
}

const TYPES: QuestionType[] = ['A', 'B', 'C']

/** 설정: 신규 단어 수/일, 문제 유형 비중, 입력 방식, 목소리, 데이터 내보내기/불러오기/초기화 */
function formatBackupTime(iso: string | null): string {
  if (!iso) return '아직 없음'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '아직 없음'
  return d.toLocaleString()
}

/** 설정: 신규 단어 수/일, 세션 시간 제한, 문제 유형 비중, 입력 방식, 목소리, 제외한 단어, 데이터 */
export function Settings({ level, settings, voices, suspended, message, onChange, onRestore, onExport, onImport, onReset, onClose }: Props) {
  const [confirmReset, setConfirmReset] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const weights = weightsFor(settings, level)
  const cycle = typeCycle(weights)

  function setWeight(t: QuestionType, value: number) {
    onChange({
      ...settings,
      weightsByLevel: { ...settings.weightsByLevel, [level]: { ...weights, [t]: value } },
    })
  }

  return (
    <>
      <header className="topbar">
        <span>설정</span>
        <button type="button" className="link" onClick={onClose}>닫기</button>
      </header>
      <main className="content settings">
        <section>
          <h2>하루 신규 단어 수</h2>
          <div className="stepper">
            <button
              type="button"
              className="btn small-btn"
              disabled={settings.newPerDay <= MIN_NEW_PER_DAY}
              onClick={() => onChange({ ...settings, newPerDay: settings.newPerDay - 1 })}
              aria-label="줄이기"
            >
              −
            </button>
            <b>{settings.newPerDay}개</b>
            <button
              type="button"
              className="btn small-btn"
              disabled={settings.newPerDay >= MAX_NEW_PER_DAY}
              onClick={() => onChange({ ...settings, newPerDay: settings.newPerDay + 1 })}
              aria-label="늘리기"
            >
              +
            </button>
          </div>
          <p className="muted small">복습은 기한이 된 카드가 전부 나오고, 신규는 이 개수만큼 섞입니다. 하루 한도라서 세션을 다시 시작해도 늘지 않습니다</p>
        </section>

        <section>
          <h2>세션 시간 제한</h2>
          <div className="seg">
            {SESSION_MINUTE_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                className={settings.sessionMinutes === m ? 'on' : ''}
                onClick={() => onChange({ ...settings, sessionMinutes: m })}
              >
                {m === 0 ? '없음' : `${m}분`}
              </button>
            ))}
          </div>
          <p className="muted small">시간이 지나면 지금 문제까지만 하고 끝냅니다. 남은 카드는 다음에 이어서 나옵니다. 문제 도중에는 위쪽 '끝내기'로 언제든 마칠 수 있습니다</p>
        </section>

        <section>
          <h2>문제 유형 비중 ({level})</h2>
          {TYPES.map((t) => (
            <div className="weight-row" key={t}>
              <span className="weight-label">{TYPE_LABEL[t]}</span>
              <div className="seg">
                {Array.from({ length: MAX_WEIGHT + 1 }, (_, v) => (
                  <button
                    key={v}
                    type="button"
                    className={weights[t] === v ? 'on' : ''}
                    onClick={() => setWeight(t, v)}
                  >
                    {v === 0 ? '끔' : v}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="muted small">
            출제 순서: {cycle.map((t) => TYPE_LABEL[t]).join(' → ')} (반복)
            <br />
            읽기 고르기는 한 번 맞힌 단어에만 나오고, 처음 보는 단어에는 나오지 않습니다
          </p>
        </section>

        <section>
          <h2>읽기 입력 방식</h2>
          <div className="seg">
            {(['romaji', 'kana'] as InputMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={settings.inputMode === m ? 'on' : ''}
                onClick={() => onChange({ ...settings, inputMode: m })}
              >
                {m === 'romaji' ? '로마자' : '일본어 자판'}
              </button>
            ))}
          </div>
          <p className="muted small">
            <button type="button" className="link" onClick={() => setShowHelp(true)}>로마자 입력 방법 보기</button>
          </p>
        </section>

        <section>
          <h2>목소리</h2>
          <div className="seg">
            {voices.map((v) => (
              <button
                key={v.name}
                type="button"
                className={settings.voice === v.name ? 'on' : ''}
                onClick={() => onChange({ ...settings, voice: v.name })}
              >
                {v.label}
              </button>
            ))}
          </div>
          {voices.length < 2 && <p className="muted small">다른 목소리는 다음 단계에서 추가됩니다</p>}
        </section>

        <section>
          <h2>제외한 단어</h2>
          {suspended.length === 0 ? (
            <p className="muted small">없음. 문제가 있는 단어는 정답 화면 아래 '일시 제외'로 뺄 수 있습니다</p>
          ) : (
            <ul className="suspended-list">
              {suspended.map((s) => (
                <li key={s.id}>
                  <span lang="ja">{s.label}</span>
                  <button type="button" className="link" onClick={() => onRestore(s.id)}>복구</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2>데이터</h2>
          <div className="data-row">
            <button type="button" className="link" onClick={onExport}>기록 내보내기</button>
            <span className="muted">·</span>
            <button type="button" className="link" onClick={onImport}>기록 불러오기</button>
            <span className="muted">·</span>
            {confirmReset ? (
              <>
                <button type="button" className="link danger" onClick={() => { setConfirmReset(false); onReset() }}>
                  정말 지우기
                </button>
                <button type="button" className="link" onClick={() => setConfirmReset(false)}>취소</button>
              </>
            ) : (
              <button type="button" className="link" onClick={() => setConfirmReset(true)}>기록 초기화</button>
            )}
          </div>
          <p className="muted small">기록은 이 기기에 자동 저장됩니다. 다른 기기로 옮기거나 백업하려면 내보내기를 쓰세요</p>
          <p className="muted small">마지막 백업: {formatBackupTime(settings.lastBackupAt)}</p>
          {message && <p className="message">{message}</p>}
        </section>
      </main>
      <footer className="actions">
        <button className="btn primary" onClick={onClose}>닫기</button>
      </footer>
      {showHelp && <RomajiHelp onClose={() => setShowHelp(false)} />}
    </>
  )
}
