/**
 * PWA(홈 화면 설치형 웹앱) 등록 모듈. 화면 코드는 이 함수만 부른다.
 * 서비스 워커(public/sw.js)는 배포 빌드에서만 켠다. 개발 서버에서는 파일이 저장돼 버려 수정이 안 보이기 때문이다.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((e) => {
      console.error('서비스 워커 등록 실패', e)
    })
  })
}
