import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, MessageSquare, Search, ShieldCheck, Star, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "How it works",
  description: "Learn how Guild connects customers with verified local professionals — search, book, chat, pay on completion and review.",
};

const STEPS = [
  {
    icon: Search,
    title: "Find the right professional",
    text: "Search by profession, service, city or area — or use nearby search to sort by distance. Every profile shows ratings, reviews, portfolio, experience, working hours and service areas.",
  },
  {
    icon: CalendarCheck,
    title: "Send a booking request",
    text: "Describe the job, attach photos, pick a preferred date and time slot. The provider accepts or declines — for custom jobs they send an itemized quotation that you can accept or decline.",
  },
  {
    icon: MessageSquare,
    title: "Coordinate in chat",
    text: "Every booking has its own conversation thread with realtime messaging, image sharing and online indicators. Share arrival details, progress photos and updates.",
  },
  {
    icon: Wallet,
    title: "Pay on completion",
    text: "No advance payment. Settle the agreed amount in cash when the job is finished. Future versions will add card payments and escrow — the workflow is already built for it.",
  },
  {
    icon: Star,
    title: "Review the work",
    text: "After a completed booking you can rate quality, professionalism and communication. Only real customers can review — every review is tied to a completed booking.",
  },
  {
    icon: ShieldCheck,
    title: "Trust verified badges",
    text: "Professionals can submit a government ID, trade license and business documents for review. Verified profiles display a badge, and suspicious activity can be reported to our moderation team.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">How Guild works</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Guild connects people who need physical services with skilled local professionals —
          plumbers, electricians, carpenters, cleaners, photographers, tutors and dozens more.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {STEPS.map((step, i) => (
          <Card key={step.title}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step {i + 1}</span>
              </div>
              <h3 className="mt-3.5 font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-primary p-8 text-center text-primary-foreground">
        <h2 className="text-2xl font-bold">Ready to get started?</h2>
        <p className="mx-auto mt-2 max-w-lg text-primary-foreground/85">
          Whether you need a leaking pipe fixed at midnight or you&apos;re a mason looking for steady work — Guild is free to join.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button size="lg" variant="secondary" asChild>
            <Link href="/professionals">Find professionals</Link>
          </Button>
          <Button size="lg" variant="outline" className="border-white/40 bg-transparent hover:bg-white/10" asChild>
            <Link href="/register">Join as a professional</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
