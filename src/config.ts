/**
 * 세션·스케줄 기본값. 설정 화면(6단계)에서 바꿀 수 있게 될 값들을 한곳에 모아 둔다.
 */

/** 세션당 신규 단어 수 (PROJECT.md 6장: 기본 5) */
export const NEW_PER_SESSION = 5

/** 세션 내 오답(다시) 재출제 간격. FSRS 의 학습 단계로 쓴다 (PROJECT.md 6장: 10분) */
export const RELEARN_STEP = '10m' as const
