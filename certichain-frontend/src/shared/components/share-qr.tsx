"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"

export function ShareQr({ value, size = 180 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, { width: size, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [value, size])

  if (!dataUrl) {
    return <div className="rounded-md bg-[#f7f9fb]" style={{ width: size, height: size }} />
  }

  // eslint-disable-next-line @next/next/no-img-element -- data URL, no benefit from next/image
  return <img src={dataUrl} alt="QR code linking to this share" width={size} height={size} className="rounded-md" />
}
