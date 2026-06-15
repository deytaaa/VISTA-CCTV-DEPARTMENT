const supabase = require('../lib/supabase');

function getTargetUserId(req) {
  const id = req.params?.id;
  return id ? String(id) : null;
}

  function pickProfileDefaults({ id, name, email, role, is_active }) {
    return {
      id: id ?? null,
      name: name ?? '',
      email: email ?? '',
      role: role ?? null,
      is_active: is_active ?? true,
    };
  }


module.exports = {
  // GET /api/users/technicians
  listTechnicians: async (req, res) => {
    try {
      const { data: technicians, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'technician')
        .order('name', { ascending: true });

      if (error) return res.status(500).json({ error: error.message || error });

      return res.json({ data: Array.isArray(technicians) ? technicians : [] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list technicians' });
    }
  },

  // GET /api/users
  listUsers: async (req, res) => {

    try {
      // Join public.users profile table
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (authError) return res.status(500).json({ error: authError.message || authError });

      const authUserList = Array.isArray(authUsers?.users) ? authUsers.users : [];
      const userIds = authUserList.map((u) => u.id);

      if (userIds.length === 0) return res.json({ data: [] });

      const { data: profileRows, error: profileError } = await supabase
        .from('users')
        .select('id, name, email, role, created_at, is_active')
        .in('id', userIds);



      if (profileError) return res.status(500).json({ error: profileError.message || profileError });

      const profilesById = new Map((Array.isArray(profileRows) ? profileRows : []).map((row) => [row.id, row]));

      const merged = authUserList
        .map((u) => {
          const p = profilesById.get(u.id);
          return {
            id: u.id,
            name: p?.name ?? u.user_metadata?.name ?? u.email,
            email: p?.email ?? u.email,
            role: p?.role ?? u.app_metadata?.role ?? u.user_metadata?.role ?? null,
            created_at: p?.created_at ?? u.created_at ?? null,
            is_active: p?.is_active ?? true,
          };
        })
        .sort((a, b) => {
          const at = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bt - at;
        });

      return res.json({ data: merged });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list users' });
    }
  },

  // POST /api/users
  createUser: async (req, res) => {
    try {
      const { name, email, password, role } = req.body || {};

      if (!email || !password || !role) {
        return res.status(400).json({ error: 'name, email, password, and role are required' });
      }

      const displayName = name ? String(name).trim() : String(email).trim();

      const { data, error } = await supabase.auth.admin.createUser({
        email: String(email).trim(),
        password: String(password),
        email_confirm: true,
        user_metadata: { name: displayName, role },
        app_metadata: { role },
      });

      if (error) return res.status(500).json({ error: error.message || error });

      const userId = data?.user?.id;
      if (!userId) return res.status(500).json({ error: 'User created but no id returned' });

      const { error: profileError } = await supabase.from('users').upsert({
        id: userId,
        name: displayName,
        email: String(email).trim(),
        role,
      });

      if (profileError) return res.status(500).json({ error: profileError.message || profileError });

      return res.status(201).json({
        data: {
          id: userId,
          name: displayName,
          email: String(email).trim(),
          role,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create user' });
    }
  },

  // PUT /api/users/:id
  updateUser: async (req, res) => {
    try {
      const targetUserId = getTargetUserId(req);
      if (!targetUserId) return res.status(400).json({ error: 'Missing user id' });

      const { name, role } = req.body || {};

      if (!name && !role) return res.status(400).json({ error: 'name or role is required' });

      const updateAuthPayload = {};
      if (typeof name === 'string' && name.trim()) {
        updateAuthPayload.user_metadata = { ...(role ? { role } : {}), name: name.trim() };
      }
      if (!updateAuthPayload.user_metadata && role) {
        updateAuthPayload.user_metadata = { role };
      }
      if (role) {
        updateAuthPayload.app_metadata = { role };
      }

      if (Object.keys(updateAuthPayload).length > 0) {
        const { error: authError } = await supabase.auth.admin.updateUserById(targetUserId, updateAuthPayload);
        if (authError) return res.status(500).json({ error: authError.message || authError });
      }

      const { error: profileError } = await supabase.from('users').update({
        ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
        ...(role ? { role } : {}),
      }).eq('id', targetUserId);

      if (profileError) return res.status(500).json({ error: profileError.message || profileError });

      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update user' });
    }
  },

  // POST /api/users/:id/reset-password
  resetPassword: async (req, res) => {
    try {
      const targetUserId = getTargetUserId(req);
      if (!targetUserId) return res.status(400).json({ error: 'Missing user id' });

      const { password } = req.body || {};

      if (!password || String(password).length < 6) {
        return res.status(400).json({ error: 'New password is required (min 6 chars)' });
      }

      const { error } = await supabase.auth.admin.updateUserById(targetUserId, {
        password: String(password),
      });

      if (error) return res.status(500).json({ error: error.message || error });

      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to reset password' });
    }
  },

  // DELETE /api/users/:id (soft delete)
  deleteUser: async (req, res) => {
    try {
      const targetUserId = getTargetUserId(req);
      if (!targetUserId) return res.status(400).json({ error: 'Missing user id' });

      const adminUserId = req.user?.id;
      if (adminUserId && String(adminUserId) === String(targetUserId)) {
        return res.status(400).json({ error: 'You cannot deactivate your own account.' });
      }

      // Soft-deactivate profile row
      const { error: profileError } = await supabase.from('users').update({
        is_active: false,
      }).eq('id', targetUserId);

      if (profileError) return res.status(500).json({ error: profileError.message || profileError });

      // Ban auth account to effectively disable login
      // (use a very long duration as requested)
      const { error: authError } = await supabase.auth.admin.updateUserById(targetUserId, {
        ban_duration: '876000h',
      });
      if (authError) return res.status(500).json({ error: authError.message || authError });

      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to deactivate user' });
    }
  },

  // POST /api/users/:id/reactivate (admin)
  reactivateUser: async (req, res) => {
    try {
      const targetUserId = getTargetUserId(req);
      if (!targetUserId) return res.status(400).json({ error: 'Missing user id' });

      const { error: profileError } = await supabase.from('users').update({
        is_active: true,
      }).eq('id', targetUserId);

      if (profileError) return res.status(500).json({ error: profileError.message || profileError });

      const { error: authError } = await supabase.auth.admin.updateUserById(targetUserId, {
        ban_duration: 'none',
      });
      if (authError) return res.status(500).json({ error: authError.message || authError });

      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to reactivate user' });
    }
  },

  // GET /api/users/inactive (admin)
  listInactiveUsers: async (req, res) => {
    try {
      // Pull all active=false profiles first, then map to auth user fields.
      const { data: profileRows, error: profileError } = await supabase
        .from('users')
        .select('id, name, email, role, created_at, is_active')
        .eq('is_active', false)
        .order('created_at', { ascending: false });

      if (profileError) return res.status(500).json({ error: profileError.message || profileError });

      const inactiveProfiles = Array.isArray(profileRows) ? profileRows : [];
      const userIds = inactiveProfiles.map((p) => p.id);
      if (userIds.length === 0) return res.json({ data: [] });

      // Auth user list (for extra fields if needed later). We currently just return profiles.
      return res.json({ data: inactiveProfiles });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to list inactive users' });
    }
  },
};



