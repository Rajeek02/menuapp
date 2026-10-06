"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrCard({ cafe }) {
  const [qr, setQr] = useState("");
  const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  const url = `${base}/${cafe.slug}`;

  useEffect(() => {
    QRCode.toDataURL(url, { width: 800, margin: 2 }).then(setQr);
  }, [url]);

  return (
    <div className="panel p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="label">Quick access</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">QR code</h2>
        </div>
      </div>

      <div className="rounded-[18px] border border-black/5 bg-[#f5f5f2] p-4">
        <div className="mx-auto max-w-[220px] rounded-[18px] bg-white p-4 shadow-[0_12px_30px_rgba(17,17,17,0.05)]">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code" className="mx-auto h-48 w-48 rounded-[12px]" />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center rounded-[12px] bg-[#f5f5f2] text-sm text-[#5f5a56]">
              Generating...
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 break-all text-sm text-[#5f5a56]">{url}</p>
      <a
        href={qr}
        download={`${cafe.slug}-qr.png`}
        className="primary-button mt-4"
      >
        Download QR
      </a>
    </div>
  );
}
