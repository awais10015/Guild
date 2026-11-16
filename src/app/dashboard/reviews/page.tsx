import { Star } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/misc";
import { Card, CardContent } from "@/components/ui/card";
import { RatingStars } from "@/components/shared/badges";
import { requireRole } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { Review } from "@/models";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MyReviewsPage() {
  const session = await requireRole("customer");
  await connectDB();
  const reviews = (await Review.find({ customerId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate<{ serviceId: { title?: string } | null }>("serviceId", "title")
    .lean()) as unknown as {
    _id: unknown;
    ratings: { overall: number; quality: number; professionalism: number; communication: number };
    comment: string;
    createdAt: Date;
    serviceId: { title?: string } | null;
  }[];

  return (
    <div className="space-y-5">
      <PageHeader title="My reviews" description="Reviews you've written after completed bookings." />
      {reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="After a provider completes your booking, you can rate the work here."
          action={{ href: "/dashboard/bookings?status=completed", label: "View completed bookings" }}
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={String(r._id)}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {(r.serviceId as { title?: string } | null)?.title ?? "Booking review"}
                  </p>
                  <RatingStars value={r.ratings.overall} showValue={false} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                <p className="mt-2 text-xs text-muted-foreground">Posted {formatDate(r.createdAt as Date)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
