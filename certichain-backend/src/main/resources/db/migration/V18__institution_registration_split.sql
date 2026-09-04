-- Reconstructed from production's live schema (see V12's note). Splits the
-- bare-bones name/ministry registration (V1) into a full legal/registration
-- profile: address, establishment documents, company/registration numbers,
-- ownership, and investment details.
ALTER TABLE institution
    ADD COLUMN institution_type              VARCHAR(10),
    ADD COLUMN institution_name_mm           VARCHAR(255),
    ADD COLUMN institution_category          VARCHAR(20),
    ADD COLUMN state_region                  VARCHAR(100),
    ADD COLUMN district                      VARCHAR(100),
    ADD COLUMN township                      VARCHAR(100),
    ADD COLUMN ward                          VARCHAR(100),
    ADD COLUMN street                        TEXT,
    ADD COLUMN postal_code                   VARCHAR(20),
    ADD COLUMN year_established              INTEGER,
    ADD COLUMN establishment_doc_type        VARCHAR(30),
    ADD COLUMN establishment_doc_title       TEXT,
    ADD COLUMN establishment_doc_ref         VARCHAR(255),
    ADD COLUMN establishment_doc_issue_date  DATE,
    ADD COLUMN establishment_doc_url         TEXT,
    ADD COLUMN company_name                  VARCHAR(255),
    ADD COLUMN dica_certificate_number       VARCHAR(100),
    ADD COLUMN myco_registration_number      VARCHAR(100),
    ADD COLUMN tin_number                    VARCHAR(100),
    ADD COLUMN incorporation_date            DATE,
    ADD COLUMN ownership_structure           VARCHAR(100),
    ADD COLUMN investment_amount             BIGINT,
    ADD COLUMN foreign_involvement           BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN mic_permit_number             VARCHAR(100),
    ADD COLUMN dica_certificate_url          TEXT,
    ADD COLUMN tax_clearance_url             TEXT,
    ADD COLUMN mic_permit_url                TEXT,
    ADD COLUMN founders                      JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN administrator                 JSONB;

ALTER TABLE institution_document ADD COLUMN file_url TEXT;
