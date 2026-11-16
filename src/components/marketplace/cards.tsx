import Image from "next/image";
import Link from "next/link";
import { MapPin, BadgeCheck, BriefcaseBusiness } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RatingStars, VerifiedBadge, AvailabilityDot } from "@/components/shared/badges";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FavoriteButton } from "./favorite-button";
import { initials } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { formatMoney } from "@/lib/format";
import type { SearchResultItem } from "@/server/services/search-service";
import type { FeaturedProvider } from "@/server/services/search-service";

type CardProvider = {
  userId: string;
  slug: string;
  name: string;
  image: string | null;
  professionalTitle: string;
  city: string;
  area?: string;
  professions: string[];
  rating: { average: number; count: number };
  verificationStatus: string;
  isAvailable?: boolean;
  completedJobs?: number;
  experienceYears?: number;
  minPrice?: number | null;
  distanceKm?: number | null;
  topServices?: { id: string; title: string }[];
};

function AvatarBlock({ name, image, size = 56 }: { name: string; image: string | null; size?: number }) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <Avatar style={{ width: size, height: size }}>
      <AvatarFallback className="bg-primary/10 text-primary font-semibold" style={{ fontSize: size / 2.6 }}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function ProviderCard({ provider }: { provider: CardProvider | FeaturedProvider }) {
  return (
    <Card className="group relative overflow-hidden transition hover:border-primary/40 hover:shadow-md">
      <div className="absolute right-3 top-3 z-10">
        <FavoriteButton providerId={provider.userId} initial={false} />
      </div>
      <Link href={`/professionals/${provider.slug}`} className="block">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <AvatarBlock name={provider.name} image={provider.image} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold group-hover:text-primary">{provider.name}</h3>
                <VerifiedBadge status={provider.verificationStatus} />
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{provider.professionalTitle}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <RatingStars value={provider.rating.average} count={provider.rating.count} />
                {provider.completedJobs != null && provider.completedJobs > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <BriefcaseBusiness className="h-3 w-3" /> {provider.completedJobs} jobs
                  </span>
                )}
                {provider.experienceYears != null && provider.experienceYears > 0 && (
                  <span className="text-xs text-muted-foreground">{provider.experienceYears}+ yrs</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            {provider.professions.slice(0, 3).map((p) => (
              <span key={p} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                {p}
              </span>
            ))}
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {provider.city}
              {provider.distanceKm != null && (
                <span className="text-primary">{formatDistance(provider.distanceKm)}</span>
              )}
            </span>
            {"minPrice" in provider && provider.minPrice != null && (
              <span className="font-medium text-foreground">from {formatMoney(provider.minPrice)}</span>
            )}
          </div>

          {"isAvailable" in provider && provider.isAvailable != null && (
            <div className="mt-2">
              <AvailabilityDot isAvailable={provider.isAvailable} />
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}

export function ServiceCard({
  service,
  href,
}: {
  service: { id: string; title: string; description?: string; images?: { url: string }[]; pricingModel: string; price: number | null; durationHours?: number | null; providerName?: string; providerSlug?: string };
  href: string;
}) {
  const img = service.images?.[0]?.url;
  return (
    <Link href={href} className="group block">
      <Card className="overflow-hidden transition hover:border-primary/40 hover:shadow-md">
        <div className="relative aspect-video overflow-hidden bg-muted">
          {img ? (
            <Image src={img} alt={service.title} fill sizes="(max-width:768px) 100vw, 360px" className="object-cover transition group-hover:scale-[1.03]" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="line-clamp-1 font-medium group-hover:text-primary">{service.title}</h3>
          {service.providerName && (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">by {service.providerName}</p>
          )}
          <div className="mt-2.5 flex items-center justify-between">
            <RatingStars value={0} showValue={false} />
            <span className="text-sm font-semibold">
              {service.pricingModel === "custom"
                ? "Custom quote"
                : service.pricingModel === "hourly"
                  ? `${formatMoney(service.price)}/hr`
                  : service.pricingModel === "starting"
                    ? `from ${formatMoney(service.price)}`
                    : formatMoney(service.price)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
