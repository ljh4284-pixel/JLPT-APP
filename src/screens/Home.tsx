import { LEVELS } from '../data/words'

interface Props {
  level: string
  availableLevels: readonly string[]   // 단어장이 준비된 급수
  dueCount: number
  newCount: number
  learnedCount: number       // 기록이 있는 단어 수
  message: string | null     // 불러오기 결과 등 한 줄 안내
  onLevelChange: (level: string) => void
  onStart: () => void
  onProgress: () => void
  onSettings: () => void
}

/** 홈: 급수 선택, 오늘 복습/신규 개수, [시작], 진도·설정으로 가는 링크 */
export function Home({
  level, availableLevels, dueCount, newCount, learnedCount, message, onLevelChange, onStart, onProgress, onSettings,
}: Props) {
  const total = dueCount + newCount
  return (
    <>
      <header className="topbar">
        <button type="button" className="link" onClick={onProgress}>진도</button>
        <button type="button" className="link" onClick={onSettings}>설정</button>
      </header>
      <main className="content center">
        <div className="seg" role="group" aria-label="급수 선택">
          {LEVELS.map((l) => {
            const ready = availableLevels.includes(l)
            return (
              <button
                key={l}
                type="button"
                className={level === l ? 'on' : ''}
                disabled={!ready}
                title={ready ? undefined : '준비 중'}
                onClick={() => onLevelChange(l)}
              >
                {l}
              </button>
            )
          })}
        </div>
        <h1 className="level">{level}</h1>
        <p className="counts">
          오늘 복습 <b>{dueCount}</b>개 · 신규 <b>{newCount}</b>개
        </p>
        {total === 0 && <p className="muted small">오늘 할 카드가 없습니다</p>}
        <p className="muted small top-gap">학습한 단어 {learnedCount}개 · 기록은 이 기기에 자동 저장됩니다</p>
        {message && <p className="message">{message}</p>}
      </main>
      <footer className="actions">
        <button className="btn primary" onClick={onStart} disabled={total === 0}>시작</button>
      </footer>
    </>
  )
}
