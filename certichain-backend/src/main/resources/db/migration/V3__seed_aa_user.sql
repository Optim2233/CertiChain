-- Seed the single Accreditation Authority account. No endpoint creates an AA user
-- (institutions self-register, graduates sign up; nothing issues AA accounts), and the
-- chk_user_institution_role constraint requires institution_id IS NULL for this role.
--
-- Login: aa@certichain.local / aa-dev-password
-- ponytail: hardcoded dev AA account, rotate the hash or drop this migration before any
-- real deployment.

INSERT INTO users (email, password_hash, role, institution_id, created_at)
VALUES (
    'aa@certichain.local',
    '$2a$10$9TJTbdBC.3ppf.pDzXOTSuGS3JJ0oSe0Cd0X.ArPnHK2WQWMordIS',
    'ACCREDITATION_AUTHORITY',
    NULL,
    now()
);
