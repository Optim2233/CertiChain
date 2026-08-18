"use client"

import type { ReactNode } from "react"

export function AuthBrandPanel({
  icon,
  heading,
  body,
  footer,
  children,
}: {
  icon: string
  heading: string
  body: string
  footer: string
  children?: ReactNode
}) {
  return (
    <aside
      className="relative hidden w-[500px] shrink-0 flex-col justify-between overflow-hidden p-12 lg:flex"
      style={{ background: "linear-gradient(160deg, #02275A, #031B42)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: "repeating-linear-gradient(125deg, #fff 0px, #fff 1px, transparent 1px, transparent 7px)",
          animation: "authDiagonalScroll 3s linear infinite",
        }}
      />
      <span
        className="material-symbols-outlined pointer-events-none absolute -bottom-3 -right-5 opacity-[0.06]"
        style={{ fontSize: 220, color: "#fff", animation: "authFloat 7s ease-in-out infinite" }}
      >
        {icon}
      </span>
      <div className="relative flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-white">
          <span className="material-symbols-outlined text-[20px]" style={{ color: "#02275A" }}>{icon}</span>
        </div>
        <span className="font-heading text-lg font-extrabold text-white">CertiChain</span>
      </div>
      <div className="relative">
        <h2 className="font-heading m-0 mb-3 max-w-[340px] text-[30px] font-extrabold leading-tight text-white">{heading}</h2>
        <p className="m-0 max-w-[320px] text-sm leading-relaxed text-[#d5e3ff] opacity-85">{body}</p>
        {children}
      </div>
      <p className="relative m-0 text-xs text-[#7f9bd6]">{footer}</p>
      <style jsx>{`
        @keyframes authDiagonalScroll {
          from { transform: translate(0, 0); }
          to { transform: translate(24px, 0); }
        }
        @keyframes authFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </aside>
  )
}
