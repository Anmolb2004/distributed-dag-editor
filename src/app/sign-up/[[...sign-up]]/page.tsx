import { SignUp } from "@clerk/nextjs";
import { Workflow } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4">
      <div className="mb-8 flex items-center gap-3">
        <Workflow className="h-8 w-8 text-[#A855F7]" />
        <span className="text-2xl font-bold tracking-tight text-white">
          NextFlow
        </span>
      </div>
      <SignUp />
      <p className="mt-8 text-center text-xs text-[#71717A]">
        Visual LLM Workflow Builder powered by Google Gemini
      </p>
    </div>
  );
}
