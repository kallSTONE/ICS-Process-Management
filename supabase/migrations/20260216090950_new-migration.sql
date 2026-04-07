-- Keep clients assignment columns in sync with employee_clients.
-- This preserves existing RLS that checks clients.assigned_employee_id.

-- 1) Backfill assigned employee + assigned timestamp from latest assignment row.
WITH latest_assignment AS (
	SELECT DISTINCT ON (ec.client_id)
		ec.client_id,
		ec.user_id,
		ec.assigned_at
	FROM public.employee_clients ec
	WHERE ec.client_id IS NOT NULL
		AND ec.user_id IS NOT NULL
	ORDER BY ec.client_id, ec.assigned_at DESC NULLS LAST, ec.id DESC
)
UPDATE public.clients c
SET
	assigned_employee_id = la.user_id,
	assigned_to_employee_at = COALESCE(la.assigned_at, c.assigned_to_employee_at, NOW())
FROM latest_assignment la
WHERE c.id = la.client_id
	AND (
		c.assigned_employee_id IS DISTINCT FROM la.user_id
		OR c.assigned_to_employee_at IS NULL
	);

-- 2) Sync INSERT/UPDATE/DELETE on employee_clients into clients assignment fields.
CREATE OR REPLACE FUNCTION public.sync_client_assignment_from_employee_clients()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
	v_client_id UUID;
BEGIN
	v_client_id := COALESCE(NEW.client_id, OLD.client_id);

	IF v_client_id IS NULL THEN
		RETURN COALESCE(NEW, OLD);
	END IF;

	UPDATE public.clients c
	SET
		assigned_employee_id = la.user_id,
		assigned_to_employee_at = COALESCE(la.assigned_at, c.assigned_to_employee_at, NOW())
	FROM (
		SELECT ec.user_id, ec.assigned_at
		FROM public.employee_clients ec
		WHERE ec.client_id = v_client_id
			AND ec.user_id IS NOT NULL
		ORDER BY ec.assigned_at DESC NULLS LAST, ec.id DESC
		LIMIT 1
	) la
	WHERE c.id = v_client_id;

	-- If no assignment rows remain for this client, clear assignment columns.
	IF NOT FOUND THEN
		UPDATE public.clients
		SET
			assigned_employee_id = NULL,
			assigned_to_employee_at = NULL
		WHERE id = v_client_id;
	END IF;

	RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_client_assignment_from_employee_clients ON public.employee_clients;

CREATE TRIGGER trg_sync_client_assignment_from_employee_clients
AFTER INSERT OR UPDATE OR DELETE ON public.employee_clients
FOR EACH ROW
EXECUTE FUNCTION public.sync_client_assignment_from_employee_clients();
