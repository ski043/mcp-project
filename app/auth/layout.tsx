import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="absolute left-6 top-6 md:left-10 md:top-10">
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          <ArrowLeft />
          Go Back
        </Link>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
