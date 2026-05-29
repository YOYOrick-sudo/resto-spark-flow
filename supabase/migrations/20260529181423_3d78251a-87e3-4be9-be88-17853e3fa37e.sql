-- Cleanup: verwijder test-pakbon [TEST]-E5-TEKSTEN en bijbehorende regels
DELETE FROM goods_receipt_lines WHERE goods_receipt_id = 'cccc3333-e606-4e60-8000-000000000006'::uuid;
DELETE FROM goods_receipts WHERE id = 'cccc3333-e606-4e60-8000-000000000006'::uuid;