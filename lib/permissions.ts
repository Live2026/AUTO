import type { Permission, RoleId } from "./types";

/** Miroir de supabase/migrations/20260926000100_reference_data.sql (R12). */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
  admin: ["*"],
  manager_auto: [
    "vehicles.write",
    "vehicles.internal",
    "crm.read_all",
    "crm.write_all",
    "appointments.write",
    "marketing.write",
    "media.write",
    "quotes.write",
    "analytics.read",
    "notifications.new_requests",
  ],
  manager_rental: [
    "rentals.write",
    "drivers.write",
    "crm.read_all",
    "crm.write_all",
    "quotes.write",
    "media.write",
    "analytics.read",
    "notifications.new_requests",
  ],
  manager_events: [
    "events.write",
    "quotes.write",
    "crm.read_all",
    "crm.write_all",
    "drivers.write",
    "media.write",
    "marketing.write",
    "analytics.read",
    "notifications.new_requests",
  ],
  sales: ["crm.write_own", "appointments.write"],
  accountant: ["quotes.read", "finance.read", "analytics.read"],
  driver: [],
};

/** Permissions en vigueur — modifiables par l'administrateur (§42), synchronisées par AdminShell. */
let current: Record<RoleId, Permission[]> = DEFAULT_ROLE_PERMISSIONS;

export function setRolePermissions(map: Record<RoleId, Permission[]>) {
  current = map;
}

export function rolePermissions(roleId: RoleId): Permission[] {
  return current[roleId] ?? [];
}

export function can(roleId: RoleId | undefined, permission: Permission): boolean {
  if (!roleId) return false;
  // L'administrateur garde toujours tous les droits (évite de se verrouiller dehors).
  if (roleId === "admin") return true;
  const perms = rolePermissions(roleId);
  return perms.includes("*") || perms.includes(permission);
}

export const ALL_PERMISSIONS: [Permission, string][] = [
  ["vehicles.write", "Véhicules — gérer"],
  ["vehicles.internal", "Véhicules — données internes"],
  ["rentals.write", "Location — flotte & réservations"],
  ["drivers.write", "Chauffeurs"],
  ["events.write", "Événementiel"],
  ["quotes.read", "Devis — consulter"],
  ["quotes.write", "Devis — créer / envoyer"],
  ["crm.read_all", "CRM — voir toutes les demandes"],
  ["crm.write_all", "CRM — modifier toutes les demandes"],
  ["crm.write_own", "CRM — mes demandes"],
  ["appointments.write", "Rendez-vous & essais"],
  ["marketing.write", "Marketing (promotions, bannières, QR)"],
  ["media.write", "Médiathèque"],
  ["analytics.read", "Analytics & tableau de bord"],
  ["finance.read", "Chiffres financiers"],
  ["settings.write", "Paramètres de l'entreprise"],
  ["users.manage", "Utilisateurs & permissions"],
  ["audit.read", "Journal d'activité — consulter"],
  ["notifications.new_requests", "Alertes nouvelles demandes"],
];
