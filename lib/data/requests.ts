"use client";

// Envoi des demandes publiques avec file hors-ligne (docs/03 §4).
// Mode mock : le « backend » est l'IndexedDB locale (lib/db/mock-backend.ts).
// Mode Supabase : POST vers une Server Action (validation Zod + Turnstile) → RPC submit_public_request.

import { publicDb } from "../db/public-db";
import { submitPublicRequest } from "../db/mock-backend";
import { REQUEST_TYPE_LABELS } from "../labels";
import type { PublicRequestPayload, PublicRequestResult } from "../types";

const SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";

async function send(payload: PublicRequestPayload): Promise<PublicRequestResult> {
  if (SOURCE === "mock") return submitPublicRequest(payload);
  throw new Error("Supabase n'est pas encore configuré (NEXT_PUBLIC_DATA_SOURCE=supabase).");
}

export type SubmitOutcome = { status: "sent"; result: PublicRequestResult } | { status: "queued" };

export async function submitRequest(payload: PublicRequestPayload, summary: string): Promise<SubmitOutcome> {
  if (SOURCE !== "mock" && typeof navigator !== "undefined" && !navigator.onLine) {
    await publicDb.outbox.add({ payload, attempts: 0, createdAt: new Date().toISOString() });
    return { status: "queued" };
  }
  const result = await send(payload);
  await publicDb.myRequests.put({
    reference: result.reference,
    trackingToken: result.trackingToken,
    type: payload.type,
    summary: summary || REQUEST_TYPE_LABELS[payload.type],
    createdAt: new Date().toISOString(),
  });
  return { status: "sent", result };
}

/** Rejoue la file d'envoi (appelé au retour du réseau). */
export async function flushOutbox(): Promise<number> {
  const items = await publicDb.outbox.orderBy("createdAt").toArray();
  let sent = 0;
  for (const item of items) {
    try {
      await submitRequest(item.payload, REQUEST_TYPE_LABELS[item.payload.type]);
      await publicDb.outbox.delete(item.id!);
      sent++;
    } catch (e) {
      await publicDb.outbox.update(item.id!, { attempts: item.attempts + 1, lastError: String(e) });
    }
  }
  return sent;
}
