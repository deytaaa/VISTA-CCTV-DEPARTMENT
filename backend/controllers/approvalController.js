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
      const { job_order_id, action, remarks, approved_by } = req.body;
      if (!job_order_id || !action) return res.status(400).json({ error: 'job_order_id and action required' });

      const normalizedAction = action === 'archived' ? 'approve' : action;
      const requiresApprover = normalizedAction === 'approve' || normalizedAction === 'reject';
      if (requiresApprover && !approved_by) {
        return res.status(400).json({ error: 'approved_by is required for approve/reject actions' });
      }

      const { data: jobOrder, error: jobOrderError } = await supabase
        .from('job_orders')
        .select('id, jo_number, receiver_id, sender_id, status')
        .eq('id', job_order_id)
        .single();

      if (jobOrderError) return res.status(404).json({ error: jobOrderError.message || jobOrderError });

      if (normalizedAction === 'approve' && jobOrder.status === 'archived') {
        return res.status(400).json({ error: 'Archived job orders cannot be approved again' });
      }

      let newStatus = null;
      if (normalizedAction === 'request_approval') newStatus = 'for_approval';
      if (normalizedAction === 'approve') newStatus = 'approved';
      if (normalizedAction === 'reject') newStatus = 'rejected';

      if (!newStatus) {
        return res.status(400).json({ error: 'Unknown action' });
      }

      const { data, error } = await supabase
        .from('job_orders')
        .update({
          status: newStatus,
          rejection_remarks: normalizedAction === 'reject' ? remarks : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job_order_id)
        .select('*')
        .single();

      if (error) return res.status(500).json({ error: error.message || error });

      const activityAction =
        normalizedAction === 'request_approval'
          ? `Job Order ${jobOrder?.jo_number || job_order_id} proof re-submitted`
          : normalizedAction === 'approve'
            ? `Job Order ${jobOrder?.jo_number || job_order_id} has been approved`
            : `Job Order ${jobOrder?.jo_number || job_order_id} has been rejected`;

      await supabase.from('activity_logs').insert({ user_id: approved_by || null, action: activityAction, job_order_id });

      if (normalizedAction === 'request_approval' && jobOrder?.sender_id) {
        const message = jobOrder.status === 'rejected'
          ? `Proof re-uploaded for ${jobOrder?.jo_number || job_order_id}`
          : `Job Order ${jobOrder?.jo_number || job_order_id} submitted for approval`;

        await supabase.from('notifications').insert({
          user_id: jobOrder.sender_id,
          job_order_id,
          title: 'Approval Request',
          message,
        });
      }

      if (normalizedAction === 'approve' || normalizedAction === 'reject') {
        const notificationTitle = normalizedAction === 'approve' ? 'Job Order Approved' : 'Job Order Rejected';
        const notificationMessage =
          normalizedAction === 'approve'
            ? `Job Order ${jobOrder?.jo_number || job_order_id} has been approved! Great work!`
            : `Job Order ${jobOrder?.jo_number || job_order_id} was rejected. Reason: ${remarks || 'No reason provided'}`;

        if (jobOrder?.receiver_id) {
          await supabase.from('notifications').insert({
            user_id: jobOrder.receiver_id,
            job_order_id,
            title: notificationTitle,
            message: notificationMessage,
          });
        }
      }

      return res.json({ data });
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
  },
};