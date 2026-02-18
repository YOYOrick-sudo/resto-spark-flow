
-- ============================================
-- Fase 4.5B: Auto-Assign + UI Integratie
-- ============================================

-- 0a. table_group_id kolom op reservations
ALTER TABLE reservations 
ADD COLUMN table_group_id UUID REFERENCES table_groups(id) DEFAULT NULL;

COMMENT ON COLUMN reservations.table_group_id IS 
  'Set when reservation uses a combined table group. table_id points to first member table.';

-- 0b. move_reservation_table RPC uitbreiden
-- - _new_table_id wordt DEFAULT NULL (unassign support)
-- - Status check verbreed naar alle non-terminal statussen
-- - NULL-branch: unassign table + table_group
-- - Bij niet-NULL: ook table_group_id resetten
CREATE OR REPLACE FUNCTION move_reservation_table(
  _reservation_id UUID,
  _new_table_id UUID DEFAULT NULL,
  _actor_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r reservations%ROWTYPE;
  _actor UUID;
  _old_table_id UUID;
BEGIN
  _actor := COALESCE(_actor_id, auth.uid());

  SELECT * INTO _r FROM reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservering niet gevonden';
  END IF;

  IF _r.status IN ('cancelled', 'no_show', 'completed') THEN
    RAISE EXCEPTION 'Tafel wijzigen niet mogelijk bij status %', _r.status;
  END IF;

  _old_table_id := _r.table_id;

  -- NULL branch: unassign table
  IF _new_table_id IS NULL THEN
    UPDATE reservations
    SET table_id = NULL, table_group_id = NULL, updated_at = NOW()
    WHERE id = _reservation_id;

    INSERT INTO audit_log (
      entity_type, entity_id, location_id,
      action, actor_id, actor_type, changes, metadata
    ) VALUES (
      'reservation', _reservation_id, _r.location_id,
      'table_unassigned', _actor, 'user',
      jsonb_build_object('previous_table_id', _old_table_id, 'previous_table_group_id', _r.table_group_id),
      '{}'::jsonb
    );
    RETURN;
  END IF;

  -- Non-NULL branch: move to specific table
  IF NOT EXISTS (
    SELECT 1 FROM tables t
    JOIN areas a ON a.id = t.area_id
    WHERE t.id = _new_table_id
      AND a.location_id = _r.location_id
      AND t.is_active = true
  ) THEN
    RAISE EXCEPTION 'Tafel niet gevonden of niet actief';
  END IF;

  UPDATE reservations
  SET table_id = _new_table_id, table_group_id = NULL, updated_at = NOW()
  WHERE id = _reservation_id;

  INSERT INTO audit_log (
    entity_type, entity_id, location_id,
    action, actor_id, actor_type, changes, metadata
  ) VALUES (
    'reservation', _reservation_id, _r.location_id,
    'table_moved', _actor, 'user',
    jsonb_build_object('old_table_id', _old_table_id, 'new_table_id', _new_table_id),
    '{}'::jsonb
  );
END;
$$;

-- 0c. assign_best_table RPC
CREATE OR REPLACE FUNCTION assign_best_table(
  _location_id UUID,
  _date DATE,
  _time TEXT,
  _party_size INTEGER,
  _duration_minutes INTEGER,
  _shift_id UUID,
  _ticket_id UUID,
  _reservation_id UUID DEFAULT NULL,
  _preferred_area_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  WEIGHT_CAPACITY CONSTANT INTEGER := 60;
  WEIGHT_AREA_ORDER CONSTANT INTEGER := 40;
  
  _time_val TIME;
  _buffer INTEGER;
  _end_time TIME;
  _area_ids UUID[];
  _best RECORD;
  _result JSONB;
  _alternatives JSONB := '[]'::jsonb;
  _alt_count INTEGER := 0;
  _actor UUID;
BEGIN
  -- 1. Parse time
  _time_val := _time::TIME;
  
  -- 2. Get buffer from shift_tickets / tickets
  SELECT COALESCE(st.override_buffer_minutes, t.buffer_minutes, 0)
  INTO _buffer
  FROM shift_tickets st
  JOIN tickets t ON t.id = st.ticket_id
  WHERE st.shift_id = _shift_id 
    AND st.ticket_id = _ticket_id
    AND st.location_id = _location_id;
  
  IF _buffer IS NULL THEN
    _buffer := 0;
  END IF;
  
  -- 3. Calculate end time (including buffer for overlap check)
  _end_time := _time_val + ((_duration_minutes + _buffer) * INTERVAL '1 minute');
  
  -- 4. Get area IDs from shift_tickets config
  SELECT st.areas INTO _area_ids
  FROM shift_tickets st
  WHERE st.shift_id = _shift_id 
    AND st.ticket_id = _ticket_id
    AND st.location_id = _location_id;
  
  -- 5. Find best individual table
  WITH occupied_tables AS (
    -- Tables occupied by direct assignment
    SELECT r.table_id AS tid
    FROM reservations r
    WHERE r.location_id = _location_id 
      AND r.reservation_date = _date
      AND r.status IN ('confirmed', 'seated', 'option', 'pending_payment')
      AND r.id IS DISTINCT FROM _reservation_id
      AND (r.start_time, r.end_time) OVERLAPS (_time_val, _end_time)
    UNION
    -- Tables occupied via table group membership
    SELECT tgm.table_id AS tid
    FROM reservations r
    JOIN table_group_members tgm ON tgm.table_group_id = r.table_group_id
    WHERE r.location_id = _location_id
      AND r.reservation_date = _date
      AND r.table_group_id IS NOT NULL
      AND r.status IN ('confirmed', 'seated', 'option', 'pending_payment')
      AND r.id IS DISTINCT FROM _reservation_id
      AND (r.start_time, r.end_time) OVERLAPS (_time_val, _end_time)
  ),
  area_ranks AS (
    SELECT a.id AS area_id, a.name AS area_name,
           ROW_NUMBER() OVER (ORDER BY a.sort_order ASC) - 1 AS rank_index
    FROM areas a
    WHERE a.location_id = _location_id
      AND a.is_active = true
      AND (_area_ids IS NULL OR array_length(_area_ids, 1) IS NULL OR a.id = ANY(_area_ids))
  ),
  candidate_tables AS (
    SELECT 
      t.id AS table_id,
      t.display_label AS table_name,
      ar.area_name,
      ar.area_id,
      NULL::UUID AS table_group_id,
      t.max_capacity,
      GREATEST(0, 100 - ((t.max_capacity - _party_size) * 20)) AS capacity_score,
      GREATEST(0, 100 - (ar.rank_index * 25)) AS area_score
    FROM tables t
    JOIN area_ranks ar ON ar.area_id = t.area_id
    WHERE t.is_active = true
      AND t.min_capacity <= _party_size
      AND t.max_capacity >= _party_size
      AND t.id NOT IN (SELECT tid FROM occupied_tables)
      AND (_preferred_area_id IS NULL OR t.area_id = _preferred_area_id)
  ),
  -- Table groups as candidates
  candidate_groups AS (
    SELECT
      (SELECT tgm2.table_id FROM table_group_members tgm2 
       WHERE tgm2.table_group_id = tg.id ORDER BY tgm2.sort_order LIMIT 1) AS table_id,
      tg.name AS table_name,
      ar.area_name,
      ar.area_id,
      tg.id AS table_group_id,
      tg.combined_max_capacity AS max_capacity,
      GREATEST(0, 100 - ((tg.combined_max_capacity - _party_size) * 20)) AS capacity_score,
      GREATEST(0, 100 - (ar.rank_index * 25)) AS area_score
    FROM table_groups tg
    JOIN table_group_members tgm ON tgm.table_group_id = tg.id
    JOIN tables t_member ON t_member.id = tgm.table_id
    JOIN area_ranks ar ON ar.area_id = t_member.area_id
    WHERE tg.location_id = _location_id
      AND tg.is_active = true
      AND tg.combined_min_capacity <= _party_size
      AND tg.combined_max_capacity >= _party_size
      -- All member tables must be free
      AND NOT EXISTS (
        SELECT 1 FROM table_group_members tgm3
        WHERE tgm3.table_group_id = tg.id
          AND tgm3.table_id IN (SELECT tid FROM occupied_tables)
      )
    GROUP BY tg.id, tg.name, tg.combined_max_capacity, tg.combined_min_capacity, ar.area_name, ar.area_id, ar.rank_index
  ),
  all_candidates AS (
    SELECT *, 
      (capacity_score * WEIGHT_CAPACITY + area_score * WEIGHT_AREA_ORDER) / 100 AS total_score
    FROM candidate_tables
    UNION ALL
    SELECT *,
      (capacity_score * WEIGHT_CAPACITY + area_score * WEIGHT_AREA_ORDER) / 100 AS total_score
    FROM candidate_groups
  ),
  ranked AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY total_score DESC, max_capacity ASC) AS rn
    FROM all_candidates
  )
  SELECT table_id, table_name, area_name, table_group_id, total_score
  INTO _best
  FROM ranked
  WHERE rn = 1;
  
  -- No table found
  IF _best IS NULL THEN
    RETURN jsonb_build_object(
      'assigned', false,
      'reason', 'no_tables_available',
      'alternatives', '[]'::jsonb
    );
  END IF;
  
  -- Build alternatives (top 3 excluding the best)
  SELECT jsonb_agg(alt_row)
  INTO _alternatives
  FROM (
    WITH ranked_all AS (
      WITH occupied_tables AS (
        SELECT r.table_id AS tid
        FROM reservations r
        WHERE r.location_id = _location_id 
          AND r.reservation_date = _date
          AND r.status IN ('confirmed', 'seated', 'option', 'pending_payment')
          AND r.id IS DISTINCT FROM _reservation_id
          AND (r.start_time, r.end_time) OVERLAPS (_time_val, _end_time)
        UNION
        SELECT tgm.table_id AS tid
        FROM reservations r
        JOIN table_group_members tgm ON tgm.table_group_id = r.table_group_id
        WHERE r.location_id = _location_id
          AND r.reservation_date = _date
          AND r.table_group_id IS NOT NULL
          AND r.status IN ('confirmed', 'seated', 'option', 'pending_payment')
          AND r.id IS DISTINCT FROM _reservation_id
          AND (r.start_time, r.end_time) OVERLAPS (_time_val, _end_time)
      ),
      area_ranks AS (
        SELECT a.id AS area_id, a.name AS area_name,
               ROW_NUMBER() OVER (ORDER BY a.sort_order ASC) - 1 AS rank_index
        FROM areas a
        WHERE a.location_id = _location_id
          AND a.is_active = true
          AND (_area_ids IS NULL OR array_length(_area_ids, 1) IS NULL OR a.id = ANY(_area_ids))
      )
      SELECT 
        t.id AS table_id,
        t.display_label AS table_name,
        ar.area_name,
        (GREATEST(0, 100 - ((t.max_capacity - _party_size) * 20)) * WEIGHT_CAPACITY + 
         GREATEST(0, 100 - (ar.rank_index * 25)) * WEIGHT_AREA_ORDER) / 100 AS score
      FROM tables t
      JOIN area_ranks ar ON ar.area_id = t.area_id
      WHERE t.is_active = true
        AND t.min_capacity <= _party_size
        AND t.max_capacity >= _party_size
        AND t.id NOT IN (SELECT tid FROM occupied_tables)
        AND t.id != _best.table_id
      ORDER BY score DESC
      LIMIT 3
    )
    SELECT jsonb_build_object(
      'table_id', table_id,
      'table_name', table_name,
      'area_name', area_name,
      'score', score
    ) AS alt_row
    FROM ranked_all
  ) sub;
  
  IF _alternatives IS NULL THEN
    _alternatives := '[]'::jsonb;
  END IF;
  
  _alt_count := jsonb_array_length(_alternatives);
  
  -- Commit mode
  IF _reservation_id IS NOT NULL THEN
    _actor := auth.uid();
    
    -- Advisory lock per location+date
    PERFORM pg_advisory_xact_lock(hashtext(_location_id::text || _date::text));
    
    -- Hercheck: is the best table still free?
    IF EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.location_id = _location_id
        AND r.reservation_date = _date
        AND r.status IN ('confirmed', 'seated', 'option', 'pending_payment')
        AND r.id != _reservation_id
        AND r.table_id = _best.table_id
        AND (r.start_time, r.end_time) OVERLAPS (_time_val, _end_time)
    ) THEN
      -- Table was claimed in the meantime
      RETURN jsonb_build_object(
        'assigned', false,
        'reason', 'table_claimed_by_other',
        'alternatives', _alternatives
      );
    END IF;
    
    -- Update reservation
    UPDATE reservations
    SET table_id = _best.table_id,
        table_group_id = _best.table_group_id,
        updated_at = NOW()
    WHERE id = _reservation_id;
    
    -- Audit log
    INSERT INTO audit_log (
      entity_type, entity_id, location_id,
      action, actor_id, actor_type, changes, metadata
    ) VALUES (
      'reservation', _reservation_id, _location_id,
      'auto_assign', _actor, 'user',
      jsonb_build_object(
        'table_id', _best.table_id,
        'table_group_id', _best.table_group_id,
        'table_name', _best.table_name,
        'area_name', _best.area_name,
        'score', _best.total_score,
        'assignment_reason', 'auto_assign_v1',
        'alternatives_count', _alt_count
      ),
      '{}'::jsonb
    );
  END IF;
  
  -- Return result
  RETURN jsonb_build_object(
    'assigned', true,
    'table_id', _best.table_id,
    'table_group_id', _best.table_group_id,
    'table_name', _best.table_name,
    'area_name', _best.area_name,
    'score', _best.total_score,
    'assignment_reason', 'auto_assign_v1',
    'alternatives', _alternatives
  );
END;
$$;
