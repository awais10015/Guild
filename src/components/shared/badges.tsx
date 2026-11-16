import { Star, ShieldCheck, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_STYLES, type BookingStatus } from "@/lib/constants";
import { priceLabel, type PricingModel } from "@/lib/constants";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = STATUS_STYLES[status as BookingStatus] ?? STATUS_STYLES.pending;
  const label = STATUS_LABELS[status as BookingStatus] ?? status;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", style, className)}>
      {label}
    </span>
  );
}

export function VerifiedBadge({ status }: { status: string }) {
  if (status !== "verified") return null;
  return (
    <span
      title="Identity verified by Guild"
      className="inline-flex items-center gap-1 rounded-full bg-teal-600/10 px-2 py-0.5 text-xs font-medium text-teal-700 dark:text-teal-300"
    >
      <ShieldCheck className="h-3.5 w-3.5" /> Verified
    </span>
  );
}

export function RatingStars({
  value,
  count,
  size = "sm",
  showValue = true,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  showValue?: boolean;
}) {
  const px = size === "md" ? "h-4.5 w-4.5" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              px,
              i <= Math.round(value)
                ? "fill-amber-400 text-amber-400"
                : "fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700",
            )}
          />
        ))}
      </span>
      {showValue && (
        <span className="text-xs font-medium text-foreground">
          {value > 0 ? value.toFixed(1) : "New"}
          {count != null && count > 0 && <span className="text-muted-foreground"> ({count})</span>}
        </span>
      )}
    </span>
  );
}

export function PriceTag({ model, price, className }: { model: string; price?: number | null; className?: string }) {
  return (
    <span className={cn("font-semibold text-foreground", className)}>
      {priceLabel(model as PricingModel, price ?? null)}
    </span>
  );
}

export function AvailabilityDot({ isAvailable }: { isAvailable: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", isAvailable ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
      <CircleDot className={cn("h-3 w-3", isAvailable && "fill-emerald-500 text-emerald-500")} />
      {isAvailable ? "Accepting work" : "Currently busy"}
    </span>
  );
}
