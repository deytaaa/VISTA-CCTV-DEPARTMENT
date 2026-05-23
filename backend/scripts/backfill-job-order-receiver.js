require('dotenv').config();
const supabase = require('../lib/supabase');

async function run() {
  const technicianEmail = process.env.BACKFILL_TECHNICIAN_EMAIL || 'technician@taguig.gov';

  try {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('email', technicianEmail)
      .eq('role', 'technician')
      .single();

    if (profileError || !profile) {
      console.error('Failed to find technician profile:', profileError);
      process.exit(1);
    }

    const { data: rows, error: listError } = await supabase
      .from('job_orders')
      .select('id, jo_number, receiver_id, status')
      .is('receiver_id', null);

    if (listError) {
      console.error('Failed to list job orders:', listError);
      process.exit(1);
    }

    const jobOrders = Array.isArray(rows) ? rows : [];
    if (jobOrders.length === 0) {
      console.log('No job orders found with null receiver_id.');
      process.exit(0);
    }

    const updates = jobOrders.map((jobOrder) =>
      supabase
        .from('job_orders')
        .update({ receiver_id: profile.id })
        .eq('id', jobOrder.id)
    );

    const results = await Promise.all(updates);
    const failed = results.filter(({ error }) => error);

    if (failed.length > 0) {
      console.error('Some updates failed:', failed.map(({ error }) => error));
      process.exit(1);
    }

    console.log(`Updated ${jobOrders.length} job orders to receiver_id = ${profile.id}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();