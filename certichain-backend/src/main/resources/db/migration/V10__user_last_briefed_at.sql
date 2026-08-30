-- "While you were away" briefing: the window advances only when the user
-- acknowledges a card, never on login, so repeated logins keep showing the same
-- updates until they are actually dismissed. One column tracks that ack time and
-- also serves as the "have I nagged you recently?" clock.
ALTER TABLE users ADD COLUMN last_briefed_at TIMESTAMPTZ;
-- Existing users start from now, so nobody is handed a giant retroactive
-- briefing covering all history the first time they log in after deploy.
UPDATE users SET last_briefed_at = now() WHERE last_briefed_at IS NULL;
ALTER TABLE users ALTER COLUMN last_briefed_at SET NOT NULL;
