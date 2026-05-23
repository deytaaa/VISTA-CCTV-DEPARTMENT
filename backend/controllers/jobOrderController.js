const supabase = require('../lib/supabase');

function normalizeRpcJoNumber(rpcResult) {
  if (!rpcResult) return null;
  if (typeof rpcResult === 'string') return rpcResult;
  if (Array.isArray(rpcResult) && rpcResult.length > 0) {
    const first = rpcResult[0];
    if (typeof first === 'string') return first;
    if (first && typeof first.jo_number === 'string') return first.jo_number;
  }
  if (rpcResult && typeof rpcResult.jo_number === 'string') return rpcResult.jo_number;
  return null;
}

module.exports = {
  list: async (req, res) => {
    try {
      const { status, page = 1, limit = 10, q, location, date } = req.query;
      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      let query = supabase
        .from('job_orders')
        .select('*, job_order_items(*), job_order_personnel(*)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (location) query = query.ilike('location', `%${location}%`);
      if (date) query = query.eq('date', date);
      if (q) {
        query = query.or(
          `jo_number.ilike.%${q}%,location.ilike.%${q}%,requestor_name.ilike.%${q}%`
        );
      }

      const { data, error, count } = await query.range(from, to);
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({
        data,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total: count ?? (Array.isArray(data) ? data.length : 0),
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list job orders' });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('job_orders')
        .select('*, job_order_items(*), job_order_personnel(*), completion_reports(*)')
        .eq('id', id)
        .single();
      if (error) return res.status(404).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch job order' });
    }
  },

  create: async (req, res) => {
    try {
      const payload = req.body || {};
      // Generate JO number via RPC if available
      let joNumber = null;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('generate_jo_number');
        if (!rpcError) joNumber = normalizeRpcJoNumber(rpcData);
      } catch (e) {
        // ignore
      }

      // Fallback: allow caller to provide jo_number or leave null
      if (!joNumber && payload.jo_number) joNumber = payload.jo_number;

      const insertObj = {
        jo_number: joNumber,
        date: payload.date || new Date().toISOString().slice(0, 10),
        location: payload.location || null,
        requestor_name: payload.requestor_name || null,
        status: payload.status || 'draft',
        sender_id: payload.sender_id || null,
        receiver_id: payload.receiver_id || null
      };

      const { data: created, error: insertError } = await supabase.from('job_orders').insert(insertObj).select('*').single();
      if (insertError) return res.status(500).json({ error: insertError.message || insertError });

      const jobOrderId = created.id;

      // Insert items and personnel if present
      if (Array.isArray(payload.items) && payload.items.length > 0) {
        const itemsToInsert = payload.items.map((it, idx) => ({
          job_order_id: jobOrderId,
          item_no: it.item_no || idx + 1,
          item_name: it.item_name,
          reference_no: it.reference_no || null,
          quantity: it.quantity || 1
        }));
        const { error: itemsError } = await supabase.from('job_order_items').insert(itemsToInsert);
        if (itemsError) console.warn('Items insert warning', itemsError);
      }

      if (Array.isArray(payload.personnel) && payload.personnel.length > 0) {
        const persToInsert = payload.personnel.map((p, idx) => ({
          job_order_id: jobOrderId,
          personnel_no: p.personnel_no || idx + 1,
          name: p.name
        }));
        const { error: persError } = await supabase.from('job_order_personnel').insert(persToInsert);
        if (persError) console.warn('Personnel insert warning', persError);
      }

      return res.status(201).json({ data: created });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create job order' });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body || {};
      const { data, error } = await supabase.from('job_orders').update(payload).eq('id', id).select('*').single();
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update job order' });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user && req.user.id ? req.user.id : null;
      // Try to call soft_delete_job_order RPC if available
      try {
        const { error: rpcError } = await supabase.rpc('soft_delete_job_order', { p_job_order_id: id, p_user_id: userId });
        if (!rpcError) return res.json({ success: true });
      } catch (e) {
        // ignore and fallback
      }

      const { data, error } = await supabase.from('job_orders').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('*').single();
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete job order' });
    }
  }
};
