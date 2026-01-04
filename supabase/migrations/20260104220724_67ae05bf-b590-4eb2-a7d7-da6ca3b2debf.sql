-- Seed data voor development

-- 1. Organisatie aanmaken
INSERT INTO public.organizations (id, name, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Restaurant Groep', 'active')
ON CONFLICT (id) DO NOTHING;

-- 2. Org membership voor bestaande user
INSERT INTO public.org_memberships (user_id, organization_id)
VALUES ('452a65e8-75b7-4cd1-9736-66835823382e', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- 3. Locatie aanmaken
INSERT INTO public.locations (id, organization_id, name, slug, timezone)
VALUES ('22222222-2222-2222-2222-222222222222', 
        '11111111-1111-1111-1111-111111111111', 
        'Restaurant De Proeverij', 
        'de-proeverij',
        'Europe/Amsterdam')
ON CONFLICT (id) DO NOTHING;

-- 4. User koppelen als owner
INSERT INTO public.user_location_roles (user_id, location_id, role)
VALUES ('452a65e8-75b7-4cd1-9736-66835823382e', 
        '22222222-2222-2222-2222-222222222222', 
        'owner')
ON CONFLICT DO NOTHING;

-- 5. Reservation settings aanmaken (trigger maakt entitlements)
INSERT INTO public.reservation_settings (location_id)
VALUES ('22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;