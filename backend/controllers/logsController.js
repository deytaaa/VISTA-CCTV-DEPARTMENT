const supabase = require('../lib/supabase');

module.exports = {
  list: async (req, res) => {
    try {
      const { job_order_id, limit = 100 } = req.query;
      let q = supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(Number(limit));
      if (job_order_id) q = q.eq('job_order_id', job_order_id);
      const { data, error } = await q;
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list logs' });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from('activity_logs').select('*').eq('id', id).single();
      if (error) return res.status(404).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch log' });
    }
  }
};
