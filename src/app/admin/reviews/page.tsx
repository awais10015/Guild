import { Star } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/shared/badges";
import { ReviewModerationActions } from "@/components/admin/actions";
import { requireRole } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { Review, User } from "@/models";
import { formatDate, initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requireRole("admin");
  await connectDB();
  const reviews = await Review.find({}).sort({ createdAt: -1 }).limit(40).lean();
  const userIds = [...new Set(reviews.map((r) => String(r.customerId)))];
  const users = await User.find({ _id: { $in: userIds } }).select("name").lean();
  const nameMap = new Map(users.map((u) => [String(u._id), u.name]));

  return (
    <div className="space-y-5">
      <PageHeader title="Review moderation" description="Hide abusive or fake reviews. Ratings recalculate automatically." />

      {reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description="Reviews will appear here as customers complete bookings." />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={String(r._id)} className={r.moderation?.status === "hidden" ? "opacity-70" : ""}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-secondary text-xs">{initials(nameMap.get(String(r.customerId)) ?? "U")}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{nameMap.get(String(r.customerId)) ?? "Customer"}</span>
                      <RatingStars value={r.ratings.overall} showValue={false} />
                      <Badge variant={r.moderation?.status === "visible" ? "secondary" : "destructive"}>{r.moderation?.status}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(r.createdAt as Date)}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                  </div>
                  <ReviewModerationActions reviewId={String(r._id)} status={r.moderation?.status as string} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
