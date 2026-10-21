import Image from "../opengraph-image";

// /story 공유 썸네일도 서비스와 같은 그림을 쓴다 (페이지 metadata에 직접 적으면 type 태그가 빠지고 캐시도 옛 것이 남아서 파일 규칙으로 지정)
export const alt = "오늘 번 돈 — 치킨·피자·떡볶이가 하늘에서 쏟아지는 그림";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default Image;
