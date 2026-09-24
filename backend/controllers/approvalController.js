const supabase = require('../lib/supabase');

async function notifyUsers(userIds, notification) {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return;

  const now = new Date().toISOString();
  const rows = uniqueIds.map((userId) => ({
    user_id: userId,
    job_order_id: notification.jobOrderId,
    title: notification.title,
    message: notification.message,
    is_read: false,
    created_at: now,
  }));

  // One insert instead of one HTTP round trip per recipient.
  const { error: insertError } = await supabase.from('notifications').insert(rows);
  if (insertError) console.warn('Failed to insert notifications', insertError);
}

// The only job_orders columns PUT /api/approval/:id may write.
const APPROVAL_UPDATABLE_COLUMNS = ['status', 'rejection_remarks'];

async function getAdminUserIds() {
  const { data, error } = await supabase.from('users').select('id').eq('role', 'admin');
  if (error || !Array.isArray(data)) return [];
  return data.map((admin) => admin.id).filter(Boolean);
}

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
      const { job_order_id, action, remarks } = req.body;
      if (!job_order_id || !action) return res.status(400).json({ error: 'job_order_id and action required' });

      // The actor is whoever the bearer token belongs to. Never trust a
      // client-supplied approved_by — it let any caller attribute an
      // approval to someone else.
      const actorId = req.user?.id || null;
      const actorRole = req.user?.role || null;
      if (!actorId) return res.status(401).json({ error: 'Not authenticated' });

      const normalizedAction = action === 'archived' ? 'approve' : action;

      let newStatus = null;
      if (normalizedAction === 'request_approval') newStatus = 'for_approval';
      if (normalizedAction === 'approve') newStatus = 'approved';
      if (normalizedAction === 'reject') newStatus = 'rejected';

      if (!newStatus) {
        return res.status(400).json({ error: 'Unknown action' });
      }

      // Only admins decide approvals; only the assigned technician submits one.
      if ((normalizedAction === 'approve' || normalizedAction === 'reject') && actorRole !== 'admin') {
        return res.status(403).json({ error: 'Only an admin can approve or reject a job order' });
      }
      if (normalizedAction === 'request_approval' && actorRole !== 'technician') {
        return res.status(403).json({ error: 'Only the assigned technician can submit a job order for approval' });
      }

      const { data: jobOrder, error: jobOrderError } = await supabase
        .from('job_orders')
        .select('id, jo_number, receiver_id, sender_id, status')
        .eq('id', job_order_id)
        .is('deleted_at', null)
        .single();

      if (jobOrderError) return res.status(404).json({ error: jobOrderError.message || jobOrderError });

      const previousStatus = jobOrder.status;

      if (normalizedAction === 'approve' && previousStatus === 'archived') {
        return res.status(400).json({ error: 'Archived job orders cannot be approved again' });
      }

      if (normalizedAction === 'request_approval') {
        if (jobOrder.receiver_id && jobOrder.receiver_id !== actorId) {
          return res.status(403).json({ error: 'This job order is not assigned to you' });
        }

        if (!['processing', 'rejected'].includes(previousStatus)) {
          return res.status(400).json({
            error: 'Only a processing or rejected job order can be submitted for approval',
          });
        }

        // Submitting for approval must carry proof. markCompleted already
        // enforced this; the approval route did not, so the UI could submit a
        // rejected JO again without re-uploading anything.
        const { data: reports, error: reportError } = await supabase
          .from('completion_reports')
          .select('id, proof_file, completed_at')
          .eq('job_order_id', job_order_id)
          .order('completed_at', { ascending: false })
          .limit(1);

        if (reportError) return res.status(500).json({ error: reportError.message || reportError });

        const latestReport = Array.isArray(reports) ? reports[0] : null;
        if (!latestReport?.proof_file) {
          return res.status(400).json({ error: 'Please upload signed JO proof before submitting for approval' });
        }
      }

      if ((normalizedAction === 'approve' || normalizedAction === 'reject') && previousStatus !== 'for_approval') {
        return res.status(400).json({ error: 'Only job orders awaiting approval can be approved or rejected' });
      }

      if (normalizedAction === 'reject' && !String(remarks || '').trim()) {
        return res.status(400).json({ error: 'A rejection reason is required' });
      }

      // Guard the write on the status the decision was based on. Without it two
      // admins clicking Approve at the same moment both pass the check above,
      // both write, and both fire notifications.
      const allowedFromStatuses =
        normalizedAction === 'request_approval' ? ['processing', 'rejected'] : ['for_approval'];

      const { data: updatedRows, error } = await supabase
        .from('job_orders')
        .update({
          status: newStatus,
          rejection_remarks: normalizedAction === 'reject' ? remarks : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job_order_id)
        .in('status', allowedFromStatuses)
        .select('*');

      if (error) return res.status(500).json({ error: error.message || error });

      if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
        return res.status(409).json({ error: 'This job order was already updated. Please refresh.' });
      }

      const data = updatedRows[0];

      const activityAction =
        normalizedAction === 'request_approval'
          ? previousStatus === 'rejected'
            ? `Job Order ${jobOrder?.jo_number || job_order_id} proof re-submitted`
            : `Job Order ${jobOrder?.jo_number || job_order_id} submitted for approval`
          : normalizedAction === 'approve'
            ? `Job Order ${jobOrder?.jo_number || job_order_id} has been approved`
            : `Job Order ${jobOrder?.jo_number || job_order_id} has been rejected`;

      await supabase.from('activity_logs').insert({ user_id: actorId, action: activityAction, job_order_id });

      if (normalizedAction === 'request_approval') {
        const adminIds = await getAdminUserIds();
        const message = previousStatus === 'rejected'
          ? `Job Order ${jobOrder?.jo_number || job_order_id} proof has been re-uploaded and is ready for review.`
          : `Job Order ${jobOrder?.jo_number || job_order_id} has been submitted for your approval.`;

        await notifyUsers(adminIds, {
          jobOrderId: job_order_id,
          title: 'Job Order Submitted',
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
          await notifyUsers([jobOrder.receiver_id], {
            jobOrderId: job_order_id,
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
      const payload = req.body || {};
      const updateObj = {};
      for (const column of APPROVAL_UPDATABLE_COLUMNS) {
        if (Object.prototype.hasOwnProperty.call(payload, column)) {
          updateObj[column] = payload[column];
        }
      }
      if (Object.keys(updateObj).length === 0) {
        return res.status(400).json({ error: 'No updatable fields provided' });
      }
      const { data, error } = await supabase.from('job_orders').update(updateObj).eq('id', id).select('*').single();
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update approval/job order' });
    }
  },
};