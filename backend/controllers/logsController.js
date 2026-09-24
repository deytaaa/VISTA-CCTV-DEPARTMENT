const supabase = require('../lib/supabase');

module.exports = {
  list: async (req, res) => {
    try {
      const { q: search, role, date_from, date_to, page = 1, limit = 10, job_order_id } = req.query;
      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      // `users!inner` is required for the role filter to actually drop rows —
      // filtering an ordinary embedded resource only nulls the embed out.
      const usersEmbed = role ? 'users!inner(id, email, role, name)' : 'users(id, email, role, name)';

      let query = supabase
        .from('activity_logs')
        .select(`id, action, timestamp, job_order_id, ${usersEmbed}, job_orders(jo_number)`, { count: 'exact' })
        .order('timestamp', { ascending: false });

      if (job_order_id) query = query.eq('job_order_id', job_order_id);
      if (role) query = query.eq('users.role', role);
      if (date_from) query = query.gte('timestamp', `${date_from}T00:00:00.000Z`);
      if (date_to) query = query.lte('timestamp', `${date_to}T23:59:59.999Z`);
      if (search) {
        // Commas, parens and wildcards inside the value would terminate the
        // PostgREST filter list, so strip them before interpolating.
        const safeSearch = String(search).replace(/[,()*]/g, ' ').trim();

        if (safeSearch) {
          // A top-level .or() can only reference columns of activity_logs
          // itself. The previous version referenced `users.email` and
          // `job_order.jo_number` (not even a real relationship name), which
          // made every search request fail. Resolve the related rows to ids
          // first, then filter on activity_logs' own foreign keys.
          const [{ data: matchedUsers }, { data: matchedJobOrders }] = await Promise.all([
            supabase
              .from('users')
              .select('id')
              .or(`name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`),
            supabase
              .from('job_orders')
              .select('id')
              .ilike('jo_number', `%${safeSearch}%`),
          ]);

          const userIds = (Array.isArray(matchedUsers) ? matchedUsers : []).map((u) => u.id).filter(Boolean);
          const jobOrderIds = (Array.isArray(matchedJobOrders) ? matchedJobOrders : []).map((j) => j.id).filter(Boolean);

          const orFilters = [`action.ilike.%${safeSearch}%`];
          if (userIds.length > 0) orFilters.push(`user_id.in.(${userIds.join(',')})`);
          if (jobOrderIds.length > 0) orFilters.push(`job_order_id.in.(${jobOrderIds.join(',')})`);

          query = query.or(orFilters.join(','));
        }
      }

      const { data, error, count } = await query.range(from, to);
      if (error) return res.status(500).json({ error: error.message || error });
      // Normalize joined fields to the shape the frontend expects
      const normalized = Array.isArray(data)
        ? data.map((row) => ({
            ...row,
            user: row.users ?? null,
            job_order: row.job_orders ?? null,
          }))
        : [];

      return res.json({
        data: normalized,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total: count ?? (Array.isArray(normalized) ? normalized.length : 0),
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list logs' });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, action, timestamp, job_order_id, users(id, email, role, name), job_orders(jo_number)')
        .eq('id', id)
        .single();
      if (error) return res.status(404).json({ error: error.message || error });

      const normalized = data ? { ...data, user: data.users ?? null, job_order: data.job_orders ?? null } : null;
      return res.json({ data: normalized });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch log' });
    }
  }
};
