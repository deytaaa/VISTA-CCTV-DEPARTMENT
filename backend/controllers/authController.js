const supabase = require('../lib/supabase');

module.exports = {
  login: async (req, res) => {
    return res.status(501).json({ error: 'Not implemented: login (use frontend Supabase auth)' });
  },

  register: async (req, res) => {
    try {
      const { email, password, name, role } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'email and password required' });

      // Create user via admin API (requires service role key)
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { name }
      });
      if (error) return res.status(500).json({ error: error.message || error });

      // Optionally set role in public.users (trigger may have created the profile row)
      if (role) {
        await supabase.from('users').update({ role }).eq('id', data.user.id);
      }

      return res.status(201).json({ user: data.user });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to register user' });
    }
  },

  me: async (req, res) => {
    try {
      if (!req.user || !req.user.id) return res.status(401).json({ error: 'Not authenticated' });
      return res.json({
        user: req.user,
        authUser: req.authUser,
        sessionTokenPresent: Boolean(req.sessionToken),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  },

  session: async (req, res) => {
    try {
      if (!req.authUser) return res.status(401).json({ error: 'Not authenticated' });

      return res.json({
        tokenPresent: Boolean(req.sessionToken),
        tokenPreview: req.sessionToken ? `${req.sessionToken.slice(0, 12)}...` : null,
        authUser: {
          id: req.authUser.id,
          email: req.authUser.email,
          email_confirmed_at: req.authUser.email_confirmed_at,
          last_sign_in_at: req.authUser.last_sign_in_at,
        },
        profile: req.authProfile,
        user: req.user,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to inspect session' });
    }
  },
};
