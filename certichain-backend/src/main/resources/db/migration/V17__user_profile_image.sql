-- Reconstructed from production's live schema (see V12's note). Avatar/profile
-- picture for any user (not institution-specific - see V11's institution
-- profile_image_url, a separate column on a separate table).
ALTER TABLE users ADD COLUMN profile_image_url VARCHAR(2048);
