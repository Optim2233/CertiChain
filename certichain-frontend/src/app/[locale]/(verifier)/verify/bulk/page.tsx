"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useVerifyBulk } from "@/features/verifier"
import type { BulkVerifyRow } from "@/features/verifier"
import { SpreadsheetPreview } from "@/shared/components/spreadsheet-preview"

/** A CSV line is either a bare share code or a full share link — pull the token out,
 *  mirroring the backend's bulk parser and the single-verify page. */
function shareToken(input: string) {
  const raw = input.trim()
  return raw.includes("/share/")
    ? raw.substring(raw.lastIndexOf("/share/") + 7).split(/[?#]/)[0].trim()
    : raw
}

const RESULT_STYLE: Record<string, { bg: string; color: string; icon: string; key: "verified" | "revoked" | "expired" | "notFound"; label?: string }> = {
  VERIFIED: { bg: "rgba(16,185,129,0.1)", color: "#0d9668", icon: "check_circle", key: "verified" },
  REVOKED: { bg: "#ffdad6", color: "#C0392B", icon: "cancel", key: "revoked" },
  EXPIRED: { bg: "#fff3d6", color: "#a5730f", icon: "schedule", key: "expired" },
  INVALID_NOT_FOUND: { bg: "#ffdad6", color: "#C0392B", icon: "error", key: "notFound" as const, label: undefined },
  SHARE_REVOKED: { bg: "#ffdad6", color: "#C0392B", icon: "cancel", key: "revoked" as const, label: undefined },
}

export default function BulkVerifyPage() {
  const t = useTranslations("verifier")
  const tc = useTranslations("common")
  const verifyBulk = useVerifyBulk()
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<BulkVerifyRow[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setFileName(file.name)
    setRows(null)
    verifyBulk.mutate(file, { onSuccess: ({ data }) => setRows(data) })
  }

  const isVerifying = verifyBulk.isPending

  const verifiedCount = rows?.filter((r) => r.result === "VERIFIED").length ?? 0
  const flaggedCount = (rows?.length ?? 0) - verifiedCount

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="m-0 mb-1.5 text-xs font-bold uppercase tracking-wide text-[#75777f]">{t("forEmployers")}</p>
          <h1 className="font-heading m-0 mb-2 text-[32px] font-extrabold">{t("bulkTitle")}</h1>
          <p className="m-0 max-w-[560px] text-[15px] text-[#44474e]">
            {t("bulkSub")}
          </p>
        </div>
        {/* ponytail: no API docs page exists (no OpenAPI/Swagger route mounted),
            so the button was removed rather than linking nowhere. */}
      </div>

      <div className="mb-6 rounded-lg border-2 p-6" style={{ borderColor: "#0462BA", background: "#eef5fc" }}>
        <h3 className="font-heading m-0 mb-1 text-xl font-bold" style={{ color: "#02275A" }}>
          {t("bulkFormatTitle")}
        </h3>
        <p className="m-0 text-sm text-[#44474e]">
          {t("bulkColNote")}
        </p>

        <ul className="mb-5 mt-4 list-disc space-y-1 pl-5 text-sm text-[#44474e]">
          <li>{t("bulkRowNote")}</li>
          <li>{t("bulkHeaderNote")}</li>
          <li>{t("bulkLinkNote")}</li>
          <li>{t("bulkBlankNote")}</li>
          <li>{t("bulkSharedNote")}</li>
        </ul>

        <div className="space-y-5">
          <div>
            <p className="m-0 mb-1.5 text-xs font-semibold text-[#44474e]">{t("bulkEx1")}</p>
            <SpreadsheetPreview
              columns={["share_code"]}
              rows={[
                ["3f2b9c74-1a8e-4d55-9b0c-7e6a1f4d2c88"],
                ["c1d0a5b6-2e3f-4a71-8c9d-0b1a2c3d4e5f"],
              ]}
            />
          </div>
          <div>
            <p className="m-0 mb-1.5 text-xs font-semibold text-[#44474e]">
              {t("bulkEx2")}
            </p>
            <SpreadsheetPreview
              columns={["share_link"]}
              rows={[
                ["https://certichain.app/share/3f2b9c74-1a8e-4d55-9b0c-7e6a1f4d2c88"],
                ["https://certichain.app/share/c1d0a5b6-2e3f-4a71-8c9d-0b1a2c3d4e5f"],
              ]}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-[#c5c6cf] bg-white p-8">
        {isVerifying ? (
          <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-[#c5c6cf] bg-[#f7f9fb] p-10 text-center">
            <div
              className="mb-3.5 size-14 animate-spin rounded-full border-4 border-[#e0e3e5]"
              style={{ borderTopColor: "#0462BA" }}
            />
            <h3 className="font-heading mb-1.5 text-lg font-semibold">{t("verifyingFile", { file: fileName ?? "" })}</h3>
            <p className="m-0 text-[13px] text-[#44474e]">
              {t("verifyingSub")}
            </p>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-[#c5c6cf] bg-[#f7f9fb] p-10 text-center"
          >
            <div className="mb-3.5 flex size-14 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.08)]">
              <span className="material-symbols-outlined text-[28px]" style={{ color: "#02275A" }}>cloud_upload</span>
            </div>
            <h3 className="font-heading mb-1.5 text-lg font-semibold">{t("dropList")}</h3>
            <p className="m-0 mb-5 text-[13px] text-[#44474e]">{t("csvHint")}</p>
            <button type="button" className="rounded border-2 px-5 py-2.5 text-[13px] font-semibold" style={{ borderColor: "#02275A", color: "#02275A" }}>
              {t("browseFiles")}
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          disabled={isVerifying}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {verifyBulk.isError && (
        <div className="mb-6 flex items-center gap-2.5 rounded border border-[rgba(192,57,43,0.3)] bg-[rgba(192,57,43,0.08)] px-4 py-3.5">
          <span className="material-symbols-outlined" style={{ color: "#C0392B" }}>error</span>
          <p className="m-0 text-sm font-semibold" style={{ color: "#C0392B" }}>
            {verifyBulk.error?.message || t("verifyFailed")}
          </p>
        </div>
      )}

      {fileName && rows && (
        <div className="overflow-hidden rounded-lg border border-[#c5c6cf] bg-white">
          <div className="flex items-center justify-between border-b border-[#c5c6cf] px-6 py-5">
            <div>
              <h3 className="font-heading m-0 text-lg font-semibold">{t("resultsFor", { file: fileName })}</h3>
              <p className="m-0 mt-1 text-[13px] text-[#44474e]">
                {t("resultsSummary", { n: rows.length, t: rows.length, v: verifiedCount, f: flaggedCount })}
              </p>
            </div>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: "#02275A" }} className="text-xs uppercase tracking-wide text-white">
                <th className="px-6 py-3 text-left">{t("shareCodeHdr")}</th>
                <th className="px-4 py-3 text-left">{tc("credential")}</th>
                <th className="px-4 py-3 text-left">{t("resultHdr")}</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const style = RESULT_STYLE[r.result]
                const token = shareToken(r.input)
                return (
                  <tr key={i} className="border-b border-[#c5c6cf]" style={{ background: r.result === "VERIFIED" ? "#fff" : "#fff6f5" }}>
                    <td className="px-6 py-3 font-mono text-[13px] text-[#44474e]">{r.input}</td>
                    <td className="px-4 py-3 text-[13px] text-[#44474e]">{r.credentialTitle ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: style.bg, color: style.color }}>
                        <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
                        {tc(style.key)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/share/${token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[13px] font-semibold underline underline-offset-4"
                        style={{ color: "#0462BA" }}
                      >
                        {tc("view")}
                        <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
