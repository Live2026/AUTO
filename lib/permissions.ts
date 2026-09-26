import type { Permission, RoleId } from "./types";

/** Miroir de supabase/migrations/20260926000100_reference_data.sql (R12). */
export const ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
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

export function can(roleId: RoleId | undefined, permission: Permission): boolean {
  if (!roleId) return false;
  const perms = ROLE_PERMISSIONS[roleId];
  return perms.includes("*") || perms.includes(permission);
}
