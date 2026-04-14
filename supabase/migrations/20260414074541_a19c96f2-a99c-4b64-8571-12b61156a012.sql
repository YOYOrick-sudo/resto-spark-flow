ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS haccp_koeling_max DECIMAL(4,1) DEFAULT 7.0;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS haccp_vriezer_max DECIMAL(4,1) DEFAULT -18.0;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS haccp_kern_min DECIMAL(4,1) DEFAULT 75.0;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS haccp_warmhouden_min DECIMAL(4,1) DEFAULT 60.0;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS ingredient_categorieen JSONB DEFAULT '["Groenten","Fruit","Vlees","Vis","Zuivel","Droge waren","Kruiden","Dranken","Overig"]';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS recept_categorieen JSONB DEFAULT '["Sauzen","Soepen","Salades","Garnituren","Desserts","Brood","Overig"]';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS ai_bevoegdheden_keuken JSONB DEFAULT '{"prep_lijsten":"vraag_eerst","besteladvies":"vraag_eerst","interne_transfers":"uit","voorraad_waarschuwingen":"zelfstandig","haccp_waarschuwingen":"zelfstandig"}';