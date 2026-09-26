"use client";

import {
  BarChart3,
  Bell,
  CalendarDays,
  CalendarHeart,
  Car,
  Contact2,
  FileText,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { signOut, useAdminUser } from "@/lib/admin/session";
import { ensureSeeded, expireHolds, listNotifications, markNotificationsRead } from "@/lib/db/mock-backend";
import { formatRelative } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import type { Permission, StaffUser } from "@/lib/types";
import { OfflineBanner, useOnline } from "../pwa";
import { Spinner, cn } from "../ui";

const UserContext = createContext<StaffUser | null>(null);

export function useStaff(): StaffUser {
  const u = useContext(UserContext);
  if (!u) throw new Error("useStaff hors AdminShell");
  return u;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  perm?: Permission | Permission[];
  group: string;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, group: "" },
  { href: "/admin/crm", label: "Demandes (CRM)", icon: Inbox, group: "Commercial", perm: ["crm.read_all", "crm.write_own"] },
  { href: "/admin/contacts", label: "Contacts", icon: Contact2, group: "Commercial", perm: ["crm.read_all", "crm.write_own"] },
  { href: "/admin/devis", label: "Devis", icon: FileText, group: "Commercial", perm: ["quotes.read", "quotes.write"] },
  { href: "/admin/vehicules", label: "Véhicules", icon: Car, group: "Vente automobile", perm: ["vehicles.write"] },
  { href: "/admin/location", label: "Flotte & réservations", icon: KeyRound, group: "Location", perm: ["rentals.write"] },
  { href: "/admin/chauffeurs", label: "Chauffeurs", icon: UserRound, group: "Location", perm: ["drivers.write"] },
  { href: "/admin/evenementiel", label: "Événementiel", icon: CalendarHeart, group: "Événementiel", perm: ["events.write"] },
  { href: "/admin/calendrier", label: "Calendrier", icon: CalendarDays, group: "Opérations", perm: ["rentals.write", "events.write", "appointments.write"] },
  { href: "/admin/marketing", label: "Marketing & QR", icon: Megaphone, group: "Opérations", perm: ["marketing.write"] },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, group: "Opérations", perm: ["analytics.read"] },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings, group: "Opérations", perm: ["settings.write", "users.manage", "audit.read"] },
];

export function allowed(user: StaffUser, perm?: Permission | Permission[]) {
  if (!perm) return true;
  return (Array.isArray(perm) ? perm : [perm]).some((p) => can(user.roleId, p));
}

export function AdminShell({ children }: { children: ReactNode }) {
  const user = useAdminUser();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (user === null) router.replace("/admin/login");
  }, [user, router]);

  // Initialise le backend mocké + libère les options expirées toutes les minutes (pg_cron en prod).
  useEffect(() => {
    let alive = true;
    void ensureSeeded()
      .then(() => expireHolds())
      .then(() => alive && setReady(true));
    const t = setInterval(() => void expireHolds(), 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!user || !ready) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner className="size-6" />
      </div>
    );
  }
  return (
    <UserContext.Provider value={user}>
      <Frame user={user}>{children}</Frame>
    </UserContext.Provider>
  );
}

function Frame({ user, children }: { user: StaffUser; children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = NAV.filter((n) => allowed(user, n.perm));
  const groups = [...new Set(items.map((i) => i.group))];
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav className="space-y-5">
      {groups.map((g) => (
        <div key={g || "main"}>
          {g && <p className="mb-1.5 px-3 text-[10px] font-bold tracking-widest text-white/40 uppercase">{g}</p>}
          <ul className="space-y-0.5">
            {items
              .filter((i) => i.group === g)
              .map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                      isActive(href) ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className={cn("size-4.5", isActive(href) && "text-gold")} />
                    {label}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-ink p-4 lg:flex">
        <Brand />
        <div className="mt-6 flex-1 overflow-y-auto">{nav}</div>
        <UserBox user={user} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu" />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-ink p-4">
            <div className="flex items-center justify-between">
              <Brand />
              <button type="button" onClick={() => setMenuOpen(false)} className="rounded-lg p-2 text-white/70" aria-label="Fermer">
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto">{nav}</div>
            <UserBox user={user} />
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <OfflineBanner />
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur">
          <button type="button" className="rounded-lg p-2 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Menu">
            <Menu className="size-5" />
          </button>
          <span className="font-bold lg:hidden">Bryan Admin</span>
          <div className="ml-auto flex items-center gap-2">
            <SyncStatus />
            <Notifications user={user} />
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 pb-24 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 px-1">
      <span className="grid size-9 place-items-center rounded-xl bg-gold font-black text-ink">B</span>
      <span>
        <span className="block text-sm font-extrabold text-white">Bryan Admin</span>
        <span className="block text-[10px] tracking-widest text-gold uppercase">Multiservices</span>
      </span>
    </Link>
  );
}

function UserBox({ user }: { user: StaffUser }) {
  const router = useRouter();
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/5 p-3">
      <span className="grid size-9 place-items-center rounded-full bg-white/10 text-sm font-bold text-white">
        {user.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
        <p className="truncate text-xs text-white/50">{ROLE_LABELS[user.roleId]}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          signOut();
          router.replace("/admin/login");
        }}
        className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
        aria-label="Se déconnecter"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

function SyncStatus() {
  const online = useOnline();
  return (
    <span className={cn("hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex", online ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
      <span className={cn("size-1.5 rounded-full", online ? "bg-emerald-500" : "bg-amber-500")} />
      {online ? "Synchronisé" : "Hors-ligne"}
    </span>
  );
}

function Notifications({ user }: { user: StaffUser }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(0);
  const items = useLiveQuery(() => listNotifications(user.id), [user.id]);
  const unread = items?.filter((n) => !n.readAt).length ?? 0;

  return (
    <div className="relative">
      <button type="button" onClick={() => { setNow(Date.now()); setOpen((o) => !o); }} className="relative rounded-xl p-2.5 hover:bg-black/5" aria-label={`Notifications (${unread} non lues)`}>
        <Bell className="size-5" />
        {unread > 0 && <span className="absolute top-1 right-1 grid min-w-4.5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Fermer" />
          <div className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-bold">Notifications</p>
              {unread > 0 && (
                <button type="button" className="text-xs font-semibold text-muted hover:text-ink" onClick={() => markNotificationsRead(user.id)}>
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {items?.length === 0 && <li className="p-6 text-center text-sm text-muted">Aucune notification</li>}
              {items?.map((n) => (
                <li key={n.id}>
                  <Link href={n.link ?? "/admin"} onClick={() => setOpen(false)} className={cn("block px-4 py-3 hover:bg-paper", !n.readAt && "bg-gold-soft/50")}>
                    <p className="text-sm font-semibold">🔔 {n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs whitespace-pre-line text-muted">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-muted">{now ? formatRelative(n.createdAt, now) : ""}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Forbidden() {
  return (
    <div className="card p-10 text-center">
      <p className="text-lg font-bold">Accès non autorisé</p>
      <p className="mt-1 text-sm text-muted">Votre rôle ne donne pas accès à cette section (permissions R12, appliquées aussi en base via RLS).</p>
    </div>
  );
}
