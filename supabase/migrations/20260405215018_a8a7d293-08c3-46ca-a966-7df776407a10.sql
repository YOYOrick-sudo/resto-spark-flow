DROP INDEX IF EXISTS idx_customers_location_phone;
ALTER TABLE public.customers ADD CONSTRAINT uq_customers_location_phone UNIQUE (location_id, phone_number);