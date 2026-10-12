interface Props {
  due: Date          // 가장 먼저 다시 볼 카드의 기한
  now: Date          // 현재 시각 (부모가 1초마다 갱신)
  count: number      // 다시 볼 카드 수
  onNow: () => void  // 기한 전이라도 바로 보기
  onEnd: () => void  // 오늘은 여기까지
}

function remainingText(due: Date, now: Date): string {
  const sec = Math.max(0, Math.ceil((due.getTime() - now.getTime()) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}

/** 세션 내 재출제 대기: 다른 카드는 다 끝났고, 오답 카드의 10분이 아직 안 지났을 때 */
export function Waiting({ due, now, count, onNow, onEnd }: Props) {
  return (
    <>
      <main className="content center">
        <p className="label">잠시 뒤 다시 봅니다</p>
        <p className="countdown">{remainingText(due, now)}</p>
        <p className="muted">다시 볼 카드 {count}개</p>
        <p className="muted small top-gap">'다시'는 10분 뒤, '어려움'은 15분 뒤에 다시 나옵니다. 기다리지 않으려면 바로 볼 수 있고, 지금 끝내면 다음에 켤 때 이어서 나옵니다.</p>
      </main>
      <footer className="actions">
        <button className="btn primary" onClick={onNow}>지금 바로 보기</button>
        <button className="btn" onClick={onEnd}>오늘은 여기까지</button>
      </footer>
    </>
  )
}
