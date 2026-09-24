const supabase = require('../lib/supabase');
const { invalidateUser } = require('../middleware/auth');

function getTargetUserId(req) {
  const id = req.params?.id;
  return id ? String(id) : null;
}

module.exports = {
  // GET /api/users/technicians
  listTechnicians: async (req, res) => {
    try {
      const { data: technicians, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'technician')
        // Deactivated technicians are banned from logging in, so assigning a
        // JO to one would strand it with nobody able to act on it.
        .eq('is_active', true)
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
      // This asked for a single page of 1000 and used whatever came back, so
      // user number 1001 onwards silently vanished from User Management with no
      // error. Page through until a short page signals the end.
      const AUTH_PAGE_SIZE = 200;
      const AUTH_PAGE_LIMIT = 50; // hard stop at 10,000 users so a bad response cannot loop forever
      const authUserList = [];

      for (let page = 1; page <= AUTH_PAGE_LIMIT; page += 1) {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
          page,
          perPage: AUTH_PAGE_SIZE,
        });

        if (authError) return res.status(500).json({ error: authError.message || authError });

        const batch = Array.isArray(authUsers?.users) ? authUsers.users : [];
        authUserList.push(...batch);

        if (batch.length < AUTH_PAGE_SIZE) break;
      }

      const userIds = authUserList.map((u) => u.id);

      if (userIds.length === 0) return res.json({ data: [] });

      // Chunked because .in() interpolates every id into the query string, and a
      // few thousand UUIDs exceeds what the server will accept as a URL.
      const PROFILE_CHUNK = 200;
      const profileRows = [];

      for (let i = 0; i < userIds.length; i += PROFILE_CHUNK) {
        const { data: chunk, error: profileError } = await supabase
          .from('users')
          .select('id, name, email, role, created_at, is_active')
          .in('id', userIds.slice(i, i + PROFILE_CHUNK));

        if (profileError) return res.status(500).json({ error: profileError.message || profileError });
        if (Array.isArray(chunk)) profileRows.push(...chunk);
      }

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

      // A role change must not linger behind the auth cache TTL.
      invalidateUser(targetUserId);

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

      invalidateUser(targetUserId);

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

      // Deactivation must take effect now, not on cache expiry.
      invalidateUser(targetUserId);

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

      invalidateUser(targetUserId);

      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to reactivate user' });
    }
  }
};



