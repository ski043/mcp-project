"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRightIcon,
  BotIcon,
  BrainIcon,
  CalendarClockIcon,
  DatabaseIcon,
  KeyIcon,
  LayersIcon,
  MailIcon,
  MessageSquareIcon,
  ServerIcon,
  SparklesIcon,
  TrendingUpIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export function Homepage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,var(--primary)_0%,transparent_100%)] opacity-[0.07]" />
        <div className="container mx-auto max-w-6xl px-6 py-24 md:py-32 lg:py-40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <Badge variant="secondary" className="mb-6">
              <SparklesIcon className="mr-1.5 size-3" />
              AI-Powered Financial Intelligence
            </Badge>
            <h1 className="text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Your Portfolio,{" "}
              <span className="text-primary">Analyzed by AI</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              An intelligent agent that fetches real-time market data, analyzes your holdings,
              and delivers personalized insights via email, Notion, or Google Docs.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/register" className={buttonVariants({ size: "lg" })}>
                Get Started
                <ArrowRightIcon className="ml-2 size-4" />
              </Link>
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                View Dashboard
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="border-y border-border bg-muted/30 py-20 md:py-28">
        <div className="container mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <Badge variant="outline" className="mb-4">
              Architecture
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Three-Layer Agent Design
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              A production-ready architecture that separates data, memory, and presentation
              for maximum flexibility and reliability.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-16 grid gap-6 md:grid-cols-3"
          >
            {/* Data Layer */}
            <motion.div variants={itemVariants}>
              <Card className="h-full border-2 border-primary/20 bg-card">
                <CardHeader>
                  <div className="mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/10">
                    <ServerIcon className="size-6 text-primary" />
                  </div>
                  <CardTitle>Data Source Layer</CardTitle>
                  <CardDescription>
                    Custom MCP server fetching real-time financial data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      Stock prices & market data
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      Company fundamentals
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      Historical price trends
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      Market news & analysis
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Memory Layer */}
            <motion.div variants={itemVariants}>
              <Card className="h-full border-2 border-primary/20 bg-card">
                <CardHeader>
                  <div className="mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/10">
                    <DatabaseIcon className="size-6 text-primary" />
                  </div>
                  <CardTitle>Memory Layer</CardTitle>
                  <CardDescription>
                    Persistent storage for portfolios and reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      PostgreSQL database
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      Portfolio holdings
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      Generated reports
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      Chat history
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Presentation Layer */}
            <motion.div variants={itemVariants}>
              <Card className="h-full border-2 border-primary/20 bg-card">
                <CardHeader>
                  <div className="mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/10">
                    <LayersIcon className="size-6 text-primary" />
                  </div>
                  <CardTitle>Presentation Layer</CardTitle>
                  <CardDescription>
                    Multiple output channels for your insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      Interactive dashboard
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      Email via Gmail
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      Notion pages
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      Google Docs
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <Badge variant="outline" className="mb-4">
              Features
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Built for Production
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Every feature designed to work reliably in real-world scenarios.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            <motion.div variants={itemVariants} className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <BotIcon className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Custom MCP Server</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Python-based server using arcade-mcp for standardized tool interfaces.
                </p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <KeyIcon className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">OAuth Handling</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Seamless authentication with Gmail, Notion, and Google Docs via Arcade.
                </p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <CalendarClockIcon className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Scheduled Reports</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Automated weekly portfolio reports delivered via email on schedule.
                </p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquareIcon className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Interactive Chat</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask questions about your portfolio and get AI-powered insights in real-time.
                </p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <BrainIcon className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">LLM Summarization</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  AI-generated analysis that synthesizes market data into actionable insights.
                </p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUpIcon className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Real-Time Data</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Live market prices, news, and company data from Yahoo Finance.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="border-t border-border bg-muted/30 py-20 md:py-28">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="outline" className="mb-4">
                Powered by Arcade
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Effortless OAuth Integration
              </h2>
              <p className="mt-4 text-muted-foreground">
                Arcade handles the complexity of OAuth flows for Gmail, Notion, and Google Docs.
                No need to manage tokens, refresh cycles, or consent screens yourself.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                    <MailIcon className="size-3.5 text-primary" />
                  </div>
                  Send reports directly to Gmail
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                    <svg className="size-3.5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm0 9h7v7h-7v-7zm-9 0h7v7H4v-7z" />
                    </svg>
                  </div>
                  Export to Notion pages
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                    <svg className="size-3.5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                    </svg>
                  </div>
                  Create Google Docs automatically
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/auth/register" className={buttonVariants()}>
                  Try It Now
                  <ArrowRightIcon className="ml-2 size-4" />
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <Card className="border-2 border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base">OAuth Flow</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <div className="flex size-8 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
                      1
                    </div>
                    <div className="text-sm">User requests to publish report</div>
                  </div>
                  <div className="ml-4 h-6 w-px bg-border" />
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <div className="flex size-8 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
                      2
                    </div>
                    <div className="text-sm">Arcade checks authorization status</div>
                  </div>
                  <div className="ml-4 h-6 w-px bg-border" />
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <div className="flex size-8 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
                      3
                    </div>
                    <div className="text-sm">One-click consent if needed</div>
                  </div>
                  <div className="ml-4 h-6 w-px bg-border" />
                  <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-3 ring-1 ring-primary/20">
                    <div className="flex size-8 items-center justify-center rounded bg-primary text-xs font-medium text-primary-foreground">
                      4
                    </div>
                    <div className="text-sm font-medium">Report published automatically</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Ready to Get Started?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Create your account and start analyzing your portfolio with AI-powered insights today.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/register" className={buttonVariants({ size: "lg" })}>
                Create Account
                <ArrowRightIcon className="ml-2 size-4" />
              </Link>
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                View Demo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Built with Arcade, Vercel AI SDK, and Next.js
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://arcade.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Arcade
              </a>
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Vercel
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
