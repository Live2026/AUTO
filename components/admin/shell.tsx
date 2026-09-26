"use client";

import {
  BarChart3,
  Bell,
  CalendarClock,
  CalendarDays,
  CalendarHeart,
  Car,
  ChevronDown,
  Contact2,
  ExternalLink,
  FileText,
  Images,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  UserCog,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { signOut, useAdminUserId, useSidebarCollapsed } from "@/lib/admin/session";
import { ensureSeeded, expireHolds, listNotifications, markNotificationsRead, mockDb, setStaffCache } from "@/lib/db/mock-backend";
import { formatRelative } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { can, setRolePermissions } from "@/lib/permissions";
import type { Permission, RoleId, StaffNotification, StaffUser } from "@/lib/types";
import { OfflineBanner, useOnline } from "../pwa";
import { Spinner, cn } from "../ui";

interface StaffContextValue {
  user: StaffUser;
  /** incrémenté quand le personnel ou les permissions changent → re-rendu des écrans */
  version: number;
}

const StaffContext = createContext<StaffContextValue | null>(null);

export function useStaff(): StaffUser {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff hors AdminShell");
  return ctx.user;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  perm?: Permission | Permission[];
  group: string;
  badge?: "newRequests" | "quoteChanges" | "appointments";
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, group: "" },
  { href: "/admin/crm", label: "Demandes", icon: Inbox, group: "Commercial", perm: ["crm.read_all", "crm.write_own"], badge: "newRequests" },
  { href: "/admin/rendez-vous", label: "Rendez-vous & essais", icon: CalendarClock, group: "Commercial", perm: ["appointments.write", "crm.read_all"], badge: "appointments" },
  { href: "/admin/contacts", label: "Contacts", icon: Contact2, group: "Commercial", perm: ["crm.read_all", "crm.write_own"] },
  { href: "/admin/devis", label: "Devis", icon: FileText, group: "Commercial", perm: ["quotes.read", "quotes.write"], badge: "quoteChanges" },
  { href: "/admin/vehicules", label: "Véhicules & catégories", icon: Car, group: "Vente automobile", perm: ["vehicles.write"] },
  { href: "/admin/location", label: "Flotte & réservations", icon: KeyRound, group: "Location", perm: ["rentals.write"] },
  { href: "/admin/chauffeurs", label: "Chauffeurs", icon: UserRound, group: "Location", perm: ["drivers.write"] },
  { href: "/admin/evenementiel", label: "Événementiel", icon: CalendarHeart, group: "Événementiel", perm: ["events.write"] },
  { href: "/admin/calendrier", label: "Calendrier", icon: CalendarDays, group: "Opérations", perm: ["rentals.write", "events.write", "appointments.write"] },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone, group: "Opérations", perm: ["marketing.write"] },
  { href: "/admin/medias", label: "Médiathèque", icon: Images, group: "Opérations", perm: ["media.write"] },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, group: "Opérations", perm: ["analytics.read"] },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings, group: "Administration", perm: ["settings.write", "users.manage", "audit.read"] },
];

export function allowed(user: StaffUser, perm?: Permission | Permission[]) {
  if (!perm) return true;
  return (Array.isArray(perm) ? perm : [perm]).some((p) => can(user.roleId, p));
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AdminShell({ children }: { children: ReactNode }) {
  const userId = useAdminUserId();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (userId === null) router.replace("/admin/login");
  }, [userId, router]);

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

  // Personnel et permissions en direct (§42 : modifiables par l'administrateur)
  // Les caches synchrones (staffById, can) sont mis à jour à chaque résultat ; le nouvel objet
  // `directory` passe par le contexte et déclenche le re-rendu des écrans.
  const directory = useLiveQuery(async () => {
    if (!ready) return undefined;
    const [staff, roles] = await Promise.all([mockDb.staff.toArray(), mockDb.roles.toArray()]);
    setStaffCache(staff);
    setRolePermissions(Object.fromEntries(roles.map((r) => [r.id, r.permissions])) as Record<RoleId, Permission[]>);
    return { staff, roles, at: Date.now() };
  }, [ready]);

  const user = directory?.staff.find((u) => u.id === userId && u.isActive);

  useEffect(() => {
    if (directory && userId && !user) {
      signOut();
      router.replace("/admin/login");
    }
  }, [directory, userId, user, router]);

  if (!userId || !ready || !directory || !user) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner className="size-6" />
      </div>
    );
  }
  return (
    <StaffContext.Provider value={{ user, version: directory.at }}>
      <Frame user={user}>{children}</Frame>
    </StaffContext.Provider>
  );
}

