import { notFound } from "next/navigation";
import { PreviewClient } from "./PreviewClient";

// 개발 전용: 원본 썸네일과 3D 모델을 나란히 비교하는 페이지. 배포 빌드에서는 404
export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PreviewClient />;
}
