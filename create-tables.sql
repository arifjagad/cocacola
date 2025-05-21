-- Database schema for Coca-Cola Code Claimer subscription system

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  access_code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('Trial', 'Premium', 'Ultimate')),
  customer_name VARCHAR(255),
  email VARCHAR(255),
  contact_info VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  device_limit INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create index on access_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_access_code ON subscriptions(access_code);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  browser_info TEXT,
  ip_address VARCHAR(45),
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on subscription_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_devices_subscription_id ON devices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);

-- Function to generate random access codes
CREATE OR REPLACE FUNCTION generate_random_access_code()
RETURNS VARCHAR AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result VARCHAR := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars)) + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate access_code if not provided
CREATE OR REPLACE FUNCTION set_default_access_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.access_code IS NULL OR NEW.access_code = '' THEN
    NEW.access_code := generate_random_access_code();
    
    -- Make sure the code is unique
    WHILE EXISTS (SELECT 1 FROM subscriptions WHERE access_code = NEW.access_code) LOOP
      NEW.access_code := generate_random_access_code();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_set_default_access_code ON subscriptions;
CREATE TRIGGER trigger_set_default_access_code
BEFORE INSERT ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION set_default_access_code();

-- Insert sample subscriptions (comment out in production)
/*
INSERT INTO subscriptions (access_code, type, customer_name, contact_info, expiry_date, device_limit)
VALUES 
  ('demo123', 'Premium', 'Demo User', '62812345678', NOW() + INTERVAL '30 days', 2),
  ('test456', 'Basic', 'Test User', '62856789012', NOW() + INTERVAL '7 days', 2),
  ('ultimate789', 'Ultimate', 'VIP User', '62878901234', NOW() + INTERVAL '90 days', 3);
*/
