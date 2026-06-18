const supabase = require('../lib/supabase')
const { previewInventoryUsage, deductInventoryForJobOrder } = require('../lib/inventory');

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

async function notifyUser({ userId, jobOrderId, title, message }) {
  if (!userId) return;

  await supabase.from('notifications').insert({
    user_id: userId,
    job_order_id: jobOrderId,
    title,
    message,
    is_read: false,
    created_at: new Date().toISOString(),
  });
}

async function notifyTechnicianForSentJobOrder({ jobOrderId, joNumber, receiverId }) {
  const message = joNumber ? `New Job Order ${joNumber} has been assigned to you.` : 'New Job Order has been assigned to you.';
  await notifyUser({
    userId: receiverId,
    jobOrderId,
    title: 'Job Order Assigned',
    message,
  });
}

async function notifyAdmins({ jobOrderId, title, message }) {
  const { data: admins, error } = await supabase.from('users').select('id').eq('role', 'admin');
  if (error || !Array.isArray(admins) || admins.length === 0) return;

  await Promise.all(
    admins.map((admin) =>
      supabase.from('notifications').insert({
        user_id: admin.id,
        job_order_id: jobOrderId,
        title,
        message,
        is_read: false,
        created_at: new Date().toISOString(),
      })
    )
  );
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
        .select('*, sender:users!job_orders_sender_id_fkey(id, name, email, role), receiver:users!job_orders_receiver_id_fkey(id, name, email, role), job_order_items(*), job_order_personnel(*), completion_reports(*, completed_by_user:users!completion_reports_completed_by_fkey(id, name, email, role))', { count: 'exact' })
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

      // Ensure the frontend receives only the latest completion_report per job order
      if (Array.isArray(data) && data.length > 0) {
        try {
          const ids = data.map((d) => d.id).filter(Boolean);
          const { data: reports, error: repErr } = await supabase
            .from('completion_reports')
            .select('*, completed_by_user:users!completion_reports_completed_by_fkey(id, name, email, role)')
            .in('job_order_id', ids)
            .order('completed_at', { ascending: false });
          if (!repErr && Array.isArray(reports)) {
            const latestMap = {};
            for (const r of reports) {
              if (!latestMap[r.job_order_id]) latestMap[r.job_order_id] = r;
            }
            for (const jo of data) {
              jo.completion_reports = latestMap[jo.id] ? [latestMap[jo.id]] : [];
            }
          }
        } catch (e) {
          console.warn('Failed to fetch latest completion reports', e);
        }
      }

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
        .select('*, sender:users!job_orders_sender_id_fkey(id, name, email, role), receiver:users!job_orders_receiver_id_fkey(id, name, email, role), job_order_items(*), job_order_personnel(*), completion_reports(*, completed_by_user:users!completion_reports_completed_by_fkey(id, name, email, role))')
        .eq('id', id)
        .single();
      if (error) return res.status(404).json({ error: error.message || error });

      // Replace nested completion_reports with the single latest one
      try {
        const { data: reports, error: repErr } = await supabase
          .from('completion_reports')
          .select('*, completed_by_user:users!completion_reports_completed_by_fkey(id, name, email, role)')
          .eq('job_order_id', id)
          .order('completed_at', { ascending: false })
          .limit(1);
        if (!repErr && Array.isArray(reports) && reports.length > 0) {
          data.completion_reports = [reports[0]];
        } else {
          data.completion_reports = [];
        }
      } catch (e) {
        console.warn('Failed to fetch latest completion report for job order', e);
      }

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

      // BACKEND SANITIZE + VALIDATE BEFORE INSERT (prevents invalid qty from burning JO numbers)
      if (status === 'sent') {
        if (!payload.location || payload.location.trim() === '') {
          return res.status(400).json({ error: 'Location is required.' });
        }

        const sentItems = Array.isArray(payload.items) ? payload.items : [];
        const validSentItems = sentItems.filter((it) => {
          const q = Number(it?.quantity);
          return Boolean(it?.item_name) && !Number.isNaN(q) && q > 0;
        });

        if (validSentItems.length === 0) {
          return res.status(400).json({
            error: 'At least one item with a valid quantity is required.',
          });
        }

        const sentPersonnel = Array.isArray(payload.personnel) ? payload.personnel : [];
        const validSentPersonnel = sentPersonnel.filter((p) => p?.name && String(p.name).trim() !== '');
        if (validSentPersonnel.length === 0) {
          return res.status(400).json({ error: 'At least one personnel is required.' });
        }
      }

      if (Array.isArray(payload.items)) {

        const invalidItems = payload.items.filter((it) => {
          const q = Number(it?.quantity);
          return (
            it?.quantity === '' ||
            it?.quantity == null ||
            Number.isNaN(q) ||
            q <= 0
          );
        });

        if (invalidItems.length > 0) {
          return res.status(400).json({
            error: 'All items must have a valid quantity greater than 0.',
          });
        }

        // Normalize quantity to number (and allow DB to rely on numeric columns)
        payload.items = payload.items.map((it) => ({
          ...it,
          quantity: Number(it.quantity),
        }));
      }


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

      if (status === 'sent' && Array.isArray(payload.items) && payload.items.length > 0) {
        const { shortages } = await previewInventoryUsage(payload.items);
        if (shortages.length > 0 && !payload.allow_insufficient_stock) {
          const message = shortages
            .map((item) => `${item.item_name} only has ${item.available} ${item.unit} in stock but JO requires ${item.required}.`)
            .join(' ');
          return res.status(409).json({ error: message, shortages });
        }
      }

      const insertObj = {
        jo_number: joNumber,
        date: payload.date || new Date().toISOString().slice(0, 10),
        location: payload.location || null,
        requestor_name: payload.requestor_name || null,
        status,
        sender_id: payload.sender_id || null,
        receiver_id: payload.receiver_id || null,
        updated_at: new Date().toISOString()
      };

      let created;
      try {
        const insertRes = await supabase
          .from('job_orders')
          .insert(insertObj)
          .select('*')
          .single();

        if (insertRes.error) {
          console.error('JO insert failed:', insertRes.error);
          return res.status(400).json({
            error: 'Failed to create Job Order. Please check all fields and try again.',
          });
        }

        created = insertRes.data;
      } catch (err) {
        console.error('Unexpected error creating JO:', err);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
      }

      const jobOrderId = created.id;

      // Insert items and personnel if present
      if (Array.isArray(payload.items) && payload.items.length > 0) {
        const itemsToInsert = payload.items.map((it, idx) => ({
          job_order_id: jobOrderId,
          item_no: it.item_no || idx + 1,
          item_name: it.item_name,
          reference_no: it.reference_no || null,
          quantity: Number(it.quantity),
        }));

        try {
          const { error: itemsError } = await supabase.from('job_order_items').insert(itemsToInsert);
          if (itemsError) {
            console.error('Items insert failed:', itemsError);
            // Roll back the orphaned JO so the number isn't wasted
            await supabase.from('job_orders').delete().eq('id', jobOrderId);
            return res.status(400).json({
              error:
                'Failed to save item details. The Job Order was not created. Please try again.',
            });
          }
        } catch (err) {
          console.error('Unexpected items insert error:', err);
          await supabase.from('job_orders').delete().eq('id', jobOrderId);
          return res.status(500).json({ error: 'Something went wrong. Please try again.' });
        }
      }

      if (Array.isArray(payload.personnel) && payload.personnel.length > 0) {
        const persToInsert = payload.personnel.map((p, idx) => ({
          job_order_id: jobOrderId,
          personnel_no: p.personnel_no || idx + 1,
          name: p.name,
        }));

        try {
          const { error: persError } = await supabase.from('job_order_personnel').insert(persToInsert);
          if (persError) {
            console.error('Personnel insert failed:', persError);
            await supabase.from('job_orders').delete().eq('id', jobOrderId);
            return res.status(400).json({
              error:
                'Failed to save personnel details. The Job Order was not created. Please try again.',
            });
          }
        } catch (err) {
          console.error('Unexpected personnel insert error:', err);
          await supabase.from('job_orders').delete().eq('id', jobOrderId);
          return res.status(500).json({ error: 'Something went wrong. Please try again.' });
        }
      }


      if (status === 'sent') {
        try {
          if (Array.isArray(payload.items) && payload.items.length > 0) {
            console.log('[jobOrderController.create] status=sent, starting inventory deduct + notifications');
            console.log('[jobOrderController.create] jobOrderId=', jobOrderId, 'joNumber=', created.jo_number, 'performedBy=', req.user?.id || null);

            const items = payload.items;
            console.log('[jobOrderController] items being sent to deduction:', JSON.stringify(items, null, 2));

            const inventoryResult = await deductInventoryForJobOrder({
              items,
              jobOrderId,
              joNumber: created.jo_number,
              performedBy: req.user?.id || null,
              allowInsufficientStock: Boolean(payload.allow_insufficient_stock),
            });

            console.log('[jobOrderController] inventoryResult.shortages:', JSON.stringify(inventoryResult.shortages, null, 2));
            console.log('[jobOrderController] inventoryResult.deductions:', JSON.stringify(inventoryResult.deductions, null, 2));
            console.log('[jobOrderController] inventoryResult.transactions:', JSON.stringify(inventoryResult.transactions, null, 2));


            console.log('[jobOrderController.create] inventoryResult keys=', inventoryResult ? Object.keys(inventoryResult) : inventoryResult);
            const deductions = Array.isArray(inventoryResult?.deductions) ? inventoryResult.deductions : [];
            console.log('[jobOrderController.create] deductions.length=', deductions.length);
            if (deductions.length > 0) console.log('[jobOrderController.create] deductions.sample=', deductions[0]);

              // Inventory notifications (per affected item)
              const { data: inventoryUsers, error: invUserErr } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'inventory');

              console.log('[jobOrderController.create] inventoryUsers count=', Array.isArray(inventoryUsers) ? inventoryUsers.length : null, 'invUserErr=', invUserErr);

              if (!invUserErr && Array.isArray(inventoryUsers) && inventoryUsers.length > 0) {
                const notificationsToInsert = [];
                const inventoryUserIds = inventoryUsers.map((u) => u.id).filter(Boolean);
                console.log('[jobOrderController.create] inventoryUserIds=', inventoryUserIds);

                const stockDeductedDeductions = Array.isArray(deductions)
                  ? deductions.filter((d) => Number(d?.quantity_used ?? 0) > 0)
                  : [];

                // Deduction notifications for inventory role must use message prefix tags
                // so the frontend can filter inventory stock alerts.
                for (const d of stockDeductedDeductions) {
                  const quantityUsed = Number(d.quantity_used || 0);
                  const unit = d.unit || '';
                  const itemName = d.item_name || '';
                  const minimumStock = Number(d.minimum_stock ?? 0);

                  // IMPORTANT: Use the real remaining stock from DB (after RPC deduction)
                  const { data: freshItem } = await supabase
                    .from('inventory_items')
                    .select('id, current_stock, item_name, unit')
                    .eq('id', d.inventory_item_id)
                    .single();

                  const actualStock = Number(freshItem?.current_stock ?? d.new_stock ?? 0);
                  const actualUnit = freshItem?.unit || unit;
                  const actualItemName = freshItem?.item_name || itemName;

                  // STOCK DEDUCTED notification for this JO (job_order_id = generated JO id)
                  if (quantityUsed > 0) {
                    const stockDeductedMessage = `📦 ${quantityUsed} ${actualUnit} of ${actualItemName} was used in ${created.jo_number}. Remaining stock: ${actualStock} ${actualUnit}.`;
                    for (const uid of inventoryUserIds) {
                      notificationsToInsert.push({
                        user_id: uid,
                        title: 'Inventory Alert',
                        message: stockDeductedMessage,
                        job_order_id: jobOrderId,
                        is_read: false,
                        created_at: new Date().toISOString(),
                      });
                    }
                  }

                  // OUT OF STOCK / LOW STOCK after deduction (based on actualStock)
                  if (actualStock === 0) {
                    const outMessage = `❌ Out of Stock: ${actualItemName} has no units remaining. Immediate restocking required.`;
                    for (const uid of inventoryUserIds) {
                      notificationsToInsert.push({
                        user_id: uid,
                        title: 'Out of Stock Alert',
                        message: outMessage,
                        job_order_id: null,
                        is_read: false,
                        created_at: new Date().toISOString(),
                      });
                    }
                  } else if (actualStock > 0 && actualStock <= minimumStock) {
                    const lowMessage = `Low Stock Alert: ${actualItemName} (${actualStock} ${actualUnit} remaining)`;
                    for (const uid of inventoryUserIds) {
                      notificationsToInsert.push({
                        user_id: uid,
                        title: 'Low Stock Alert',
                        message: lowMessage,
                        job_order_id: null,
                        is_read: false,
                        created_at: new Date().toISOString(),
                      });
                    }
                  }
                }

                if (notificationsToInsert.length > 0) {
                  const insertPromises = notificationsToInsert.map((n) => supabase.from('notifications').insert(n));
                  await Promise.all(insertPromises);
                }
              }
          }
        } catch (inventoryError) {
          await supabase.from('job_orders').delete().eq('id', jobOrderId);
          return res.status(409).json({ error: inventoryError.message || 'Failed to deduct inventory', shortages: inventoryError.shortages || [] });
        }

        await notifyTechnicianForSentJobOrder({
          jobOrderId,
          joNumber: created.jo_number,
          receiverId: created.receiver_id,
        });
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
      const { data: current, error: currentError } = await supabase
        .from('job_orders')
        .select('id, jo_number, status, receiver_id, items:job_order_items(*), personnel:job_order_personnel(*)')
        .eq('id', id)
        .single();

      if (currentError || !current) {
        return res.status(404).json({ error: currentError?.message || 'Job order not found' });
      }

      if (payload.status === 'sent' && current.status !== 'sent' && Array.isArray(payload.items) && payload.items.length > 0) {
        const { shortages } = await previewInventoryUsage(payload.items);
        if (shortages.length > 0 && !payload.allow_insufficient_stock) {
          const message = shortages
            .map((item) => `${item.item_name} only has ${item.available} ${item.unit} in stock but JO requires ${item.required}.`)
            .join(' ');
          return res.status(409).json({ error: message, shortages });
        }
      }

      const { data, error } = await supabase
        .from('job_orders')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();
      if (error) return res.status(500).json({ error: error.message || error });

      if (payload.status === 'sent' && current.status !== 'sent') {
        await notifyTechnicianForSentJobOrder({
          jobOrderId: id,
          joNumber: data?.jo_number || payload.jo_number || current.jo_number || null,
          receiverId: data?.receiver_id || payload.receiver_id || current.receiver_id || null,
        });
      }

      if (Array.isArray(payload.items)) {
        await supabase.from('job_order_items').delete().eq('job_order_id', id);
        if (payload.items.length > 0) {
          const itemsToInsert = payload.items.map((item, index) => ({
            job_order_id: id,
            item_no: item.item_no || index + 1,
            item_name: item.item_name,
            reference_no: item.reference_no || null,
            quantity: item.quantity || 1,
          }));
          const { error: itemsError } = await supabase.from('job_order_items').insert(itemsToInsert);
          if (itemsError) return res.status(500).json({ error: itemsError.message || itemsError });
        }
      }

      if (Array.isArray(payload.personnel)) {
        await supabase.from('job_order_personnel').delete().eq('job_order_id', id);
        if (payload.personnel.length > 0) {
          const personnelToInsert = payload.personnel.map((person, index) => ({
            job_order_id: id,
            personnel_no: person.personnel_no || index + 1,
            name: person.name,
          }));
          const { error: personnelError } = await supabase.from('job_order_personnel').insert(personnelToInsert);
          if (personnelError) return res.status(500).json({ error: personnelError.message || personnelError });
        }
      }

      if (payload.status === 'sent' && current.status !== 'sent' && Array.isArray(payload.items) && payload.items.length > 0) {
        try {
          const inventoryResult = await deductInventoryForJobOrder({
            items: payload.items,
            jobOrderId: id,
            joNumber: data?.jo_number || payload.jo_number || current.jo_number || null,
            performedBy: req.user?.id || null,
            allowInsufficientStock: Boolean(payload.allow_insufficient_stock),
          });
        } catch (inventoryError) {
          await supabase.from('job_orders').update({ status: current.status, updated_at: new Date().toISOString() }).eq('id', id);
          return res.status(409).json({ error: inventoryError.message || 'Failed to deduct inventory', shortages: inventoryError.shortages || [] });
        }
      }

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
        .select('id, jo_number, status, receiver_id, sender_id')
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

      await notifyAdmins({
        jobOrderId: id,
        title: 'Job Order Submitted',
        message: `Job Order ${current?.jo_number || id} has been submitted for your approval.`,
      });

      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to mark job order as completed' });
    }
  }
};
