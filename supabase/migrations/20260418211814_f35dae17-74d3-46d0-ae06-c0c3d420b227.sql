CREATE OR REPLACE FUNCTION public.__test_bestelmethode_security__(
  _location_id uuid,
  _owner_uid uuid,
  _kitchen_candidate_uid uuid,
  _bestelling_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _results jsonb := '[]'::jsonb;
  _err text;
  _new_methode bestel_methode;
  _orig_methode bestel_methode;
  _audit_count_before int;
  _audit_count_after int;
  _kitchen_existed boolean;
BEGIN
  -- Capture original
  SELECT bestelmethode INTO _orig_methode FROM bestellingen WHERE id = _bestelling_id;
  IF _orig_methode IS NULL THEN
    RETURN jsonb_build_object('error', 'bestelling niet gevonden');
  END IF;

  -- Setup: kitchen-rol toevoegen (track of die al bestond)
  SELECT EXISTS (
    SELECT 1 FROM user_location_roles
    WHERE user_id = _kitchen_candidate_uid AND location_id = _location_id
  ) INTO _kitchen_existed;

  INSERT INTO user_location_roles (user_id, location_id, role)
  VALUES (_kitchen_candidate_uid, _location_id, 'kitchen')
  ON CONFLICT (user_id, location_id) DO UPDATE SET role = 'kitchen';

  _results := _results || jsonb_build_object(
    'step', 'setup', 'status', 'INFO',
    'detail', jsonb_build_object('orig_methode', _orig_methode, 'kitchen_existed', _kitchen_existed)
  );

  -- ─── TEST B: kitchen probeert te wijzigen ──────────────────────────────
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', _kitchen_candidate_uid::text, 'role', 'authenticated')::text,
      true);
    UPDATE bestellingen SET bestelmethode = 'handmatig' WHERE id = _bestelling_id;
    -- Als we hier komen: geen exception → FAIL
    _results := _results || jsonb_build_object(
      'step', 'B_kitchen_blocked', 'status', 'FAIL',
      'detail', 'kitchen mocht wijzigen zonder error'
    );
    -- Rollback de wijziging
    UPDATE bestellingen SET bestelmethode = _orig_methode WHERE id = _bestelling_id;
  EXCEPTION
    WHEN insufficient_privilege THEN
      _results := _results || jsonb_build_object(
        'step', 'B_kitchen_blocked', 'status', 'PASS',
        'detail', 'SQLSTATE 42501 zoals verwacht'
      );
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS _err = MESSAGE_TEXT;
      _results := _results || jsonb_build_object(
        'step', 'B_kitchen_blocked', 'status', 'FAIL',
        'detail', jsonb_build_object('sqlstate', SQLSTATE, 'message', _err)
      );
  END;

  -- ─── TEST C: owner mag wijzigen ────────────────────────────────────────
  SELECT count(*) INTO _audit_count_before FROM audit_log
  WHERE entity_type = 'bestellingen' AND entity_id = _bestelling_id
    AND action = 'bestelmethode_changed';

  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', _owner_uid::text, 'role', 'authenticated')::text,
      true);
    UPDATE bestellingen SET bestelmethode = 'handmatig' WHERE id = _bestelling_id;
    SELECT bestelmethode INTO _new_methode FROM bestellingen WHERE id = _bestelling_id;
    IF _new_methode = 'handmatig' THEN
      _results := _results || jsonb_build_object(
        'step', 'C_owner_allowed', 'status', 'PASS',
        'detail', jsonb_build_object('from', _orig_methode, 'to', _new_methode)
      );
    ELSE
      _results := _results || jsonb_build_object(
        'step', 'C_owner_allowed', 'status', 'FAIL',
        'detail', jsonb_build_object('expected', 'handmatig', 'got', _new_methode)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS _err = MESSAGE_TEXT;
    _results := _results || jsonb_build_object(
      'step', 'C_owner_allowed', 'status', 'FAIL',
      'detail', jsonb_build_object('sqlstate', SQLSTATE, 'message', _err)
    );
  END;

  -- ─── TEST D: audit-trail entry geschreven ──────────────────────────────
  SELECT count(*) INTO _audit_count_after FROM audit_log
  WHERE entity_type = 'bestellingen' AND entity_id = _bestelling_id
    AND action = 'bestelmethode_changed';

  IF _audit_count_after > _audit_count_before THEN
    DECLARE _last_audit jsonb;
    BEGIN
      SELECT to_jsonb(a) INTO _last_audit FROM (
        SELECT actor_id, action, changes, created_at
        FROM audit_log
        WHERE entity_type = 'bestellingen' AND entity_id = _bestelling_id
          AND action = 'bestelmethode_changed'
        ORDER BY created_at DESC LIMIT 1
      ) a;
      _results := _results || jsonb_build_object(
        'step', 'D_audit_entry', 'status', 'PASS',
        'detail', jsonb_build_object(
          'before', _audit_count_before,
          'after', _audit_count_after,
          'last', _last_audit
        )
      );
    END;
  ELSE
    _results := _results || jsonb_build_object(
      'step', 'D_audit_entry', 'status', 'FAIL',
      'detail', jsonb_build_object('before', _audit_count_before, 'after', _audit_count_after)
    );
  END IF;

  -- ─── Cleanup: restore bestelling ───────────────────────────────────────
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', _owner_uid::text, 'role', 'authenticated')::text,
    true);
  UPDATE bestellingen SET bestelmethode = _orig_methode WHERE id = _bestelling_id;

  -- Cleanup: kitchen-rol verwijderen (als die er voor de test niet was)
  IF NOT _kitchen_existed THEN
    DELETE FROM user_location_roles
    WHERE user_id = _kitchen_candidate_uid AND location_id = _location_id;
  END IF;

  _results := _results || jsonb_build_object('step', 'cleanup', 'status', 'PASS', 'detail', 'restored');

  RETURN jsonb_build_object('results', _results);
END;
$$;

-- Alleen aanroepbaar door service_role (verzamelt resultaten zonder
-- auth-context te lekken naar reguliere users).
REVOKE ALL ON FUNCTION public.__test_bestelmethode_security__(uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.__test_bestelmethode_security__(uuid,uuid,uuid,uuid) TO service_role;