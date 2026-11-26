CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants(
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name   TEXT NOT NULL,
    email   TEXT UNIQUE NOT NULL ,
    password_hash   TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api(
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenants_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE ,
    key_prefix   TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at   TIMESTAMPTZ 
);
CREATE TYPE job_priority AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TABLE IF NOT EXISTS jobs(
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenants_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE ,
    idempotency_key   TEXT ,
    target_url   TEXT NOT NULL ,
    payload  JSONB NOT NULL ,
    status   TEXT NOT NULL DEFAULT  'PENDING ' CHECK(status IN ( 'PENDING ',  'INPROGRESS ' ,  'COMPLETED ',  'DEAD ')),
    priority job_priority NOT NULL DEFAULT 'MEDIUM',
    attempts   INT NOT NULL DEFAULT 0,
    max_attempts   INT NOT NULL DEFAULT 5 CHECK(max_attempts BETWEEN 0 AND 20),
    run_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    locked_until   TIMESTAMPTZ,
    lock_token   UUID ,
    worker_id   TEXT ,
    last_error   TEXT ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenants_id , idempotency_key)
);

CREATE TABLE IF NOT EXISTS delivery_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  attempt_no   INT NOT NULL,
  http_status  INT,
  duration_ms  INT NOT NULL,
  error_msg    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_poll
  ON jobs (status, run_at, priority) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_jobs_lease
  ON jobs (status, locked_until) WHERE status = ' INPROGRESS';