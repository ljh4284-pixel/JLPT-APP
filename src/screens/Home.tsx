import { useState } from 'react'

interface Props {
  level: string
  dueCount: number
  newCount: number
  learnedCount: number       // 기록이 있는 단어 수
  message: string | null     // 불러오기 결과 등 한 줄 안내
  onStart: () => void
  onExport: () => void
  onImport: () => void
  onReset: () => void
}

/** 홈: 급수 표시, 오늘 복습/신규 개수, [시작], 기록 내보내기/불러오기/초기화 */
export function Home({ level, dueCount, newCount, learnedCount, message, onStart, onExport, onImport, onReset }: Props) {
  const total = dueCount + newCount
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <>
      <main className="content center">
        <h1 className="level">{level}</h1>
        <p className="counts">
          오늘 복습 <b>{dueCount}</b>개 · 신규 <b>{newCount}</b>개
        </p>
        {total === 0 && <p className="muted small">오늘 할 카드가 없습니다</p>}
        <p className="muted small top-gap">학습한 단어 {learnedCount}개 · 기록은 이 기기에 자동 저장됩니다</p>

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
        {message && <p className="message">{message}</p>}
      </main>
      <footer className="actions">
        <button className="btn primary" onClick={onStart} disabled={total === 0}>시작</button>
      </footer>
    </>
  )
}
