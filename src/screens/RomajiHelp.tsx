import { ROMAJI_HELP_ROWS } from '../logic/romaji'

interface Props {
  onClose: () => void
}

/**
 * 로마자 입력 도움말 (PROJECT.md 3장 C). 읽기 입력 화면과 설정에서 필요할 때 열어 본다.
 * 아래에서 올라오는 시트 형태. 바깥을 누르거나 닫기를 누르면 닫힌다. 입력 중인 내용은 그대로 남는다.
 */
export function RomajiHelp({ onClose }: Props) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="로마자 입력 방법" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>로마자 입력 방법</h2>
        <p className="muted small">
          일본어 키보드(Microsoft IME)와 같은 규칙입니다. 끝에 남은 n 같은 글자는 확인을 누를 때 마저 변환됩니다.
        </p>
        <table className="help-table">
          <thead>
            <tr>
              <th>소리</th>
              <th>치는 법</th>
              <th>예</th>
            </tr>
          </thead>
          <tbody>
            {ROMAJI_HELP_ROWS.map((r) => (
              <tr key={r.sound}>
                <td>{r.sound}</td>
                <td>{r.how}</td>
                <td lang="ja">
                  {r.examples.map(([romaji, kana]) => (
                    <span key={romaji} className="help-ex">
                      {romaji} → {kana}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small top-gap">
          가장 자주 틀리는 곳: ん 뒤에 な행이 올 때는 n을 세 번(minnna → みんな) 또는 n'(min'na)으로 칩니다.
          minna 라고 치면 みんあ가 됩니다.
        </p>
        <button type="button" className="btn primary" onClick={onClose}>닫기</button>
      </div>
    </div>
  )
}
