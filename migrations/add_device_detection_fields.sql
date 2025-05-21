-- Migration untuk menambahkan kolom deteksi perangkat ke tabel devices

-- Tambahkan kolom untuk fingerprint
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS device_fingerprint varchar;

-- Tambahkan kolom untuk informasi perangkat
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS device_type varchar,
ADD COLUMN IF NOT EXISTS device_brand varchar,
ADD COLUMN IF NOT EXISTS device_model varchar;

-- Tambahkan kolom untuk informasi sistem operasi
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS os_name varchar,
ADD COLUMN IF NOT EXISTS os_version varchar;

-- Tambahkan kolom untuk informasi browser
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS client_type varchar,
ADD COLUMN IF NOT EXISTS client_name varchar,
ADD COLUMN IF NOT EXISTS client_version varchar;

-- Tambahkan kolom untuk user agent dan first seen
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS first_seen timestamptz DEFAULT NOW();

-- Tambahkan indeks untuk pencarian yang lebih cepat
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices (device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_devices_brand_model ON devices (device_brand, device_model);
CREATE INDEX IF NOT EXISTS idx_devices_ip_address ON devices (ip_address);

-- Fungsi untuk pengecekan apakah kolom ada
CREATE OR REPLACE FUNCTION column_exists(tname text, cname text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = tname
    AND column_name = cname
  );
END;
$$ LANGUAGE plpgsql;

-- Update nilai "unknown" untuk records yang ada
UPDATE devices
SET device_fingerprint = 'unknown'
WHERE device_fingerprint IS NULL;
