-- entitlement terug
UPDATE public.location_entitlements
SET enabled = false
WHERE location_id = 'cf4b94fa-9ac9-4779-81d9-7411a63c90b2'
  AND module_key = 'reservations';

-- test waitlist entry
DELETE FROM public.waitlist_entries
WHERE location_id = 'cf4b94fa-9ac9-4779-81d9-7411a63c90b2'
  AND first_name = 'Suppressor' AND last_name = 'Test';

-- test signals (alle die door verificatie zijn ontstaan)
DELETE FROM public.signals
WHERE location_id = 'cf4b94fa-9ac9-4779-81d9-7411a63c90b2';

-- test conversation + messages + customer
DELETE FROM public.messages
WHERE conversation_id = '9cee38c3-5b7e-4558-877d-d2924f63b9ae';

DELETE FROM public.conversations
WHERE id = '9cee38c3-5b7e-4558-877d-d2924f63b9ae';

DELETE FROM public.customers
WHERE location_id = 'cf4b94fa-9ac9-4779-81d9-7411a63c90b2'
  AND phone_number = '+31612345999';