import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck, BriefcaseBusiness, CalendarCheck, Clock, Globe, MapPin, MessageSquare, Phone, Star,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RatingStars, VerifiedBadge, AvailabilityDot, PriceTag } from "@/components/shared/badges";
import { BookingDialog } from "@/components/booking/booking-dialog";
import { StartConversationButton } from "@/components/messaging/start-conversation-button";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { ReportDialog } from "@/components/shared/report-dialog";
import { ReviewDialog } from "@/components/shared/review-dialog";
import { MapView } from "@/components/shared/map-view";
import { getPublicProfileBySlug, incrementViews } from "@/server/services/provider-service";
import { getSession } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { User } from "@/models";
import { initials, formatDate } from "@/lib/format";
import { DAY_KEYS, DAY_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await connectDB();
  const { ProviderProfile } = await import("@/models");
  const profile = await ProviderProfile.findOne({ slug }).select("displayName professionalTitle location bio").lean();
  if (!profile) return { title: "Professional not found" };
  return {
    title: `${profile.displayName} — ${profile.professionalTitle} in ${profile.location?.city ?? "your area"}`,
    description: (profile.bio ?? "").slice(0, 150),
  };
}

export default async function ProviderProfilePage({ params }: Props) {
  const { slug } = await params;
  await connectDB();
  const session = await getSession();
  const data = await getPublicProfileBySlug(slug, session?.user.id);
  if (!data) notFound();

  const { profile, userId, services, reviews, isFavorite, eligibleBookingId } = data;
  const isOwner = session?.user.id === userId;
  if (!isOwner) void incrementViews(profile.id);

  /* booking dialog defaults from customer profile */
  let defaults: { contactName?: string; contactPhone?: string; city?: string; area?: string } = {};
  if (session?.user.role === "customer") {
    const { CustomerProfile } = await import("@/models");
    const cp = await CustomerProfile.findOne({ userId: session.user.id }).lean();
    defaults = {
      contactName: session.user.name,
      contactPhone: (cp?.defaultPhone as string) ?? session.user.phone ?? "",
      city: (cp?.address as { city?: string } | null)?.city ?? "",
      area: (cp?.address as { area?: string } | null)?.area ?? "",
    };
  }

  const providerUser = await User.findById(userId).select("phone").lean();
  const mapMarkers = await (async () => {
    const { ProviderProfile } = await import("@/models");
    const doc = await ProviderProfile.findById(profile.id).select("serviceAreas location").lean();
    const fromAreas = (doc?.serviceAreas ?? [])
      .map((a) => {
        const c = a.coordinates?.coordinates ?? [];
        return c.length >= 2 ? { lat: c[1], lng: c[0], label: `${a.name}, ${a.city}`, radiusKm: a.radiusKm } : null;
      })
      .filter(Boolean);
    if (fromAreas.length) return fromAreas;
    const c = doc?.location?.coordinates?.coordinates ?? [];
    return c.length >= 2 ? [{ lat: c[1], lng: c[0], label: profile.city }] : [];
  })();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                {initials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
                <VerifiedBadge status={profile.verificationStatus} />
              </div>
              <p className="mt-1 text-muted-foreground">{profile.professionalTitle}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <RatingStars value={profile.rating.average} count={profile.rating.count} size="md" />
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {profile.area ? `${profile.area}, ` : ""}{profile.city}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <BriefcaseBusiness className="h-3.5 w-3.5" /> {profile.stats.completedJobs} jobs completed
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {profile.experienceYears}+ years experience
                </span>
                <AvailabilityDot isAvailable={profile.isAvailable} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.professions.map((p) => (
                  <Link key={p.id} href={`/professionals?profession=${p.slug}`}>
                    <Badge variant="secondary" className="hover:bg-secondary/70">{p.name}</Badge>
                  </Link>
                ))}
              </div>
            </div>
            {!isOwner && (
              <div className="flex w-full flex-col gap-2 sm:w-52">
                {services[0] && (
                  <BookingDialog
                    serviceId={services[0].id}
                    serviceTitle={services[0].title}
                    defaults={defaults}
                    trigger={
                      <Button size="lg" className="w-full">
                        <CalendarCheck className="h-4 w-4" /> Book now
                      </Button>
                    }
                  />
                )}
                <FavoriteButton providerId={userId} initial={isFavorite} variant="full" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* about */}
          <Card>
            <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{profile.bio}</p>
              {profile.skills.length > 0 && (
                <div>
                  <h4 className="mb-2 font-medium">Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((s) => (
                      <Badge key={s} variant="outline">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile.languages.length > 0 && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Globe className="h-4 w-4" /> Speaks: {profile.languages.join(", ")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* portfolio */}
          {profile.portfolio.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Portfolio</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {profile.portfolio.map((item, i) => (
                    <div key={i} className="group relative aspect-video overflow-hidden rounded-lg border bg-muted">
                      <Image
                        src={item.url}
                        alt={item.caption || `Work ${i + 1}`}
                        fill
                        sizes="(max-width:640px) 45vw, 240px"
                        className="object-cover transition group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* services */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Services ({services.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.length === 0 && <p className="text-sm text-muted-foreground">No published services yet.</p>}
              {services.map((s) => (
                <div key={s.id} className="flex gap-4 rounded-xl border p-4">
                  {s.images[0]?.url && (
                    <Link href={`/services/${s.id}`} className="relative hidden h-24 w-36 shrink-0 overflow-hidden rounded-lg bg-muted sm:block">
                      <Image src={s.images[0].url} alt={s.title} fill sizes="150px" className="object-cover" />
                    </Link>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/services/${s.id}`} className="font-medium hover:text-primary">{s.title}</Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                      <PriceTag model={s.pricingModel} price={s.price} />
                      {s.durationHours && <span className="text-muted-foreground">~{s.durationHours}h</span>}
                    </div>
                  </div>
                  {!isOwner && (
                    <div className="self-center">
                      <BookingDialog serviceId={s.id} serviceTitle={s.title} defaults={defaults}>
                        <Button size="sm">Book</Button>
                      </BookingDialog>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* reviews */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Reviews ({profile.rating.count})</CardTitle>
              {eligibleBookingId && (
                <ReviewDialog bookingId={eligibleBookingId} providerName={profile.name} />
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              {reviews.length === 0 && (
                <p className="text-sm text-muted-foreground">No reviews yet — be the first after your completed booking.</p>
              )}
              {reviews.map((r) => (
                <div key={r.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-secondary text-xs">{initials(r.author)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{r.author}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                    </div>
                    <div className="ml-auto"><RatingStars value={r.ratings.overall} showValue={false} /></div>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
                  {r.providerReply && (
                    <div className="mt-2.5 rounded-lg bg-muted/60 p-3 text-sm">
                      <p className="font-medium">Reply from {profile.name}</p>
                      <p className="mt-1 text-muted-foreground">{r.providerReply.body}</p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* sidebar */}
        <div className="space-y-5">
          {!isOwner && (
            <Card>
              <CardContent className="space-y-3 p-5">
                <h3 className="font-semibold">Contact</h3>
                {profile.phone && (
                  <details className="group">
                    <summary className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition hover:bg-muted">
                      <Phone className="h-4 w-4 text-primary" /> Show phone number
                    </summary>
                    <p className="mt-2 text-center text-lg font-semibold tracking-wide">{profile.phone}</p>
                  </details>
                )}
                {session?.user ? (
                  <StartConversationButton userId={userId} />
                ) : (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/login"><MessageSquare className="h-4 w-4" /> Sign in to message</Link>
                  </Button>
                )}
                <Separator />
                <ReportDialog targetType="provider" targetId={userId} label="Report this profile" />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Service areas</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {profile.serviceAreas.map((a, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {a.name}, {a.city} <span className="text-xs">({a.radiusKm} km)</span>
                  </li>
                ))}
              </ul>
              {mapMarkers.length > 0 && (
                <MapView
                  markers={mapMarkers.filter((m): m is { lat: number; lng: number; label?: string; radiusKm?: number } => !!m)}
                  zoom={10}
                  className="mt-3 h-56 w-full rounded-lg border"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Working hours</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {DAY_KEYS.map((d) => {
                  const slots = profile.workingHours[d];
                  return (
                    <li key={d} className="flex justify-between">
                      <span className="text-muted-foreground">{DAY_LABELS[d]}</span>
                      <span className={slots ? "" : "text-muted-foreground"}>
                        {slots && slots.length ? slots.map((s) => `${s.start}–${s.end}`).join(", ") : "Closed"}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <Separator className="my-3" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Member since</span>
                <span>{formatDate(profile.memberSince)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profile views</span>
                <span>{profile.stats.profileViews}</span>
              </div>
              {profile.certifications.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <h4 className="mb-2 text-sm font-medium">Certifications</h4>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {profile.certifications.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {c.title}{c.issuer ? ` — ${c.issuer}` : ""}{c.year ? ` (${c.year})` : ""}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          {profile.rating.count > 0 && (
            <Card>
              <CardContent className="p-5 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span className="text-2xl font-bold">{profile.rating.average.toFixed(1)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{profile.rating.count} verified reviews</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
