interface Props {
  level: string
  dueCount: number
  newCount: number
  onStart: () => void
}

/** 홈: 급수 표시, 오늘 복습/신규 개수, [시작] */
export function Home({ level, dueCount, newCount, onStart }: Props) {
  const total = dueCount + newCount
  return (
    <>
      <main className="content center">
        <h1 className="level">{level}</h1>
        <p className="counts">
          오늘 복습 <b>{dueCount}</b>개 · 신규 <b>{newCount}</b>개
        </p>
        {total === 0 && <p className="muted small">오늘 할 카드가 없습니다</p>}
      </main>
      <footer className="actions">
        <button className="btn primary" onClick={onStart} disabled={total === 0}>시작</button>
      </footer>
    </>
  )
}
