-- Artist Booking schema (PostgreSQL)
-- Apply when USE_MEMORY_STORE is false and Postgres is configured.

CREATE TABLE IF NOT EXISTS users (
  user_id       SERIAL PRIMARY KEY,
  phone         VARCHAR(20) UNIQUE NOT NULL,
  name          VARCHAR(100),
  role          VARCHAR(20) CHECK (role IN ('artist', 'user')),
  is_onboarded  BOOLEAN DEFAULT FALSE,
  onboarding_step VARCHAR(50) DEFAULT 'role',
  otp           VARCHAR(8),
  otp_expiry    TIMESTAMPTZ,
  otp_requested_at TIMESTAMPTZ,
  otp_verify_attempts INTEGER DEFAULT 0,
  device_token  TEXT,
  device_platform VARCHAR(16),
  verification_status VARCHAR(32) DEFAULT 'pending',
  aadhaar_last4 VARCHAR(4),
  aadhaar_name VARCHAR(150),
  digilocker_transaction_id TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS customers (
  customer_id   SERIAL PRIMARY KEY,
  user_id       INTEGER UNIQUE NOT NULL REFERENCES users(user_id),
  name          VARCHAR(100) NOT NULL,
  interests     TEXT[] DEFAULT '{}',
  location      VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS artists (
  artist_id       SERIAL PRIMARY KEY,
  user_id         INTEGER UNIQUE NOT NULL REFERENCES users(user_id),
  name            VARCHAR(100) NOT NULL,
  stage_name      VARCHAR(100),
  bio             TEXT,
  category        VARCHAR(100),
  subcategory     VARCHAR(100),
  experience      VARCHAR(50),
  languages       TEXT[] DEFAULT '{}',
  events          TEXT[] DEFAULT '{}',
  location        VARCHAR(100),
  price           NUMERIC(12,2) DEFAULT 0,
  price_type      VARCHAR(20) DEFAULT 'fixed',
  travel_allowance NUMERIC(12,2) DEFAULT 0,
  trial_session_fee NUMERIC(12,2) DEFAULT 0,
  team_member_fee NUMERIC(12,2) DEFAULT 0,
  rating          NUMERIC(3,2) DEFAULT 0,
  reviews         INTEGER DEFAULT 0,
  bookings_count  INTEGER DEFAULT 0,
  badges          TEXT[] DEFAULT '{}',
  portfolio_photos TEXT[] DEFAULT '{}',
  portfolio_videos TEXT[] DEFAULT '{}',
  profile_photo   TEXT,
  id_image        TEXT,
  selfie_image    TEXT,
  video_interview TEXT,
  verified        BOOLEAN DEFAULT FALSE,
  availability    JSONB DEFAULT '{}'::jsonb,
  bank_account_number TEXT,
  bank_ifsc       VARCHAR(11),
  bank_account_name VARCHAR(150),
  bank_account_last4 VARCHAR(4),
  bank_verified   BOOLEAN DEFAULT FALSE,
  bank_verified_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS documents (
  document_id   SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  artist_id     INTEGER REFERENCES artists(artist_id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_path     TEXT NOT NULL,
  mime_type     VARCHAR(100),
  file_size     INTEGER DEFAULT 0,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_artist_id ON documents(artist_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);

CREATE TABLE IF NOT EXISTS categories (
  id      VARCHAR(50) PRIMARY KEY,
  name    VARCHAR(100) NOT NULL,
  emoji   VARCHAR(16)
);

CREATE TABLE IF NOT EXISTS bookings (
  booking_id         SERIAL PRIMARY KEY,
  customer_user_id   INTEGER NOT NULL REFERENCES users(user_id),
  artist_id          INTEGER NOT NULL REFERENCES artists(artist_id),
  event_date         DATE NOT NULL,
  event_time         VARCHAR(20),
  duration_hours     INTEGER DEFAULT 4,
  event_type         VARCHAR(100),
  location           VARCHAR(100),
  notes              TEXT,
  status             VARCHAR(20) DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  amount             NUMERIC(12,2) DEFAULT 0,
  client_name        VARCHAR(100),
  payment_status     VARCHAR(20) DEFAULT 'pending',
  razorpay_order_id  VARCHAR(64),
  razorpay_payment_id VARCHAR(64),
  payment_mock       BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ
);

INSERT INTO categories (id, name, emoji) VALUES
  ('makeup', 'Makeup', '💄'),
  ('mehendi', 'Mehendi', '🌿'),
  ('singer', 'Singer', '🎤'),
  ('dancer', 'Dancer', '💃'),
  ('dj', 'DJ', '🎧'),
  ('photo', 'Photo', '📷'),
  ('mc', 'MC/Anchor', '🎙️'),
  ('choreo', 'Choreographer', '🕺'),
  ('music', 'Instrumental', '🎻')
ON CONFLICT (id) DO NOTHING;
