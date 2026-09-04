-- Reconstructed from production's live schema (see V12's note - not originally
-- committed as a file). First pass at institution branding, before V19 expanded
-- it further with card-theming fields.
ALTER TABLE institution
    ADD COLUMN brand_color    VARCHAR(7),
    ADD COLUMN accent_pattern VARCHAR(10) NOT NULL DEFAULT 'hatch';
