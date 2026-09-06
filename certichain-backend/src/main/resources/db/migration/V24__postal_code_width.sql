-- Ciphertext (16-char IV + dot + base64) overflows VARCHAR(20): even the shortest
-- postal code encodes to ~45 chars. Widened after V23 (which missed this one column).
ALTER TABLE institution ALTER COLUMN postal_code TYPE VARCHAR(255);
