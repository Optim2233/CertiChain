-- Reconstructed from production's live schema (see V12's note). Visual
-- theming for the rendered credential card - beyond V13's basic brand color.
ALTER TABLE institution
    ADD COLUMN secondary_brand_color VARCHAR(7),
    ADD COLUMN accent_color         VARCHAR(10) DEFAULT 'light',
    ADD COLUMN watermark_opacity    INTEGER     DEFAULT 8,
    ADD COLUMN pattern_scale        VARCHAR(10) DEFAULT 'md',
    ADD COLUMN card_radius          VARCHAR(10) DEFAULT 'lg',
    ADD COLUMN title_font           VARCHAR(10) DEFAULT 'heading',
    ADD COLUMN logo_shape           VARCHAR(10) DEFAULT 'rounded',
    ADD COLUMN medal_style          VARCHAR(10) DEFAULT 'foil',
    ADD COLUMN medal_shape          VARCHAR(10) DEFAULT 'rounded',
    ADD COLUMN medal_position       VARCHAR(10) DEFAULT 'top-left',
    ADD COLUMN medal_icon           VARCHAR(20) DEFAULT 'auto',
    ADD COLUMN medal_size           VARCHAR(10) DEFAULT 'md',
    ADD COLUMN watermark_icon       VARCHAR(20) DEFAULT 'workspace_premium';
