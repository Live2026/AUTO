import { formatXAF } from "@/lib/format";
import type { Service } from "@/lib/types";
import { DynamicIcon } from "./dynamic-icon";

export function ServiceTile({ service, highlight }: { service: Service; highlight?: boolean }) {
  return (
    <div className={`card flex gap-3 p-4 ${highlight ? "border-event/40" : ""}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-event-soft text-event">
        <DynamicIcon name={service.icon} className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="font-bold">{service.name}</p>
        <p className="text-sm text-muted">{service.description}</p>
        <p className="mt-1 text-xs font-semibold text-ink">
          {service.priceVisible && service.basePrice ? `À partir de ${formatXAF(service.basePrice)} / ${service.unit}` : "Sur devis"}
        </p>
      </div>
    </div>
  );
}
