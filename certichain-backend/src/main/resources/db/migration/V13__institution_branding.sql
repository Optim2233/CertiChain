ALTER TABLE institution ADD COLUMN brand_color VARCHAR(7);
ALTER TABLE institution ADD COLUMN accent_pattern VARCHAR(10) NOT NULL DEFAULT 'hatch';
