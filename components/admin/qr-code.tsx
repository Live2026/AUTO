"use client";

import QRCode from "qrcode";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonClass } from "../ui";

/** QR code (§48) — pointe vers la fiche avec ?utm_source=qr pour mesurer les scans. */
export function QrCodeCard({ url, filename, label }: { url: string; filename: string; label?: string }) {
  const [svg, setSvg] = useState("");
  const [png, setPng] = useState("");
  useEffect(() => {
    let alive = true;
    void QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0b1220", light: "#ffffff" } }).then((s) => alive && setSvg(s));
    void QRCode.toDataURL(url, { width: 1024, margin: 2, color: { dark: "#0b1220", light: "#ffffff" } }).then((d) => alive && setPng(d));
    return () => {
      alive = false;
    };
  }, [url]);
  return (
    <div className="flex items-center gap-4">
      <div className="size-28 shrink-0 rounded-xl border border-line p-1.5" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="min-w-0 space-y-2 text-sm">
        {label && <p className="font-semibold">{label}</p>}
        <p className="truncate text-xs text-muted">{url}</p>
        <div className="flex gap-2">
          {png && <a href={png} download={`${filename}.png`} className={buttonClass("outline", "sm")}><Download className="size-4" /> PNG</a>}
          {svg && <a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} download={`${filename}.svg`} className={buttonClass("ghost", "sm")}>SVG</a>}
        </div>
      </div>
    </div>
  );
}
