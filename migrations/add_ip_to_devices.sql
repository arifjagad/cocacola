-- Migration untuk menambahkan kolom ip_address dan first_seen ke tabel devices
-- Jalankan di Supabase SQL Editor

-- Tambah kolom ip_address
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS ip_address varchar;

-- Tambah kolom first_seen dengan nilai default waktu saat ini
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS first_seen timestamptz DEFAULT NOW();

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

-- Update nilai ip_address untuk record yang ada menjadi 'unknown'
UPDATE devices
SET ip_address = 'unknown'
WHERE ip_address IS NULL;

-- Update nilai first_seen untuk record lama dengan last_active jika tersedia
UPDATE devices
SET first_seen = last_active
WHERE first_seen IS NULL AND last_active IS NOT NULL;
