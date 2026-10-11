/**
 * 파일 내보내기/불러오기 모듈 (브라우저의 다운로드·파일 선택 API)
 * 화면 코드는 이 파일의 함수만 쓴다. Capacitor 전환 시 이 파일만 교체한다.
 */

/** 문자열을 파일로 내려받게 한다 */
export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 파일 선택 창을 열어 텍스트 파일 내용을 돌려준다. 취소하면 null */
export function pickTextFile(accept = '.json,application/json'): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      file.text().then(resolve, () => resolve(null))
    }
    // 창을 닫아 버리면 onchange 가 안 오므로, 포커스가 돌아왔을 때 파일이 없으면 취소로 본다
    window.addEventListener(
      'focus',
      () => setTimeout(() => { if (!input.files?.length) resolve(null) }, 500),
      { once: true },
    )
    input.click()
  })
}
