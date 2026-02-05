-- Recalcule et harmonise les soldes de la table `vaults` en se basant
-- sur les transactions validées dans `transactions`.
-- Utilisation : coller ce script dans l'éditeur SQL de Supabase et l'exécuter.
-- Sauvegarde recommandée avant exécution.

BEGIN;

-- Calculer la somme par coffre à partir des transactions VALIDATED
WITH computed AS (
  SELECT
    vault_id,
    SUM(
      CASE
        WHEN type = 'RECETTE' THEN amount
        WHEN type = 'DEPENSE' THEN -amount
        WHEN type = 'TRANSFERT' THEN amount
        ELSE 0
      END
    ) AS total
  FROM transactions
  WHERE status = 'VALIDATED'
  GROUP BY vault_id
)

-- Mettre à jour les coffres présents dans computed
UPDATE vaults v
SET balance = COALESCE(c.total, 0)
FROM computed c
WHERE v.id = c.vault_id;

-- Pour les coffres n'ayant aucune transaction validée, fixer le solde à 0
UPDATE vaults
SET balance = 0
WHERE id NOT IN (SELECT DISTINCT vault_id FROM transactions WHERE status = 'VALIDATED');

COMMIT;

-- Note : si votre modèle de transfert (type = 'TRANSFERT') crée à la fois
-- une transaction source et destination, adaptez la logique ci-dessus
-- selon votre schéma. Exécutez d'abord en environnement de test.
