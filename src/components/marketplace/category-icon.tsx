import {
  Wrench, Zap, Droplets, Hammer, Paintbrush, Building2, Sparkles, Ruler,
  Car, Camera, GraduationCap, Scissors, AirVent, PackageOpen,
  PaintBucket, PlugZap, Ship, Tractor, HardHat, ToolCase, Lightbulb, Snowflake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  wrench: Wrench,
  zap: Zap,
  droplets: Droplets,
  hammer: Hammer,
  paintbrush: Paintbrush,
  "building-2": Building2,
  sparkles: Sparkles,
  ruler: Ruler,
  car: Car,
  camera: Camera,
  "graduation-cap": GraduationCap,
  scissors: Scissors,
  "air-vent": AirVent,
  "package-open": PackageOpen,
  "paint-bucket": PaintBucket,
  "plug-zap": PlugZap,
  ship: Ship,
  tractor: Tractor,
  "hard-hat": HardHat,
  "tool-case": ToolCase,
  lightbulb: Lightbulb,
  snowflake: Snowflake,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Wrench;
  return <Icon className={className} />;
}
