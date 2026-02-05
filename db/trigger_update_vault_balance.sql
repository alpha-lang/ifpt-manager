-- Trigger: update_vault_balance on transactions
-- This function keeps vaults.balance in sync when transaction rows are validated/created/updated/deleted.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_vault_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- INSERT
  IF (TG_OP = 'INSERT') THEN
    IF NEW.status = 'VALIDATED' THEN
      IF NEW.vault_id IS NOT NULL THEN
        UPDATE public.vaults SET balance = COALESCE(balance,0) + NEW.amount WHERE id = NEW.vault_id;
      END IF;
    END IF;
    RETURN NEW;

  -- UPDATE
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Transition non-validated -> validated : apply
    IF (OLD.status IS DISTINCT FROM 'VALIDATED') AND (NEW.status = 'VALIDATED') THEN
      IF NEW.vault_id IS NOT NULL THEN
        UPDATE public.vaults SET balance = COALESCE(balance,0) + NEW.amount WHERE id = NEW.vault_id;
      END IF;

    -- Transition validated -> non-validated : revert
    ELSIF (OLD.status = 'VALIDATED') AND (NEW.status IS DISTINCT FROM 'VALIDATED') THEN
      IF OLD.vault_id IS NOT NULL THEN
        UPDATE public.vaults SET balance = COALESCE(balance,0) - OLD.amount WHERE id = OLD.vault_id;
      END IF;

    -- Both validated: amount or vault may have changed -> revert old then apply new
    ELSIF (OLD.status = 'VALIDATED') AND (NEW.status = 'VALIDATED') THEN
      IF OLD.vault_id IS NOT NULL THEN
        UPDATE public.vaults SET balance = COALESCE(balance,0) - OLD.amount WHERE id = OLD.vault_id;
      END IF;
      IF NEW.vault_id IS NOT NULL THEN
        UPDATE public.vaults SET balance = COALESCE(balance,0) + NEW.amount WHERE id = NEW.vault_id;
      END IF;
    END IF;
    RETURN NEW;

  -- DELETE
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.status = 'VALIDATED' THEN
      IF OLD.vault_id IS NOT NULL THEN
        UPDATE public.vaults SET balance = COALESCE(balance,0) - OLD.amount WHERE id = OLD.vault_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;
END;
$$;

-- Attach trigger to transactions
DROP TRIGGER IF EXISTS trg_update_vault_balance ON public.transactions;
CREATE TRIGGER trg_update_vault_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_vault_balance();

COMMIT;

-- NOTES:
-- Apply this SQL using psql or the Supabase SQL editor. Example with psql:
-- psql "postgresql://<user>:<pass>@<host>:5432/<db>" -f db/trigger_update_vault_balance.sql
