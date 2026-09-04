-- In-app notification feed. recipient_user_id is a bare UUID with no enforced
-- FK, matching the rest of this schema's convention (actor_user_id, etc.).
CREATE TABLE notification (
    id UUID PRIMARY KEY,
    recipient_user_id UUID NOT NULL,
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL
);

-- Every read is "this user's notifications, newest first" or "this user's
-- unread count" - one composite index covers both.
CREATE INDEX idx_notification_recipient_created ON notification(recipient_user_id, created_at DESC);
