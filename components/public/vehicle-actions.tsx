"use client";

import { CalendarClock, Car, Share2, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { rememberView } from "@/lib/db/public-db";
import { trackEvent } from "@/lib/db/mock-backend";
import type { Vehicle } from "@/lib/types";
import { Button } from "../ui";
import { Modal } from "../ui/modal";
import { CallButton, WhatsAppButton } from "./contact-links";
import { FavoriteButton } from "./favorite-button";
import { RequestForm } from "./request-form";

type Dialog = null | "interest" | "appointment" | "test_drive";

/** Actions fiche véhicule (§16) : intéressé, WhatsApp, appeler, RDV, essai, partager, favori. */
export function VehicleActions({
  vehicle,
  title,
  whatsappNumber,
  phoneNumber,
  whatsappMessage,
  shareUrl,
}: {
  vehicle: Vehicle;
  title: string;
  whatsappNumber: string;
  phoneNumber: string;
  whatsappMessage: string;
  shareUrl: string;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [shared, setShared] = useState(false);
  const sold = vehicle.status === "sold";

  useEffect(() => {
    void rememberView({ id: vehicle.id, kind: "vehicle", slug: vehicle.slug, title });
    void trackEvent("vehicle_view", { objectType: "vehicle", objectId: vehicle.id });
    if (new URLSearchParams(location.search).get("utm_source") === "qr") void trackEvent("qr_scan", { objectId: vehicle.id });
  }, [vehicle.id, vehicle.slug, title]);

  const share = async () => {
    void trackEvent("share_click", { objectId: vehicle.id });
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${title} — BRYAN MULTISERVICES`, url: shareUrl });
      } catch {
        /* partage annulé */
      }
    } else {
      await navigator.clipboard?.writeText(shareUrl);
      setShared(true);
    }
  };

  const base = { vehicleId: vehicle.id };
  const summary = `${title} (${vehicle.reference})`;

  return (
    <>
      <div className="space-y-2.5">
        {!sold && (
          <Button variant="gold" size="lg" className="w-full" onClick={() => setDialog("interest")}>
            <ThumbsUp className="size-5" /> Je suis intéressé
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <WhatsAppButton number={whatsappNumber} message={whatsappMessage} pole="sale" objectId={vehicle.id} label="WhatsApp" />
          <CallButton number={phoneNumber} pole="sale" />
        </div>
        {!sold && (
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" onClick={() => setDialog("appointment")}>
              <CalendarClock className="size-4" /> Rendez-vous
            </Button>
            <Button variant="outline" onClick={() => setDialog("test_drive")}>
              <Car className="size-4" /> Essai
            </Button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" onClick={share}>
            <Share2 className="size-4" /> {shared ? "Lien copié" : "Partager"}
          </Button>
          <FavoriteButton withLabel item={{ id: vehicle.id, kind: "vehicle", slug: vehicle.slug, title, subtitle: vehicle.version, price: vehicle.salePrice, colorHex: vehicle.colorHex }} />
        </div>
      </div>

      <Modal open={dialog === "interest"} onClose={() => setDialog(null)} title="Je suis intéressé">
        <p className="mb-4 rounded-xl bg-paper px-4 py-3 text-sm"><strong>{title}</strong> · {vehicle.reference}</p>
        <RequestForm type="sale" basePayload={base} summary={summary} whatsappNumber={whatsappNumber} messagePlaceholder="Une question sur ce véhicule ? (facultatif)" />
      </Modal>
      <Modal open={dialog === "appointment"} onClose={() => setDialog(null)} title="Prendre rendez-vous">
        <p className="mb-4 text-sm text-muted">Visite ou inspection du véhicule <strong className="text-ink">{title}</strong>. Le conseiller confirme le créneau avec vous.</p>
        <RequestForm type="appointment" basePayload={{ ...base, details: { appointmentKind: "visit" } }} summary={`RDV — ${summary}`} whatsappNumber={whatsappNumber} extras={["slot"]} submitLabel="Demander un rendez-vous" />
      </Modal>
      <Modal open={dialog === "test_drive"} onClose={() => setDialog(null)} title="Demander un essai">
        <p className="mb-4 text-sm text-muted">Essai du véhicule <strong className="text-ink">{title}</strong> — permis de conduire requis.</p>
        <RequestForm type="test_drive" basePayload={base} summary={`Essai — ${summary}`} whatsappNumber={whatsappNumber} extras={["slot"]} submitLabel="Demander un essai" />
      </Modal>
    </>
  );
}
