"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Link } from "@/i18n/navigation"
import { useIssueActivityRecord } from "@/features/institution"

// ponytail: suggested quick-add fields specific to activity records (vs. certificate's
// degree/gradDate) - not enforced by the backend, which accepts any name/value pair.
const SUGGESTED_FIELDS = ["Organizer", "Role", "Location"]

export default function ActivityRecordsPage() {
  const t = useTranslations("institution")
  const tc = useTranslations("common")
  const issue = useIssueActivityRecord()
  const [email, setEmail] = useState("")
  const [date, setDate] = useState("")
  const [title, setTitle] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [touched, setTouched] = useState({ email: false, date: false, title: false })
  const [extraFields, setExtraFields] = useState<{ name: string; value: string }[]>([])

  const emailValid = /\S+@\S+\.\S+/.test(email)
  const dateValid = date.trim().length > 0
  const titleValid = title.trim().length > 0
  const allValid = emailValid && dateValid && titleValid

  function submit() {
    setTouched({ email: true, date: true, title: true })
    if (!allValid) return
    issue.mutate(
      {
        graduateEmail: email,
        activity: title,
        date,
        fields: extraFields.filter((f) => f.name.trim() && f.value.trim()),
        expiresAt: expiresAt || undefined,
      },
      {
        onSuccess: () => {
          toast.success(t("recordOk"))
          setEmail("")
          setDate("")
          setTitle("")
          setExtraFields([])
          setExpiresAt("")
          setTouched({ email: false, date: false, title: false })
        },
      }
    )
  }

  return (
    <main className="w-full px-6 py-8">
      <div className="mb-2 flex items-center gap-2 text-sm text-[#44474e]">
        <Link href="/institution/issue" className="hover:underline underline-offset-4" style={{ color: "#005eb3" }}>{t("issueNew")}</Link>
        <span>/</span><span className="font-bold text-[#191c1e]">{t("activityRecords")}</span>
      </div>
      <h2 className="font-heading m-0 mb-2 text-[32px] font-bold">{t("actTitle")}</h2>
      <p className="m-0 mb-6 max-w-[640px] text-lg text-[#44474e]">
        {t("actSub")}
      </p>

      <div className="grid gap-6" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <div className="rounded-lg border border-[#c5c6cf] bg-white p-8">
          <div className="mb-5 grid grid-cols-2 gap-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">{t("graduateEmail")}</label>
              <input
                type="email"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                className="w-full rounded border px-3.5 py-2.5 text-sm"
                style={{ borderColor: touched.email && !emailValid ? "#C0392B" : "#c5c6cf" }}
              />
              {touched.email && !emailValid && <p className="mt-1 text-xs text-[#C0392B]">{t("validEmail")}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">{t("achieveDate")}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, date: true }))}
                className="w-full rounded border px-3.5 py-2.5 text-sm"
                style={{ borderColor: touched.date && !dateValid ? "#C0392B" : "#c5c6cf" }}
              />
              {touched.date && !dateValid && <p className="mt-1 text-xs text-[#C0392B]">{t("achieveDateRequired")}</p>}
            </div>
          </div>
          <label className="mb-1.5 block text-sm font-semibold">{t("activityTitleLbl")}</label>
          <input
            type="text"
            placeholder="e.g. Student Union President"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, title: true }))}
            className="mb-1 w-full rounded border px-3.5 py-2.5 text-sm"
            style={{ borderColor: touched.title && !titleValid ? "#C0392B" : "#c5c6cf" }}
          />
          {touched.title && !titleValid && <p className="mb-3 text-xs text-[#C0392B]">{t("activityTitleRequired")}</p>}

          <label className="mb-1.5 mt-4 block text-sm font-semibold">{t("expiresOn")}</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="mb-1 w-full max-w-[240px] rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
          />
          <p className="mb-4 text-xs text-[#75777f]">{t("expiryHint")}</p>

          <div className="mb-6">
            {extraFields.map((f, i) => (
              <div key={i} className="mb-3 grid grid-cols-2 gap-5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t("fieldNamePh")}
                    value={f.name}
                    onChange={(e) =>
                      setExtraFields((rows) => rows.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)))
                    }
                    className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t("fieldValuePh")}
                    value={f.value}
                    onChange={(e) =>
                      setExtraFields((rows) => rows.map((r, idx) => (idx === i ? { ...r, value: e.target.value } : r)))
                    }
                    className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setExtraFields((rows) => rows.filter((_, idx) => idx !== i))}
                    aria-label={tc("remove")}
                    className="flex shrink-0 items-center justify-center rounded border border-[#c5c6cf] px-2.5 text-[#75777f]"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setExtraFields((rows) => [...rows, { name: "", value: "" }])}
                className="flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: "#005eb3" }}
              >
                <span className="material-symbols-outlined text-lg">add</span>
                {t("addField")}
              </button>
              {SUGGESTED_FIELDS.filter((name) => !extraFields.some((f) => f.name === name)).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setExtraFields((rows) => [...rows, { name, value: "" }])}
                  className="rounded-full border border-[#c5c6cf] px-3 py-1 text-xs font-semibold text-[#44474e]"
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>

          {issue.isError && (
            <div className="mb-5 flex items-center gap-2.5 rounded border border-[rgba(192,57,43,0.3)] bg-[rgba(192,57,43,0.08)] px-4 py-3.5">
              <span className="material-symbols-outlined" style={{ color: "#C0392B" }}>error</span>
              <p className="m-0 text-sm font-semibold" style={{ color: "#C0392B" }}>
                {t("recordFailed")}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#c5c6cf] pt-5">
            <div className="flex items-center gap-2 text-xs italic text-[#44474e]">
              <span className="material-symbols-outlined text-lg">lock</span>
              {t("lockNote")}
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={issue.isPending}
              className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "#0462BA" }}
            >
              <span className="material-symbols-outlined">check_circle</span>
              {issue.isPending ? t("issuing") : t("issueRecord")}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-lg p-5" style={{ background: "#d8e2ff" }}>
            <h3 className="font-heading m-0 mb-3 flex items-center gap-2 text-lg font-semibold" style={{ color: "#041a3e" }}>
              <span className="material-symbols-outlined">info</span>
              {t("guidance")}
            </h3>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm" style={{ color: "#34466c" }}>
              <li>{t("guide1")}</li>
              <li>{t("guide2")}</li>
              <li>{t("guide3")}</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
