ALTER TABLE public.ai_logs
  ADD COLUMN IF NOT EXISTS escalated_to_pro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_reason text;

COMMENT ON COLUMN public.ai_logs.escalated_to_pro IS
  'Sprint 2E Loop 1: true op de Flash-row als de output door shouldEscalateToPro() onvoldoende werd geacht en een Pro-retry is uitgevoerd. De Pro-retry komt als losse rij (escalated_to_pro=false) in dezelfde feature-call.';
COMMENT ON COLUMN public.ai_logs.escalation_reason IS
  'Sprint 2E Loop 1: korte machine-leesbare reden + uitgevoerde checks, bv. "lines_missing (checks: 1,2,3,4,5)" of "scan_pdf_no_text".';