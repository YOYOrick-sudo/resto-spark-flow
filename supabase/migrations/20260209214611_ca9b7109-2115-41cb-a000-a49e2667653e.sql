UPDATE public.onboarding_settings
SET email_templates = email_templates || '{
  "additional_questions": {
    "subject": "Aanvullende vragen over je aanmelding",
    "html_body": "<p>Beste [voornaam],</p><p>Bedankt voor je interesse in [vestiging]. We hebben nog een paar aanvullende vragen voor je. Reageer op deze email of neem contact met ons op.</p><p>Met vriendelijke groet,<br>[vestiging]</p>"
  },
  "trial_day_invite": {
    "subject": "Uitnodiging meeloopdag bij [vestiging]",
    "html_body": "<p>Beste [voornaam],</p><p>We nodigen je graag uit voor een meeloopdag bij [vestiging]. Tijdens deze dag maak je kennis met het team en krijg je een goed beeld van de werkzaamheden.</p><p>We nemen snel contact op om een datum te plannen.</p><p>Met vriendelijke groet,<br>[vestiging]</p>"
  },
  "offer_and_form": {
    "subject": "Aanbod en formulieren voor [vestiging]",
    "html_body": "<p>Beste [voornaam],</p><p>Goed nieuws! We willen je graag een aanbod doen. In de bijlage vind je de benodigde formulieren om je indiensttreding af te ronden.</p><p>Vul deze zo snel mogelijk in en stuur ze retour.</p><p>Met vriendelijke groet,<br>[vestiging]</p>"
  },
  "internal_reminder": {
    "subject": "Herinnering: actie nodig voor [voornaam] [achternaam]",
    "html_body": "<p>Er staan nog open taken voor kandidaat [voornaam] [achternaam] bij [vestiging]. Bekijk het onboarding dashboard voor de details.</p>"
  },
  "internal_reminder_urgent": {
    "subject": "URGENT: actie vereist voor [voornaam] [achternaam]",
    "html_body": "<p>Kandidaat [voornaam] [achternaam] bij [vestiging] wacht al lang op actie. Neem zo snel mogelijk actie om vertraging te voorkomen.</p>"
  }
}'::jsonb
WHERE location_id = '22222222-2222-2222-2222-222222222222';