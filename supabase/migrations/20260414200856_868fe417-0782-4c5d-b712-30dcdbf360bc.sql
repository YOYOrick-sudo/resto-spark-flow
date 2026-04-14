ALTER TABLE mep_tasks DROP CONSTRAINT IF EXISTS mep_tasks_prioriteit_check;
ALTER TABLE mep_tasks ADD CONSTRAINT mep_tasks_prioriteit_check 
  CHECK (prioriteit IN ('Hoog', 'Normaal', 'Laag'));