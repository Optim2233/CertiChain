ALTER TABLE dispute_flag DROP CONSTRAINT dispute_flag_status_check;
ALTER TABLE dispute_flag ADD CONSTRAINT dispute_flag_status_check
    CHECK (status IN ('OPEN','UPHELD','DISMISSED','WITHDRAWN'));
