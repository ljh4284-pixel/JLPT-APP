interface Props {
  answered: number
  correct: number          // '다시' 가 아닌 평가 수
  tomorrowCount: number    // 내일까지 기한인 카드 수
  pendingCount: number     // 세션에서 미루고 끝낸 재출제 카드 수
  remainingCount: number   // 끝내기로 남긴 카드 수 (다음에 켤 때 그대로 나온다)
  timeUp: boolean          // 세션 시간 제한으로 끝났는지
  sessionMinutes: number   // 설정한 시간 제한 (0 이면 없음)
  message: string | null
  onHome: () => void
}

/** 세션 종료: 오늘 정답률, 내일 예정 수, 남긴 카드 안내 */
export function Done({ answered, correct, tomorrowCount, pendingCount, remainingCount, timeUp, sessionMinutes, message, onHome }: Props) {
  const rate = answered === 0 ? 0 : Math.round((correct / answered) * 100)
  return (
    <>
      <main className="content center">
        <p className="level">{timeUp ? `${sessionMinutes}분 완료` : '완료'}</p>
        {timeUp && <p className="muted small">정한 시간이 지나 여기서 마칩니다. 남은 카드는 다음에 이어서 나옵니다</p>}
        <p className="stats">
          오늘 정답률 <b>{rate}%</b>
          <span className="muted small"> ({answered}개 중 {correct}개, '다시' 제외)</span>
        </p>
        <p className="stats">내일 예정 <b>{tomorrowCount}</b>개</p>
        {remainingCount > 0 && (
          <p className="muted small">아직 안 본 카드 {remainingCount}개는 다음에 켤 때 그대로 나옵니다</p>
        )}
        {pendingCount > 0 && (
          <p className="muted small">곧 다시 볼 카드 {pendingCount}개는 기한이 되면 홈의 복습에 나타납니다</p>
        )}
        {message && <p className="message">{message}</p>}
      </main>
      <footer className="actions">
        <button className="btn primary" onClick={onHome}>처음으로</button>
      </footer>
    </>
  )
}
