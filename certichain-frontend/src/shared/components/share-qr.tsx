"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import QRCode from "qrcode"

export function ShareQr({ value, size = 180 }: { value: string; size?: number }) {
  const t = useTranslations("common")
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!value) {
      setDataUrl(null)
      return () => {
        cancelled = true
      }
    }
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [value, size])

  if (!dataUrl) {
    return <div className="rounded-md bg-[#f7f9fb]" style={{ width: size, height: size }} />
  }

  // eslint-disable-next-line @next/next/no-img-element -- data URL, no benefit from next/image
  return <img src={dataUrl} alt={t("qrAlt")} width={size} height={size} className="rounded-md" />
}
