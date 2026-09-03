// Seed sample accreditation PDFs so the AA institution-detail preview is demoable
// out of the box. The register API only accepts documents at /apply time and there
// is no self-service upload, so this inserts institution_document rows directly.
//
//   node seed-documents.mjs
//
// Idempotent: skips an institution that already has a document with the same name.
// DB URL is read from ../../certichain-backend/.env (DATABASE_URL, JDBC form).

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import pg from "pg"

const here = dirname(fileURLToPath(import.meta.url))
const PDF_PATH = "C:/Users/Thura Htet/OneDrive/Documents/institution_license.pdf"

// row number (institution-ids.tsv) -> [filename, ...]. Rows deliberately left out
// (e.g. #2, #4, #5) keep an empty documents list so the empty state is exercised too.
const DOCS = {
  1: ["accreditation-certificate.pdf", "ministry-charter.pdf"], // YTU, APPROVED
  3: ["accreditation-certificate.pdf"],                          // University of Yangon, APPROVED
  6: ["accreditation-certificate.pdf"],                          // UM1, APPROVED
  8: ["accreditation-application.pdf"],                          // Co-operative Univ, PENDING — exercises the review flow
}

function dbUrl() {
  const env = readFileSync(resolve(here, "../../certichain-backend/.env"), "utf8")
  const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="))
  if (!line) throw new Error("DATABASE_URL not found in certichain-backend/.env")
  const jdbc = line.slice("DATABASE_URL=".length).trim()
  // jdbc:postgresql://host/db?user=U&password=P&sslmode=require&... -> postgres URL
  const u = new URL(jdbc.replace(/^jdbc:postgresql:/, "postgresql:"))
  const user = u.searchParams.get("user")
  const password = u.searchParams.get("password")
  u.searchParams.delete("user")
  u.searchParams.delete("password")
  u.searchParams.delete("channelBinding")
  u.username = user
  u.password = password
  return u.toString()
}

const ids = Object.fromEntries(
  readFileSync(resolve(here, "institution-ids.tsv"), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => l.split("\t"))
    .map(([row, id]) => [row, id])
)

const pdf = readFileSync(PDF_PATH)
const client = new pg.Client({ connectionString: dbUrl() })
await client.connect()

let inserted = 0
let skipped = 0
for (const [row, names] of Object.entries(DOCS)) {
  const institutionId = ids[row]
  if (!institutionId) {
    console.warn(`row ${row}: no institution id in institution-ids.tsv — skipped`)
    continue
  }
  for (const name of names) {
    const existing = await client.query(
      "SELECT 1 FROM institution_document WHERE institution_id = $1 AND file_name = $2",
      [institutionId, name]
    )
    if (existing.rowCount > 0) {
      skipped++
      continue
    }
    await client.query(
      `INSERT INTO institution_document (id, institution_id, file_name, file_data, verified, uploaded_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, now())`,
      [institutionId, name, pdf, row !== "8"] // pending institution's doc left unverified
    )
    inserted++
    console.log(`row ${row} (${institutionId}): + ${name}`)
  }
}

console.log(`\ndone — ${inserted} inserted, ${skipped} already present`)
await client.end()
