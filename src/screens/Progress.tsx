import type { AccuracyStats, LevelStats } from '../learning/stats'
import { STABLE_DAYS } from '../learning/stats'

interface Props {
  levels: LevelStats[]
  accuracy: AccuracyStats
  onClose: () => void
}

/** 진도: 급수별 학습 단어 수, 복습 간격이 길어진 단어 수, 정답률과 등급 */
export function Progress({ levels, accuracy, onClose }: Props) {
  return (
    <>
      <header className="topbar">
        <span>진도</span>
        <button type="button" className="link" onClick={onClose}>닫기</button>
      </header>
      <main className="content settings">
        <section>
          <h2>급수별 진도</h2>
          {levels.map((l) => (
            <div key={l.level} className="progress-row">
              <b className="progress-level">{l.level}</b>
              <div className="progress-bar" aria-hidden="true">
                <div className="progress-fill stable" style={{ width: `${l.total ? (l.stable / l.total) * 100 : 0}%` }} />
                <div className="progress-fill learned" style={{ width: `${l.total ? ((l.learned - l.stable) / l.total) * 100 : 0}%` }} />
              </div>
              <span className="muted small">
                학습 {l.learned} / {l.total} · 간격 {STABLE_DAYS}일 이상 {l.stable}
              </span>
            </div>
          ))}
          <p className="muted small">간격 {STABLE_DAYS}일 이상 = 모델상 기억이 90% 남는 기간이 {STABLE_DAYS}일을 넘은 단어. 암기 완료가 아니라 복습 간격이 길어졌다는 뜻이며 계속 복습 대상입니다</p>
        </section>

        <section>
          <h2>정답률</h2>
          {accuracy.reviews === 0 ? (
            <p className="muted">아직 기록이 없습니다</p>
          ) : (
            <>
              <p className="stats">
                <b>{accuracy.rate}%</b>
                <span className={`grade grade-${accuracy.grade}`}>{accuracy.grade}</span>
              </p>
              <p className="muted small">
                평가 {accuracy.reviews}회 중 {accuracy.correct}회 ('다시' 제외) · 오늘 {accuracy.todayReviews}회 · 누적 약 {accuracy.totalMinutes}분
              </p>
              <p className="muted small">등급은 JLPT 성적표의 참고 정보와 같은 기준입니다. A 67% 이상, B 34% 이상, C 그 미만</p>
            </>
          )}
        </section>
      </main>
      <footer className="actions">
        <button className="btn primary" onClick={onClose}>닫기</button>
      </footer>
    </>
  )
}
