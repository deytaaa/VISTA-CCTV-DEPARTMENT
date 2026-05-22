const supabase = require('../lib/supabase');

module.exports = {
  list: async (req, res) => {
    try {
      const { job_order_id } = req.query;
      let q = supabase.from('job_orders').select('*').order('updated_at', { ascending: false });
      if (job_order_id) q = q.eq('id', job_order_id);
      const { data, error } = await q;
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list approvals/job orders' });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from('job_orders').select('*').eq('id', id).single();
      if (error) return res.status(404).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch approval/job order' });
    }
  },

  create: async (req, res) => {
    try {
      // create an approval action: set job_orders.status to 'for_approval' or 'approved' depending on body
      const { job_order_id, action, remarks, approved_by } = req.body;
      if (!job_order_id || !action) return res.status(400).json({ error: 'job_order_id and action required' });

      let newStatus = null;
      if (action === 'request_approval') newStatus = 'for_approval';
      if (action === 'approve') newStatus = 'approved';
      if (action === 'reject') newStatus = 'rejected';

      if (newStatus) {
        const { data, error } = await supabase.from('job_orders').update({ status: newStatus, rejection_remarks: action === 'reject' ? remarks : null }).eq('id', job_order_id).select('*').single();
        if (error) return res.status(500).json({ error: error.message || error });
        // log activity
        await supabase.from('activity_logs').insert({ user_id: approved_by || null, action: `Approval action: ${action}`, job_order_id });
        return res.json({ data });
      }

      return res.status(400).json({ error: 'Unknown action' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to perform approval action' });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body;
      const { data, error } = await supabase.from('job_orders').update(payload).eq('id', id).select('*').single();
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update approval/job order' });
    }
  }
};
