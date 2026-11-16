import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RatingStars, VerifiedBadge, PriceTag } from "@/components/shared/badges";
import { BookingDialog } from "@/components/booking/booking-dialog";
import { ServiceCard } from "@/components/marketplace/cards";
import { connectDB } from "@/lib/db";
import { Service, ProviderProfile, User, CustomerProfile } from "@/models";
import { getSession } from "@/lib/guards";
import { formatMoney } from "@/lib/format";
import { priceLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

async function getService(id: string) {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
  await connectDB();
  const service = await Service.findById(id).lean();
  if (!service || !service.isActive) return null;
  const profile = await ProviderProfile.findById(service.providerProfileId)
    .populate("professions", "name")
    .lean();
  const provider = profile ? await User.findById(profile.userId).select("name image").lean() : null;
  return { service, profile, provider };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getService(id);
  if (!data) return { title: "Service not found" };
  return { title: data.service.title, description: (data.service.description ?? "").slice(0, 150) };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getService(id);
  if (!data) notFound();

  const { service, profile, provider } = data;
  const session = await getSession();
  const isOwner = session?.user.id === String(service.providerId);
  void Service.updateOne({ _id: service._id }, { $inc: { "stats.views": 1 } });

  let defaults: { contactName?: string; contactPhone?: string; city?: string; area?: string } = {};
  if (session?.user.role === "customer") {
    const cp = await CustomerProfile.findOne({ userId: session.user.id }).lean();
    defaults = {
      contactName: session.user.name,
      contactPhone: (cp?.defaultPhone as string) ?? "",
      city: (cp?.address as { city?: string } | null)?.city ?? "",
      area: (cp?.address as { area?: string } | null)?.area ?? "",
    };
  }

  const similar = profile
    ? (await Service.find({
        providerProfileId: profile._id,
        isActive: true,
        _id: { $ne: service._id },
      }).limit(4).lean()).map((s) => ({
        id: String(s._id),
        title: s.title,
        images: (s.images ?? []) as { url: string }[],
        pricingModel: s.pricingModel as string,
        price: (s.price as number | null) ?? null,
      }))
    : [];

  const images = ((service.images ?? []) as { url: string }[]).slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((img, i) => (
                <div key={i} className={`relative overflow-hidden rounded-xl border bg-muted ${i === 0 ? "col-span-2 aspect-video sm:aspect-[2/1]" : "aspect-video"}`}>
                  <Image src={img.url} alt={`${service.title} ${i + 1}`} fill sizes="(max-width:640px) 50vw, 300px" className="object-cover" priority={i === 0} />
                </div>
              ))}
            </div>
          )}

          <h1 className="mt-6 text-2xl font-bold tracking-tight">{service.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {profile && (
              <Link href={`/professionals/${profile.slug}`} className="flex items-center gap-1 hover:text-primary">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location?.city}
              </Link>
            )}
            {service.durationHours && (
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~{service.durationHours} hours</span>
            )}
            <span>{service.stats?.views ?? 0} views</span>
          </div>

          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {service.description}
          </div>

          {similar.length > 0 && (
            <div className="mt-10">
              <h2 className="text-lg font-semibold">More from this professional</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {similar.map((s) => (
                  <ServiceCard
                    key={s.id}
                    service={{ ...s, providerName: provider?.name }}
                    href={`/services/${s.id}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* booking card */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:h-fit">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-baseline justify-between">
                <PriceTag model={String(service.pricingModel)} price={(service.price as number | null) ?? null} className="text-2xl" />
                {service.pricingModel !== "custom" && (
                  <span className="text-xs text-muted-foreground">{priceLabel(String(service.pricingModel) as never, null).split(" ")[0]}</span>
                )}
              </div>
              <Separator className="my-4" />

              {profile && (
                <Link href={`/professionals/${profile.slug}`} className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-muted">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {(provider?.name ?? "?").slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {provider?.name ?? profile.displayName}
                      <VerifiedBadge status={profile.verification?.status ?? "unverified"} />
                    </p>
                    <RatingStars
                      value={Math.round((profile.rating?.average ?? 0) * 10) / 10}
                      count={profile.rating?.count ?? 0}
                    />
                  </div>
                </Link>
              )}

              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Cash on completion — no advance</p>
                <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Response within working hours</p>
              </div>

              {!isOwner ? (
                <BookingDialog serviceId={String(service._id)} serviceTitle={service.title} defaults={defaults}>
                  <Button size="lg" className="mt-4 w-full">
                    {service.pricingModel === "custom" ? "Request quotation" : "Request booking"}
                  </Button>
                </BookingDialog>
              ) : (
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link href={`/provider/services/${String(service._id)}/edit`}>Edit this service</Link>
                </Button>
              )}

              <p className="mt-3 text-center text-xs text-muted-foreground">
                You&apos;ll describe the job — {provider?.name?.split(" ")[0] ?? "the provider"} confirms or sends a quotation.
              </p>
            </CardContent>
          </Card>

          {profile && (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Covers</p>
                <p className="mt-1">{(profile.serviceAreas ?? []).map((a) => `${a.name} (${a.radiusKm}km)`).join(", ")}</p>
                <p className="mt-3 font-medium text-foreground">Minimum charge</p>
                <p className="mt-1">
                  {service.pricingModel === "hourly" ? `${formatMoney(service.price)} per hour` : formatMoney(service.price)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
