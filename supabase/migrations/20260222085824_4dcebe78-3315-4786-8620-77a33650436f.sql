
-- Add last_campaign_at column to marketing_segments
ALTER TABLE public.marketing_segments
ADD COLUMN last_campaign_at TIMESTAMPTZ NULL;

-- RPC: count_segment_customers
CREATE OR REPLACE FUNCTION public.count_segment_customers(
  _location_id UUID,
  _filter_rules JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sql TEXT;
  _conditions TEXT[] := '{}';
  _logic TEXT;
  _cond JSONB;
  _field TEXT;
  _op TEXT;
  _val TEXT;
  _sql_op TEXT;
  _result INTEGER;
BEGIN
  -- Security check
  IF NOT user_has_location_access(auth.uid(), _location_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  _sql := 'SELECT COUNT(*)::integer FROM public.customers WHERE location_id = ' || quote_literal(_location_id);

  IF _filter_rules IS NOT NULL AND _filter_rules ? 'conditions' AND jsonb_array_length(_filter_rules -> 'conditions') > 0 THEN
    _logic := COALESCE(_filter_rules ->> 'logic', 'AND');

    FOR _cond IN SELECT * FROM jsonb_array_elements(_filter_rules -> 'conditions')
    LOOP
      _field := _cond ->> 'field';
      _op := _cond ->> 'operator';
      _val := _cond ->> 'value';

      -- Map operator
      CASE _op
        WHEN 'gte' THEN _sql_op := '>=';
        WHEN 'lte' THEN _sql_op := '<=';
        WHEN 'eq'  THEN _sql_op := '=';
        WHEN 'contains' THEN _sql_op := '@>';
        ELSE CONTINUE;
      END CASE;

      -- Map field to SQL condition
      CASE _field
        WHEN 'total_visits' THEN
          _conditions := array_append(_conditions, 'total_visits ' || _sql_op || ' ' || _val::integer::text);
        WHEN 'days_since_last_visit' THEN
          _conditions := array_append(_conditions, '(CURRENT_DATE - last_visit_at::date) ' || _sql_op || ' ' || _val::integer::text);
        WHEN 'average_spend' THEN
          _conditions := array_append(_conditions, 'average_spend ' || _sql_op || ' ' || _val::numeric::text);
        WHEN 'no_show_count' THEN
          _conditions := array_append(_conditions, 'total_no_shows ' || _sql_op || ' ' || _val::integer::text);
        WHEN 'birthday_month' THEN
          _conditions := array_append(_conditions, 'EXTRACT(MONTH FROM birthday) = ' || _val::integer::text);
        WHEN 'tags' THEN
          _conditions := array_append(_conditions, 'tags @> ' || quote_literal(to_jsonb(_val)::text) || '::jsonb');
        WHEN 'dietary_preferences' THEN
          _conditions := array_append(_conditions, 'dietary_preferences @> ARRAY[' || quote_literal(_val) || ']');
        ELSE
          CONTINUE;
      END CASE;
    END LOOP;

    IF array_length(_conditions, 1) > 0 THEN
      _sql := _sql || ' AND (' || array_to_string(_conditions, ' ' || _logic || ' ') || ')';
    END IF;
  END IF;

  EXECUTE _sql INTO _result;
  RETURN COALESCE(_result, 0);
END;
$$;

-- RPC: list_segment_customers
CREATE OR REPLACE FUNCTION public.list_segment_customers(
  _location_id UUID,
  _filter_rules JSONB DEFAULT NULL,
  _limit INTEGER DEFAULT 100,
  _offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_number TEXT,
  total_visits INTEGER,
  last_visit_at TIMESTAMPTZ,
  average_spend NUMERIC,
  total_no_shows INTEGER,
  total_cancellations INTEGER,
  birthday DATE,
  dietary_preferences TEXT[],
  tags JSONB,
  notes TEXT,
  language TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sql TEXT;
  _conditions TEXT[] := '{}';
  _logic TEXT;
  _cond JSONB;
  _field TEXT;
  _op TEXT;
  _val TEXT;
  _sql_op TEXT;
BEGIN
  -- Security check
  IF NOT user_has_location_access(auth.uid(), _location_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  _sql := 'SELECT c.id, c.first_name, c.last_name, c.email, c.phone_number, c.total_visits, c.last_visit_at, c.average_spend, c.total_no_shows, c.total_cancellations, c.birthday, c.dietary_preferences, c.tags, c.notes, c.language, c.created_at FROM public.customers c WHERE c.location_id = ' || quote_literal(_location_id);

  IF _filter_rules IS NOT NULL AND _filter_rules ? 'conditions' AND jsonb_array_length(_filter_rules -> 'conditions') > 0 THEN
    _logic := COALESCE(_filter_rules ->> 'logic', 'AND');

    FOR _cond IN SELECT * FROM jsonb_array_elements(_filter_rules -> 'conditions')
    LOOP
      _field := _cond ->> 'field';
      _op := _cond ->> 'operator';
      _val := _cond ->> 'value';

      CASE _op
        WHEN 'gte' THEN _sql_op := '>=';
        WHEN 'lte' THEN _sql_op := '<=';
        WHEN 'eq'  THEN _sql_op := '=';
        WHEN 'contains' THEN _sql_op := '@>';
        ELSE CONTINUE;
      END CASE;

      CASE _field
        WHEN 'total_visits' THEN
          _conditions := array_append(_conditions, 'c.total_visits ' || _sql_op || ' ' || _val::integer::text);
        WHEN 'days_since_last_visit' THEN
          _conditions := array_append(_conditions, '(CURRENT_DATE - c.last_visit_at::date) ' || _sql_op || ' ' || _val::integer::text);
        WHEN 'average_spend' THEN
          _conditions := array_append(_conditions, 'c.average_spend ' || _sql_op || ' ' || _val::numeric::text);
        WHEN 'no_show_count' THEN
          _conditions := array_append(_conditions, 'c.total_no_shows ' || _sql_op || ' ' || _val::integer::text);
        WHEN 'birthday_month' THEN
          _conditions := array_append(_conditions, 'EXTRACT(MONTH FROM c.birthday) = ' || _val::integer::text);
        WHEN 'tags' THEN
          _conditions := array_append(_conditions, 'c.tags @> ' || quote_literal(to_jsonb(_val)::text) || '::jsonb');
        WHEN 'dietary_preferences' THEN
          _conditions := array_append(_conditions, 'c.dietary_preferences @> ARRAY[' || quote_literal(_val) || ']');
        ELSE
          CONTINUE;
      END CASE;
    END LOOP;

    IF array_length(_conditions, 1) > 0 THEN
      _sql := _sql || ' AND (' || array_to_string(_conditions, ' ' || _logic || ' ') || ')';
    END IF;
  END IF;

  _sql := _sql || ' ORDER BY c.last_name, c.first_name LIMIT ' || _limit || ' OFFSET ' || _offset;

  RETURN QUERY EXECUTE _sql;
END;
$$;
