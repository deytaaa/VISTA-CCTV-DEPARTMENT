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
      const { previousProofFile, proofFile, proof_url, ...completionData } = payload;
      const completedBy = req.user?.id || null;

      // If there's already a completion report for this job_order, update it
      if (completionData.job_order_id) {
        const { data: existingList, error: fetchError } = await supabase
          .from('completion_reports')
          .select('*')
          .eq('job_order_id', completionData.job_order_id)
          .order('completed_at', { ascending: false })
          .limit(1);

        if (fetchError) return res.status(500).json({ error: fetchError.message || fetchError });

        const existing = Array.isArray(existingList) && existingList.length > 0 ? existingList[0] : null;
        if (existing && existing.id) {
          if (!completionData.proof_file) {
            return res.status(400).json({ error: 'Proof URL is required when updating a completion report' });
          }

          const updatedPayload = {
            ...completionData,
            completed_by: completedBy,
            completed_at: completionData.completed_at || new Date().toISOString(),
            proof_file: completionData.proof_file,
          };
          const { data: updated, error: updateError } = await supabase
            .from('completion_reports')
            .update(updatedPayload)
            .eq('id', existing.id)
            .select('*')
            .single();
          if (updateError) return res.status(500).json({ error: updateError.message || updateError });
          return res.json({ data: updated });
        }
      }

      // No existing report found, insert a new one
      if (!completionData.proof_file) {
        return res.status(400).json({ error: 'Proof URL is required when creating a completion report' });
      }

      const { data, error } = await supabase
        .from('completion_reports')
        .insert({
          ...completionData,
          completed_by: completedBy,
          completed_at: completionData.completed_at || new Date().toISOString(),
          proof_file: completionData.proof_file,
        })
        .select('*')
        .single();
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
      const payload = req.body || {};
      const { previousProofFile, proofFile, proof_url, ...completionData } = payload;
      const { data, error } = await supabase.from('completion_reports').update(completionData).eq('id', id).select('*').single();
      if (error) return res.status(500).json({ error: error.message || error });
      return res.json({ data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update completion' });
    }
  }
};
