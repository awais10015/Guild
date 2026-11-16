import { Heart } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/misc";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { RatingStars, VerifiedBadge } from "@/components/shared/badges";
import { requireRole } from "@/lib/guards";
import { listFavorites } from "@/server/services/provider-service";
import { initials } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const session = await requireRole("customer");
  const favorites = await listFavorites(session.user.id);

  return (
    <div className="space-y-5">
      <PageHeader title="Favorite professionals" description="Providers you saved for quick access." />
      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          description="Tap the heart on any professional to save them here."
          action={{ href: "/professionals", label: "Browse professionals" }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((f) => (
            <Card key={f!.userId} className="transition hover:border-primary/40">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {initials(f!.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/professionals/${f!.slug}`} className="flex items-center gap-1.5 truncate font-medium hover:text-primary">
                      {f!.name} <VerifiedBadge status={f!.verificationStatus} />
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{f!.professionalTitle}</p>
                    <div className="mt-1.5"><RatingStars value={f!.rating?.average ?? 0} count={f!.rating?.count ?? 0} /></div>
                    <p className="mt-1 text-xs text-muted-foreground">{f!.city}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
