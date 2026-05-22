const supabase = require('../lib/supabase');

module.exports = {
  list: async (req, res) => {
    try {
      const { job_order_id } = req.query;
      let q = supabase.from('job_order_items').select('*').order('item_no');
      if (job_order_id) q = q.eq('job_order_id', job_order_id);
      const { data, error } = await q;
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list items' });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from('job_order_items').select('*').eq('id', id).single();
      if (error) return res.status(404).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch item' });
    }
  },

  create: async (req, res) => {
    try {
      const payload = req.body;
      const { data, error } = await supabase.from('job_order_items').insert(payload).select('*');
      if (error) return res.status(500).json({ error: error.message || error });
      return res.status(201).json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create item' });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body;
      const { data, error } = await supabase.from('job_order_items').update(payload).eq('id', id).select('*').single();
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update item' });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from('job_order_items').delete().eq('id', id).select('*').single();
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete item' });
    }
  }
};
