const supabase = require('../lib/supabase');

module.exports = {
  list: async (req, res) => {
    try {
      const { job_order_id } = req.query;
      let q = supabase.from('completion_reports').select('*').order('completed_at', { ascending: false });
      if (job_order_id) q = q.eq('job_order_id', job_order_id);
      const { data, error } = await q;
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list completions' });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from('completion_reports').select('*').eq('id', id).single();
      if (error) return res.status(404).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch completion' });
    }
  },

  create: async (req, res) => {
    try {
      const payload = req.body || {};
      const completedBy = req.user?.id || null;

      const { data, error } = await supabase
        .from('completion_reports')
        .insert({
          ...payload,
          completed_by: completedBy,
        })
        .select('*');
      if (error) return res.status(500).json({ error: error.message || error });

      return res.status(201).json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create completion' });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body;
      const { data, error } = await supabase.from('completion_reports').update(payload).eq('id', id).select('*').single();
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update completion' });
    }
  }
};
