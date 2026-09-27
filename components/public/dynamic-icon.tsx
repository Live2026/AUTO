import {
  Armchair,
  Briefcase,
  Bus,
  Cake,
  Camera,
  Car,
  CarFront,
  ClipboardCheck,
  Flower2,
  GlassWater,
  Heart,
  Lightbulb,
  Music,
  Plane,
  ShieldCheck,
  Sparkles,
  Speaker,
  Tent,
  UserRound,
  Users,
  UtensilsCrossed,
  Video,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Armchair, Briefcase, Bus, Cake, Camera, Car, CarFront, ClipboardCheck, Flower2, GlassWater, Heart,
  Lightbulb, Music, Plane, ShieldCheck, Sparkles, Speaker, Tent, UserRound, Users, UtensilsCrossed, Video,
};

export function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} />;
}
