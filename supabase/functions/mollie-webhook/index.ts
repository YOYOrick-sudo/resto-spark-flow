import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { mollieRequest } from '../_shared/mollieClient.ts';
import { sendBookingConfirmationEmail } from '../_shared/bookingEmail.ts';

// No CORS needed for webhooks, but always return 200
function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

Deno.serve(async (req) => {
  // Mollie sends POST with application/x-www-form-urlencoded
  // ALWAYS return 200 — Mollie retries on non-200
  if (req.method !== 'POST') {
    return new Response('OK', { status: 200 });
  }

  try {
    // Parse form body: id=tr_xxx
    const formData = await req.formData();
    const paymentId = formData.get('id') as string;

    if (!paymentId) {
      console.error('[MOLLIE WEBHOOK] No payment id in body');
      return new Response('OK', { status: 200 });
    }

    console.log(`[MOLLIE WEBHOOK] Received webhook for payment: ${paymentId}`);

    const admin = getAdminClient();

    // Find reservation by mollie_payment_id
    const { data: reservation, error: resErr } = await admin
      .from('reservations')
      .select(`
        id, location_id, payment_status, status, reservation_date, start_time, end_time,
        party_size, manage_token, guest_notes,
        customers:customer_id(id, first_name, last_name, email),
        tickets:ticket_id(id, name, display_title)
      `)
      .eq('mollie_payment_id', paymentId)
      .single();

    if (resErr || !reservation) {
      console.error(`[MOLLIE WEBHOOK] Reservation not found for payment ${paymentId}`);
      return new Response('OK', { status: 200 });
    }

    // Fetch payment status from Mollie
    const mollieRes = await mollieRequest(admin, reservation.location_id, 'GET', `/v2/payments/${paymentId}`);
    if (!mollieRes.ok) {
      console.error(`[MOLLIE WEBHOOK] Failed to fetch payment ${paymentId} from Mollie`);
      return new Response('OK', { status: 200 });
    }

    const payment = await mollieRes.json();
    const mollieStatus = payment.status; // paid, expired, canceled, failed, open, pending

    console.log(`[MOLLIE WEBHOOK] Payment ${paymentId} status: ${mollieStatus}, current reservation payment_status: ${reservation.payment_status}`);

    // Idempotent check — skip if already processed
    if (
      (mollieStatus === 'paid' && reservation.payment_status === 'paid') ||
      (mollieStatus === 'expired' && reservation.payment_status === 'expired') ||
      (mollieStatus === 'canceled' && reservation.payment_status === 'canceled') ||
      (mollieStatus === 'failed' && reservation.payment_status === 'failed')
    ) {
      console.log(`[MOLLIE WEBHOOK] Already processed, skipping`);
      return new Response('OK', { status: 200 });
    }

    if (mollieStatus === 'paid') {
      // Update payment status
      await admin
        .from('reservations')
        .update({ payment_status: 'paid' })
        .eq('id', reservation.id);

      // Transition to confirmed (if currently pending_payment)
      if (reservation.status === 'pending_payment') {
        await admin.rpc('transition_reservation_status', {
          _reservation_id: reservation.id,
          _new_status: 'confirmed',
          _actor_id: null,
          _reason: 'Payment completed via Mollie',
          _is_override: false,
        });
      }

      // Send confirmation email
      const customer = reservation.customers as any;
      const ticket = reservation.tickets as any;
      if (customer?.email) {
        try {
          // Check if customer is returning
          const { count } = await admin
            .from('reservations')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', customer.id)
            .neq('id', reservation.id)
            .in('status', ['confirmed', 'seated', 'completed']);

          await sendBookingConfirmationEmail(admin, {
            location_id: reservation.location_id,
            reservation_id: reservation.id,
            manage_token: reservation.manage_token,
            date: reservation.reservation_date,
            start_time: reservation.start_time,
            end_time: reservation.end_time || '',
            party_size: reservation.party_size,
            first_name: customer.first_name,
            last_name: customer.last_name,
            email: customer.email,
            ticket_id: ticket?.id || '',
            guest_notes: reservation.guest_notes,
            is_returning_guest: (count || 0) > 0,
          });
        } catch (emailErr) {
          console.error('[MOLLIE WEBHOOK] Failed to send confirmation email:', emailErr);
        }
      }

      // Audit log
      await admin.from('audit_log').insert({
        location_id: reservation.location_id,
        entity_type: 'reservation',
        entity_id: reservation.id,
        action: 'payment_completed',
        actor_type: 'webhook',
        changes: { payment_status: 'paid', mollie_payment_id: paymentId },
        metadata: { mollie_status: mollieStatus },
      });

    } else if (['expired', 'canceled', 'failed'].includes(mollieStatus)) {
      // Update payment status
      await admin
        .from('reservations')
        .update({ payment_status: mollieStatus })
        .eq('id', reservation.id);

      // Cancel reservation if it was pending_payment
      if (reservation.status === 'pending_payment') {
        await admin.rpc('transition_reservation_status', {
          _reservation_id: reservation.id,
          _new_status: 'cancelled',
          _actor_id: null,
          _reason: `Payment ${mollieStatus} via Mollie`,
          _is_override: false,
        });
      }

      // Audit log
      await admin.from('audit_log').insert({
        location_id: reservation.location_id,
        entity_type: 'reservation',
        entity_id: reservation.id,
        action: `payment_${mollieStatus}`,
        actor_type: 'webhook',
        changes: { payment_status: mollieStatus },
        metadata: { mollie_status: mollieStatus },
      });
    }

    // For 'open' and 'pending' statuses, do nothing — payment still in progress

  } catch (err) {
    console.error('[MOLLIE WEBHOOK] Error:', err);
  }

  // ALWAYS return 200
  return new Response('OK', { status: 200 });
});
