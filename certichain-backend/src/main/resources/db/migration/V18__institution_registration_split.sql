-- Two-track registration: public vs private.
-- ministry stays (repurposed as governingMinistry for public; nullable for private backward-compat).
-- Address as columns (queryable), establishment as columns, business as columns,
-- founders/administrator as JSONB (variable shape, rarely queried individually),
-- document URLs as TEXT (Supabase storage, replaces file_data for new rows).

ALTER TABLE institution ADD COLUMN institution_type VARCHAR(10)
    CHECK (institution_type IN ('public','private'));
ALTER TABLE institution ADD COLUMN institution_name_mm VARCHAR(255);
ALTER TABLE institution ADD COLUMN institution_category VARCHAR(20)
    CHECK (institution_category IN ('university','college','degreeCollege','institute','center'));
ALTER TABLE institution ADD COLUMN state_region VARCHAR(100);
ALTER TABLE institution ADD COLUMN district VARCHAR(100);
ALTER TABLE institution ADD COLUMN township VARCHAR(100);
ALTER TABLE institution ADD COLUMN ward VARCHAR(100);
ALTER TABLE institution ADD COLUMN street TEXT;
ALTER TABLE institution ADD COLUMN postal_code VARCHAR(20);

-- public-only
ALTER TABLE institution ADD COLUMN year_established INT;
ALTER TABLE institution ADD COLUMN establishment_doc_type VARCHAR(30)
    CHECK (establishment_doc_type IN ('establishmentLaw','establishmentAct','governmentOrder','governmentDecree','subDecree'));
ALTER TABLE institution ADD COLUMN establishment_doc_title TEXT;
ALTER TABLE institution ADD COLUMN establishment_doc_ref VARCHAR(255);
ALTER TABLE institution ADD COLUMN establishment_doc_issue_date DATE;
ALTER TABLE institution ADD COLUMN establishment_doc_url TEXT;

-- private-only business
ALTER TABLE institution ADD COLUMN company_name VARCHAR(255);
ALTER TABLE institution ADD COLUMN dica_certificate_number VARCHAR(100);
ALTER TABLE institution ADD COLUMN myco_registration_number VARCHAR(100);
ALTER TABLE institution ADD COLUMN tin_number VARCHAR(100);
ALTER TABLE institution ADD COLUMN incorporation_date DATE;
ALTER TABLE institution ADD COLUMN ownership_structure VARCHAR(100);
ALTER TABLE institution ADD COLUMN investment_amount BIGINT;
ALTER TABLE institution ADD COLUMN foreign_involvement BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE institution ADD COLUMN mic_permit_number VARCHAR(100);
ALTER TABLE institution ADD COLUMN dica_certificate_url TEXT;
ALTER TABLE institution ADD COLUMN tax_clearance_url TEXT;
ALTER TABLE institution ADD COLUMN mic_permit_url TEXT;

-- variable-shape: founders array + administrator object -> JSONB (ponytail: avoids N tables for write-once data)
ALTER TABLE institution ADD COLUMN founders JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE institution ADD COLUMN administrator JSONB;

-- ministry becomes governingMinistry for public; allow NULL for legacy private migration compat
ALTER TABLE institution ALTER COLUMN ministry DROP NOT NULL;

-- legacy document table: keep rows, add URL for Supabase path; make file_data nullable for Supabase-only rows
ALTER TABLE institution_document ADD COLUMN file_url TEXT;
ALTER TABLE institution_document ALTER COLUMN file_data DROP NOT NULL;

-- backfill existing rows as private (they have ministry like MN-...), keep data
UPDATE institution SET institution_type = 'private' WHERE institution_type IS NULL;
