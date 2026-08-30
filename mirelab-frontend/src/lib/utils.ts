import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * shadcn 컴포넌트들이 쓰는 클래스 합치기 헬퍼. twMerge 가 뒤에 온 유틸리티를 이기게 해줘서,
 * 컴포넌트 기본 클래스에 부르는 쪽 className 을 얹어도 같은 축(px-3 vs px-5 등)이 부딪히지
 * 않는다 — 이 파일이 없으면 src/components/ui 의 컴포넌트가 전부 컴파일되지 않는다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
