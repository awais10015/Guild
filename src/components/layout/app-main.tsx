import { cn } from "@/lib/utils";

type Width = "md" | "lg" | "xl";

const WIDTH: Record<Width, string> = {
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
};

/** Centered page body below the global header (matches dashboard shell spacing). */
export function AppMain({
  children,
  width = "lg",
  className,
}: {
  children: React.ReactNode;
  width?: Width;
  className?: string;
}) {
  return (
    <main className={cn("w-full min-h-[calc(100dvh-4rem)] bg-background p-4 sm:p-6 lg:p-8", className)}>
      <div className={cn("mx-auto w-full", WIDTH[width])}>{children}</div>
    </main>
  );
}