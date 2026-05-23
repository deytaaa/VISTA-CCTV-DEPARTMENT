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
      const { status, status_in, receiver_id, page = 1, limit = 10, q, location, date, date_from, date_to } = req.query;
      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;
      const technicianReceiverId = receiver_id || (req.user?.role === 'technician' ? req.user.id : null);

      let query = supabase
        .from('job_orders')
        .select('*, sender:users!job_orders_sender_id_fkey(id, name, email, role), receiver:users!job_orders_receiver_id_fkey(id, name, email, role), job_order_items(*), job_order_personnel(*), completion_reports(*)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (technicianReceiverId) query = query.eq('receiver_id', technicianReceiverId);
      if (status) query = query.eq('status', status);
      if (status_in) {
        const statuses = String(status_in)
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        if (statuses.length > 0) query = query.in('status', statuses);
      }
      if (location) query = query.ilike('location', `%${location}%`);
      if (date) query = query.eq('date', date);
      if (date_from) query = query.gte('date', date_from);
      if (date_to) query = query.lte('date', date_to);
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
        .select('*, sender:users!job_orders_sender_id_fkey(id, name, email, role), receiver:users!job_orders_receiver_id_fkey(id, name, email, role), job_order_items(*), job_order_personnel(*), completion_reports(*)')
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
      const status = payload.status || 'draft';
      // Prefer caller-provided JO number (frontend generates on submit for sent JOs).
      let joNumber = payload.jo_number || null;

      // Generate only for non-draft submissions when JO number is still missing.
      if (!joNumber && status !== 'draft') {
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('generate_jo_number');
          if (!rpcError) joNumber = normalizeRpcJoNumber(rpcData);
        } catch (e) {
          // ignore and fail below if still missing
        }
      }

      if (!joNumber && status !== 'draft') {
        return res.status(500).json({ error: 'Failed to generate JO number' });
      }

      const insertObj = {
        jo_number: joNumber,
        date: payload.date || new Date().toISOString().slice(0, 10),
        location: payload.location || null,
        requestor_name: payload.requestor_name || null,
        status,
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
,

  markProcessing: async (req, res) => {
    try {
      const { id } = req.params;

      const { data: current, error: currentError } = await supabase
        .from('job_orders')
        .select('id, jo_number, status, receiver_id')
        .eq('id', id)
        .single();

      if (currentError || !current) {
        return res.status(404).json({ error: currentError?.message || 'Job order not found' });
      }

      if (req.user?.role !== 'technician') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (current.receiver_id && current.receiver_id !== req.user.id) {
        return res.status(403).json({ error: 'This job order is not assigned to you' });
      }

      if (current.status !== 'sent') {
        return res.status(400).json({ error: 'Only sent job orders can be marked as processing' });
      }

      const { data, error } = await supabase
        .from('job_orders')
        .update({ status: 'processing' })
        .eq('id', id)
        .select('*')
        .single();

      if (error) return res.status(500).json({ error: error.message || error });

      await supabase.from('activity_logs').insert({
        user_id: req.user.id,
        action: 'Marked as Processing',
        job_order_id: id,
      });

      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to mark job order as processing' });
    }
  },

  markCompleted: async (req, res) => {
    try {
      const { id } = req.params;

      if (req.user?.role !== 'technician') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { data: current, error: currentError } = await supabase
        .from('job_orders')
        .select('id, jo_number, status, receiver_id')
        .eq('id', id)
        .single();

      if (currentError || !current) {
        return res.status(404).json({ error: currentError?.message || 'Job order not found' });
      }

      if (current.receiver_id && current.receiver_id !== req.user.id) {
        return res.status(403).json({ error: 'This job order is not assigned to you' });
      }

      const { data: reports, error: reportError } = await supabase
        .from('completion_reports')
        .select('id, proof_file, completed_at')
        .eq('job_order_id', id)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (reportError) {
        return res.status(500).json({ error: reportError.message || reportError });
      }

      const latestReport = Array.isArray(reports) ? reports[0] : null;
      if (!latestReport?.proof_file) {
        return res.status(400).json({ error: 'Please upload signed JO proof before marking as completed' });
      }

      const { data, error } = await supabase
        .from('job_orders')
        .update({ status: 'for_approval' })
        .eq('id', id)
        .select('*')
        .single();

      if (error) return res.status(500).json({ error: error.message || error });

      await supabase.from('activity_logs').insert({
        user_id: req.user.id,
        action: 'Marked as Completed',
        job_order_id: id,
      });

      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to mark job order as completed' });
    }
  }
};
