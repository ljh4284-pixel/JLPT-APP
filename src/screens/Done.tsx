interface Props {
  answered: number
  correct: number          // '다시' 가 아닌 평가 수
  tomorrowCount: number    // 내일까지 기한인 카드 수
  pendingCount: number     // 세션에서 미루고 끝낸 재출제 카드 수
  onHome: () => void
}

/** 세션 종료: 오늘 정답률, 내일 예정 수 */
export function Done({ answered, correct, tomorrowCount, pendingCount, onHome }: Props) {
  const rate = answered === 0 ? 0 : Math.round((correct / answered) * 100)
  return (
    <>
      <main className="content center">
        <p className="level">완료</p>
        <p className="stats">
          오늘 정답률 <b>{rate}%</b>
          <span className="muted small"> ({answered}개 중 {correct}개, '다시' 제외)</span>
        </p>
        <p className="stats">내일 예정 <b>{tomorrowCount}</b>개</p>
        {pendingCount > 0 && (
          <p className="muted small">곧 다시 볼 카드 {pendingCount}개는 기한이 되면 홈의 복습에 나타납니다</p>
        )}
      </main>
      <footer className="actions">
        <button className="btn primary" onClick={onHome}>처음으로</button>
      </footer>
    </>
  )
}
