-- Reconstructed from production's live schema (see V12's note). Personal
-- profile fields for graduate users - name and phone.
ALTER TABLE users
    ADD COLUMN first_name VARCHAR(100),
    ADD COLUMN last_name  VARCHAR(100),
    ADD COLUMN phone      VARCHAR(50);
