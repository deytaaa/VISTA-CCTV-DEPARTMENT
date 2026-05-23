require('dotenv').config();
const supabase = require('../lib/supabase');

async function run() {
  const email = process.env.SEED_TECHNICIAN_EMAIL || 'technician@taguig.gov';
  const password = process.env.SEED_TECHNICIAN_PASSWORD || 'ChangeMe123!';
  const name = process.env.SEED_TECHNICIAN_NAME || 'Technician User';
  const role = 'technician';

  console.log('Seeding technician user:', email);

  try {
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) {
      console.error('Failed to list auth users:', listError);
      process.exit(1);
    }

    const existingUser = (usersData.users || []).find((user) => user.email === email);
    let userId = null;

    if (existingUser) {
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (updateError) {
        console.error('Failed to update existing auth user:', updateError);
        process.exit(1);
      }

      userId = updatedUser.user.id;
      console.log('Updated existing auth user id:', userId);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { name },
        email_confirm: true,
      });

      if (error) {
        console.error('Failed to create auth user:', error);
        process.exit(1);
      }

      userId = data.user.id;
      console.log('Created auth user id:', userId);
    }

    const { error: upError } = await supabase.from('users').upsert({ id: userId, name, email, role });
    if (upError) {
      console.error('Failed to upsert users profile:', upError);
      process.exit(1);
    }

    console.log('Seeded technician profile with role:', role);
    console.log('Done. Please change the password immediately in production.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();