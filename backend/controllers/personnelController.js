const supabase = require('../lib/supabase');

module.exports = {
  list: async (req, res) => {
    try {
      const { job_order_id } = req.query;
      let q = supabase.from('job_order_personnel').select('*').order('personnel_no');
      if (job_order_id) q = q.eq('job_order_id', job_order_id);
      const { data, error } = await q;
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list personnel' });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from('job_order_personnel').select('*').eq('id', id).single();
      if (error) return res.status(404).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch personnel' });
    }
  },

  create: async (req, res) => {
    try {
      const payload = req.body;
      const { data, error } = await supabase.from('job_order_personnel').insert(payload).select('*');
      if (error) return res.status(500).json({ error: error.message || error });
      return res.status(201).json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create personnel' });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body;
      const { data, error } = await supabase.from('job_order_personnel').update(payload).eq('id', id).select('*').single();
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update personnel' });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from('job_order_personnel').delete().eq('id', id).select('*').single();
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete personnel' });
    }
  }
};
