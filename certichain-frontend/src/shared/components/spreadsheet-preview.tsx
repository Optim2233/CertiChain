const COLUMN_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

/** Static Excel-style grid: column letters, row numbers, gridlines - no real screenshot exists, this is the mockup. */
export function SpreadsheetPreview({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded border border-[#c5c6cf]">
      <table className="border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 w-10 border border-[#c5c6cf] bg-[#e8eaed] text-xs font-normal text-[#75777f]" />
            {columns.map((_, i) => (
              <th
                key={i}
                className="min-w-[140px] border border-[#c5c6cf] bg-[#e8eaed] px-3 py-1 text-xs font-normal text-[#75777f]"
              >
                {COLUMN_LETTERS[i] ?? i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="sticky left-0 border border-[#c5c6cf] bg-[#e8eaed] text-center text-xs text-[#75777f]">1</td>
            {columns.map((col, i) => (
              <td key={i} className="border border-[#c5c6cf] bg-[#f2f4f6] px-3 py-1.5 font-mono text-xs font-bold text-[#191c1e]">
                {col}
              </td>
            ))}
          </tr>
          {rows.map((row, r) => (
            <tr key={r}>
              <td className="sticky left-0 border border-[#c5c6cf] bg-[#e8eaed] text-center text-xs text-[#75777f]">{r + 2}</td>
              {columns.map((_, c) => (
                <td key={c} className="border border-[#c5c6cf] bg-white px-3 py-1.5 font-mono text-xs text-[#191c1e]">
                  {row[c] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
