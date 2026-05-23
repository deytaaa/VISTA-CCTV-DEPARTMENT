const supabase = require('../lib/supabase');

module.exports = {
  listTechnicians: async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('role', 'technician')
        .order('name', { ascending: true });

      if (error) return res.status(500).json({ error: error.message || error });

      return res.json({ data: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list technicians' });
    }
  },
};