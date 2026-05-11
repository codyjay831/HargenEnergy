UPDATE "SupportRequest"
SET "kind" = 'PROSPECT_INTAKE', "source" = 'PUBLIC_FORM'
WHERE "title" LIKE 'Intake:%';

UPDATE "SupportRequest" sr
SET "kind" = 'PROSPECT_INTAKE', "source" = 'PUBLIC_FORM'
FROM "Client" c
WHERE sr."clientId" = c.id
  AND c.status = 'LEAD'
  AND sr."kind" = 'CLIENT_OPS';

UPDATE "SupportRequest"
SET "title" = trim(substring("title" from 8))
WHERE "kind" = 'PROSPECT_INTAKE'
  AND "title" LIKE 'Intake:%';
