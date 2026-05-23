const supabase = require('../lib/supabase');

module.exports = {
  list: async (req, res) => {
    try {
      const { q: search, role, date_from, date_to, page = 1, limit = 10, job_order_id } = req.query;
      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      let query = supabase
        .from('activity_logs')
        .select('id, action, timestamp, job_order_id, user:users(email, role, name), job_order:job_orders(jo_number)', { count: 'exact' })
        .order('timestamp', { ascending: false });

      if (job_order_id) query = query.eq('job_order_id', job_order_id);
      if (role) query = query.eq('user.role', role);
      if (date_from) query = query.gte('timestamp', `${date_from}T00:00:00.000Z`);
      if (date_to) query = query.lte('timestamp', `${date_to}T23:59:59.999Z`);
      if (search) {
        query = query.or(
          `action.ilike.%${search}%,user.email.ilike.%${search}%,user.name.ilike.%${search}%,job_order.jo_number.ilike.%${search}%`
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
      return res.status(500).json({ error: 'Failed to list logs' });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, action, timestamp, job_order_id, user:users(email, role, name), job_order:job_orders(jo_number)')
        .eq('id', id)
        .single();
      if (error) return res.status(404).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch log' });
    }
  }
};