function useBadges(user: StaffUser) {
  return useLiveQuery(async () => {
    const [requests, quotes, appointments] = await Promise.all([mockDb.requests.toArray(), mockDb.quotes.toArray(), mockDb.appointments.toArray()]);
    const visible = requests.filter((r) => !r.archivedAt && (can(user.roleId, "crm.read_all") || r.assignedTo === user.id));
    return {
      newRequests: visible.filter((r) => r.status === "new").length,
      quoteChanges: quotes.filter((q) => q.status === "change_requested").length,
      appointments: appointments.filter((a) => a.status === "requested").length,
    };
  }, [user.id, user.roleId]);
}

function Frame({ user, children }: { user: StaffUser; children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const badges = useBadges(user);
  const items = NAV.filter((n) => allowed(user, n.perm));
  const groups = [...new Set(items.map((i) => i.group))];
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (compact: boolean) => (
    <nav className="space-y-4" aria-label="Menu administration">
      {groups.map((g) => (
        <div key={g || "main"}>
          {g && !compact && <p className="mb-1.5 px-3 text-[10px] font-bold tracking-widest text-white/40 uppercase">{g}</p>}
          {g && compact && <div className="mx-3 mb-2 border-t border-white/10" />}
          <ul className="space-y-0.5">
            {items
              .filter((i) => i.group === g)
              .map(({ href, label, icon: Icon, badge }) => {
                const count = badge ? badges?.[badge] ?? 0 : 0;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      title={compact ? label : undefined}
                      aria-label={compact ? `${label}${count ? ` (${count})` : ""}` : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-xl py-2 text-sm font-medium transition",
                        compact ? "justify-center px-0" : "px-3",
                        isActive(href) ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className={cn("size-[18px] shrink-0", isActive(href) && "text-gold")} />
                      {!compact && <span className="flex-1 truncate">{label}</span>}
                      {count > 0 && (
                        <span
                          className={cn(
                            "grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[10px] leading-5 font-bold text-white",
                            compact && "absolute top-0.5 right-1.5 min-w-4 px-1 leading-4",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className={cn("lg:grid", collapsed ? "lg:grid-cols-[76px_1fr]" : "lg:grid-cols-[264px_1fr]")}>
      {/* Barre latérale desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-ink p-3 transition-all lg:flex">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between pr-1")}>
          <Brand compact={collapsed} />
          {!collapsed && (
            <button type="button" onClick={() => setCollapsed(true)} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Replier la barre latérale" title="Replier">
              <PanelLeftClose className="size-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button type="button" onClick={() => setCollapsed(false)} className="mx-auto mt-3 rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Déplier la barre latérale" title="Déplier">
            <PanelLeftOpen className="size-4" />
          </button>
        )}
        <div className="scrollbar-none mt-5 flex-1 overflow-y-auto">{nav(collapsed)}</div>
        <SidebarFooter user={user} compact={collapsed} />
      </aside>

      {/* Tiroir mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu" />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-ink p-3">
            <div className="flex items-center justify-between">
              <Brand />
              <button type="button" onClick={() => setMenuOpen(false)} className="rounded-lg p-2 text-white/70" aria-label="Fermer">
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-5 flex-1 overflow-y-auto">{nav(false)}</div>
            <SidebarFooter user={user} compact={false} />
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <OfflineBanner />
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-white/90 px-3 backdrop-blur sm:px-4">
          <button type="button" className="rounded-lg p-2 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">
            <Menu className="size-5" />
          </button>
          <button
            type="button"
            className="hidden rounded-lg p-2 text-muted hover:bg-black/5 hover:text-ink lg:block"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
            title={collapsed ? "Déplier le menu" : "Replier le menu"}
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1.5">
            <SyncStatus />
            <Link href="/" target="_blank" className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-black/5 hover:text-ink md:inline-flex" title="Ouvrir le site public">
              <ExternalLink className="size-4" /> Site
            </Link>
            <Notifications user={user} />
            <ProfileMenu user={user} />
          </div>
        </header>
        <IncomingAlerts user={user} />
        <main className="mx-auto max-w-7xl p-4 pb-24 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 px-1" title="Tableau de bord">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold font-black text-ink">B</span>
      {!compact && (
        <span>
          <span className="block text-sm font-extrabold text-white">Bryan Admin</span>
          <span className="block text-[10px] tracking-widest text-gold uppercase">Multiservices</span>
        </span>
      )}
    </Link>
  );
}

function useLogout() {
  const router = useRouter();
  return () => {
    signOut();
    router.replace("/admin/login");
  };
}

/** Bas de la barre latérale : identité + gros bouton de déconnexion. */
function SidebarFooter({ user, compact }: { user: StaffUser; compact: boolean }) {
  const logout = useLogout();
  return (
    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
      {!compact && (
        <Link href="/admin/profil" className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/5">
          <Avatar user={user} dark />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">{user.fullName}</span>
            <span className="block truncate text-xs text-white/50">{ROLE_LABELS[user.roleId]}</span>
          </span>
        </Link>
      )}
      <button
        type="button"
        onClick={logout}
        title="Se déconnecter"
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 font-semibold text-white transition hover:bg-rose-700",
          compact ? "h-11" : "h-12 text-[15px]",
        )}
      >
        <LogOut className="size-5" />
        {!compact && "Se déconnecter"}
      </button>
    </div>
  );
}

export function Avatar({ user, dark, size = "md" }: { user: StaffUser; dark?: boolean; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold",
        size === "lg" ? "size-14 text-lg" : "size-9 text-sm",
        user.roleId === "admin" ? "bg-gold text-ink" : dark ? "bg-white/10 text-white" : "bg-ink text-white",
      )}
    >
      {initials(user.fullName)}
    </span>
  );
}

/** Menu profil de la barre du haut (nom, rôle, profil, site, déconnexion). */
function ProfileMenu({ user }: { user: StaffUser }) {
  const [open, setOpen] = useState(false);
  const logout = useLogout();
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl py-1 pr-2 pl-1 hover:bg-black/5"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu du profil"
      >
        <Avatar user={user} />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-36 truncate text-sm font-semibold">{user.fullName}</span>
          <span className="block max-w-36 truncate text-[11px] text-muted">{ROLE_LABELS[user.roleId]}</span>
        </span>
        <ChevronDown className="size-4 text-muted" />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Fermer" />
          <div role="menu" className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-line bg-paper p-4">
              <Avatar user={user} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-bold">{user.fullName}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
                <span className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold", user.roleId === "admin" ? "bg-gold text-ink" : "bg-ink/10 text-ink")}>
                  {ROLE_LABELS[user.roleId]}
                </span>
              </div>
            </div>
            <div className="p-1.5 text-sm">
              <MenuLink href="/admin/profil" icon={UserCog} onClick={() => setOpen(false)}>Mon profil & préférences</MenuLink>
              <MenuLink href="/admin/profil#notifications" icon={Bell} onClick={() => setOpen(false)}>Notifications de cet appareil</MenuLink>
              {can(user.roleId, "settings.write") && <MenuLink href="/admin/parametres" icon={Settings} onClick={() => setOpen(false)}>Paramètres</MenuLink>}
              <MenuLink href="/" icon={ExternalLink} onClick={() => setOpen(false)} external>Voir le site public</MenuLink>
            </div>
            <div className="border-t border-line p-1.5">
              <button type="button" role="menuitem" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                <LogOut className="size-4" /> Se déconnecter
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({ href, icon: Icon, children, onClick, external }: { href: string; icon: LucideIcon; children: ReactNode; onClick: () => void; external?: boolean }) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} target={external ? "_blank" : undefined} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-paper">
      <Icon className="size-4 text-muted" />
      {children}
    </Link>
  );
}

/** Recherche globale (référence, nom, téléphone) → CRM. Raccourci : Ctrl/Cmd + K. */
function GlobalSearch() {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form
      className="relative hidden max-w-md flex-1 md:block"
      onSubmit={(e) => {
        e.preventDefault();
        const q = ref.current?.value.trim();
        if (q) router.push(`/admin/crm?q=${encodeURIComponent(q)}`);
      }}
      role="search"
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
      <input ref={ref} className="input h-10 bg-paper pr-14 pl-9" placeholder="Rechercher une demande, un client, un téléphone…" aria-label="Recherche globale" />
      <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-line bg-white px-1.5 text-[10px] text-muted">Ctrl K</kbd>
    </form>
  );
}

function SyncStatus() {
  const online = useOnline();
  return (
    <span className={cn("hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold xl:inline-flex", online ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
      <span className={cn("size-1.5 rounded-full", online ? "bg-emerald-500" : "bg-amber-500")} />
      {online ? "En ligne" : "Hors-ligne"}
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
      <button
        type="button"
        onClick={() => {
          setNow(Date.now());
          setOpen((o) => !o);
        }}
        className="relative rounded-xl p-2.5 hover:bg-black/5"
        aria-label={`Notifications (${unread} non lues)`}
      >
        <Bell className="size-5" />
        {unread > 0 && <span className="absolute top-1 right-1 grid min-w-[18px] place-items-center rounded-full bg-rose-600 px-1 text-[10px] leading-[18px] font-bold text-white">{unread}</span>}
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

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.17);
    });
  } catch {
    /* audio indisponible */
  }
}

/**
 * Réception en direct des commandes / demandes (§69) : dès qu'une notification arrive
 * (depuis le site public, même dans un autre onglet), alerte visuelle + son + notification
 * système si autorisée, et compteur dans le titre de l'onglet.
 */
function IncomingAlerts({ user }: { user: StaffUser }) {
  const items = useLiveQuery(() => listNotifications(user.id), [user.id]);
  const seen = useRef<Set<string> | null>(null);
  const [toasts, setToasts] = useState<StaffNotification[]>([]);

  useEffect(() => {
    if (!items) return;
    if (seen.current === null) {
      seen.current = new Set(items.map((n) => n.id));
      return;
    }
    const fresh = items.filter((n) => !seen.current!.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => seen.current!.add(n.id));
    setToasts((t) => [...fresh, ...t].slice(0, 4));
    beep();
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      for (const n of fresh) {
        void navigator.serviceWorker?.getRegistration().then((reg) => {
          if (reg) void reg.showNotification(n.title, { body: n.body, icon: "/icons/admin-192.png", data: { url: n.link } });
          else new Notification(n.title, { body: n.body, icon: "/icons/admin-192.png" });
        });
      }
    }
    fresh.forEach((n) => setTimeout(() => setToasts((t) => t.filter((x) => x.id !== n.id)), 12_000));
  }, [items]);

  const unread = items?.filter((n) => !n.readAt).length ?? 0;
  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) Bryan Admin` : "Bryan Admin";
  }, [unread]);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-20 right-4 z-[70] w-[min(92vw,360px)] space-y-2" aria-live="assertive">
      {toasts.map((n) => (
        <div key={n.id} className="animate-[slide-in_.25s_ease-out] rounded-2xl border border-gold/40 bg-ink p-4 text-white shadow-2xl">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold text-ink"><Bell className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{n.title}</p>
              {n.body && <p className="mt-0.5 text-xs whitespace-pre-line text-white/70">{n.body}</p>}
              <Link href={n.link ?? "/admin/crm"} className="mt-2 inline-flex rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-ink" onClick={() => setToasts((t) => t.filter((x) => x.id !== n.id))}>
                Ouvrir la demande
              </Link>
            </div>
            <button type="button" className="rounded p-1 text-white/50 hover:text-white" onClick={() => setToasts((t) => t.filter((x) => x.id !== n.id))} aria-label="Fermer">
              <X className="size-4" />
            </button>
          </div>
        </div>
      ))}
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
