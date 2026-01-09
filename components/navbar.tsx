"use client";

import { Box } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mx-auto ">
      <div className="container flex h-16 max-w-7xl items-center justify-between mx-auto">
        {/* Logo Section */}
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Box className="size-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-semibold tracking-tight">
            <span className="text-primary">MCP</span>Marshall
          </span>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/register"
            className={buttonVariants({ variant: "secondary" })}
          >
            Sign up
          </Link>
          <Link href="/auth/login" className={buttonVariants()}>
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
