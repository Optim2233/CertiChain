"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useIssueCertificate } from "@/features/institution"

export default function IssueCertificatePage() {
  const router = useRouter()
  const issue = useIssueCertificate()
  const [email, setEmail] = useState("")
  const [title, setTitle] = useState("")
  const [gradDate, setGradDate] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [touched, setTouched] = useState({ email: false, title: false, gradDate: false })
  const [extraFields, setExtraFields] = useState<{ name: string; value: string }[]>([])
  const [success, setSuccess] = useState(false)

  const emailValid = /\S+@\S+\.\S+/.test(email)
  const titleValid = title.trim().length > 0
  const dateValid = gradDate.trim().length > 0
  const allValid = emailValid && titleValid && dateValid

  function submit() {
    setTouched({ email: true, title: true, gradDate: true })
    if (!allValid) return
    issue.mutate(
      {
        graduateEmail: email,
        fields: [
          { name: "title", value: title },
          { name: "graduationDate", value: gradDate },
          ...extraFields.filter((f) => f.name.trim()),
        ],
        expiresAt: expiresAt || undefined,
      },
      {
        onSuccess: () => {
          setSuccess(true)
          setEmail("")
          setTitle("")
          setGradDate("")
          setExpiresAt("")
          setExtraFields([])
          setTouched({ email: false, title: false, gradDate: false })
        },
      }
    )
  }

  return (
    <main className="w-full px-6 py-8">
      <div className="mb-2 flex items-center gap-2 text-sm text-[#44474e]">
        <span>Dashboard</span><span>/</span><span className="font-bold text-[#191c1e]">Issue New</span>
      </div>
      <h2 className="font-heading m-0 mb-2 text-[32px] font-bold">Issue Single Certificate</h2>
      <p className="m-0 mb-6 text-base text-[#44474e]">
        Enter details for the new degree or diploma. All fields are required unless marked otherwise.
      </p>

      <div className="rounded-lg border border-[#c5c6cf] bg-white p-8">
        <h3 className="font-heading mb-4 border-b border-[#c5c6cf] pb-2 text-xl font-semibold" style={{ color: "#02275A" }}>
          Recipient Information
        </h3>
        <label className="mb-1.5 block text-sm font-bold">
          Graduate Email Address <span style={{ color: "#C0392B" }}>*</span>
        </label>
        <input
          type="email"
          placeholder="student@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          className="mb-1 w-full rounded border px-3.5 py-2.5 text-sm"
          style={{ borderColor: touched.email && !emailValid ? "#C0392B" : "#c5c6cf" }}
        />
        {touched.email && !emailValid && <p className="mb-5 text-xs text-[#C0392B]">Enter a valid email address.</p>}

        <h3 className="font-heading mb-4 mt-6 border-b border-[#c5c6cf] pb-2 text-xl font-semibold" style={{ color: "#02275A" }}>
          Credential Details
        </h3>
        <label className="mb-1.5 block text-sm font-bold">
          Degree or Program Title <span style={{ color: "#C0392B" }}>*</span>
        </label>
        <input
          type="text"
          placeholder="e.g., Bachelor of Science in Computer Science"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, title: true }))}
          className="mb-1 w-full rounded border px-3.5 py-2.5 text-sm"
          style={{ borderColor: touched.title && !titleValid ? "#C0392B" : "#c5c6cf" }}
        />
        {touched.title && !titleValid && <p className="mb-3 text-xs text-[#C0392B]">Degree or program title is required.</p>}

        <div className="mt-4 mb-6 grid grid-cols-2 gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-bold">
              Graduation Date <span style={{ color: "#C0392B" }}>*</span>
            </label>
            <input
              type="date"
              value={gradDate}
              onChange={(e) => setGradDate(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, gradDate: true }))}
              className="w-full rounded border px-3.5 py-2.5 text-sm"
              style={{ borderColor: touched.gradDate && !dateValid ? "#C0392B" : "#c5c6cf" }}
            />
            {touched.gradDate && !dateValid && <p className="mt-1 text-xs text-[#C0392B]">Graduation date is required.</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold">Expires On (optional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="mb-6">
          {extraFields.map((f, i) => (
            <div key={i} className="mb-3 grid grid-cols-2 gap-5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Field name (e.g., Minor, Honors)"
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
                  placeholder="Value"
                  value={f.value}
                  onChange={(e) =>
                    setExtraFields((rows) => rows.map((r, idx) => (idx === i ? { ...r, value: e.target.value } : r)))
                  }
                  className="w-full rounded border border-[#c5c6cf] px-3.5 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setExtraFields((rows) => rows.filter((_, idx) => idx !== i))}
                  aria-label="Remove field"
                  className="flex shrink-0 items-center justify-center rounded border border-[#c5c6cf] px-2.5 text-[#75777f]"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setExtraFields((rows) => [...rows, { name: "", value: "" }])}
            className="flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: "#005eb3" }}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Field
          </button>
        </div>

        <div className="flex gap-3 rounded bg-[#d8e2ff] p-4">
          <span className="material-symbols-outlined" style={{ color: "#005eb3" }}>info</span>
          <div>
            <p className="m-0 text-sm font-bold" style={{ color: "#02275A" }}>Immutable Record Warning</p>
            <p className="m-0 mt-1 text-xs text-[#44474e]">Once issued on the blockchain, this certificate cannot be modified.</p>
          </div>
        </div>

        {success && (
          <div className="mt-4 flex items-center gap-2.5 rounded border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.1)] px-4 py-3.5">
            <span className="material-symbols-outlined" style={{ color: "#0d9668" }}>check_circle</span>
            <p className="m-0 text-sm font-semibold" style={{ color: "#0d9668" }}>
              Certificate signed and issued. Graduate has been notified.
            </p>
          </div>
        )}

        {issue.isError && (
          <div className="mt-4 flex items-center gap-2.5 rounded border border-[rgba(192,57,43,0.3)] bg-[rgba(192,57,43,0.08)] px-4 py-3.5">
            <span className="material-symbols-outlined" style={{ color: "#C0392B" }}>error</span>
            <p className="m-0 text-sm font-semibold" style={{ color: "#C0392B" }}>
              {issue.error?.message || "Couldn't issue this certificate. Please try again."}
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-end gap-4 border-t border-[#c5c6cf] pt-6">
          <button
            type="button"
            onClick={() => router.push("/institution")}
            className="rounded border border-[#c5c6cf] bg-white px-6 py-3 text-sm font-bold text-[#44474e]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={issue.isPending}
            className="flex items-center gap-2 rounded px-8 py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "#0462BA" }}
          >
            <span className="material-symbols-outlined">edit_document</span>
            {issue.isPending ? "Issuing…" : "Sign & Issue on Blockchain"}
          </button>
        </div>
      </div>
    </main>
  )
}
