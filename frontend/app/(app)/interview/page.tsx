import { Suspense } from "react";
import { InterviewFlow } from "@/components/interview/InterviewFlow";

export default function InterviewPage() {
  return (
    <Suspense fallback={null}>
      <InterviewFlow />
    </Suspense>
  );
}
