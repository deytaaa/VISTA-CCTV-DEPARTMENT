import { useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '../components/ProtectedRoute'
import Layout from '../components/layout/Layout'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

const ROLE_OPTIONS = ['admin', 'technician', 'inventory', '']

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(d)
}

function normalizeEmail(v) {
  return String(v || '').trim().toLowerCase()
}

function ModalShell({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-black">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-black"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { session, user, role, loading: authLoading } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [fetchError, setFetchError] = useState(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')



  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'technician' })
  const [createSaving, setCreateSaving] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ id: null, name: '', role: '' })
  const [editSaving, setEditSaving] = useState(false)

  const [resetOpen, setResetOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetSaving, setResetSaving] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteSaving, setDeleteSaving] = useState(false)

  const [reactivateOpen, setReactivateOpen] = useState(false)
  const [reactivateTarget, setReactivateTarget] = useState(null)
  const [reactivateSaving, setReactivateSaving] = useState(false)

  const [inactiveUsers, setInactiveUsers] = useState([])
  const [inactiveLoading, setInactiveLoading] = useState(false)
  const [inactiveError, setInactiveError] = useState(null)
  const [reactivateSavingId, setReactivateSavingId] = useState(null)


  const authHeaders = useMemo(() => {
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  }, [session?.access_token])

  async function loadUsers() {
    if (!session?.access_token) return
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, { headers: authHeaders })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'Failed to load users')
      setUsers(Array.isArray(payload?.data) ? payload.data : [])
    } catch (e) {
      setFetchError(e.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  const filteredUsers = useMemo(() => {
    const s = search.trim().toLowerCase()
    return users.filter((u) => {
      const matchesSearch =
        !s ||
        String(u?.name || '').toLowerCase().includes(s) ||
        normalizeEmail(u?.email).includes(s) ||
        String(u?.role || '').toLowerCase().includes(s)

      const matchesRole = !roleFilter || String(u?.role || '') === roleFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && Boolean(u?.is_active) === true) ||
        (statusFilter === 'inactive' && Boolean(u?.is_active) === false)
      return matchesSearch && matchesRole && matchesStatus

    })
  }, [users, search, roleFilter, statusFilter])

  function openCreate() {
    setCreateForm({ name: '', email: '', password: '', role: 'technician' })
    setCreateOpen(true)
  }

  function openEdit(u) {
    setEditForm({ id: u.id, name: u.name || '', role: u.role || '' })
    setEditOpen(true)
  }

  function openReset(u) {
    setResetTarget(u)
    setResetPassword('')
    setResetOpen(true)
  }

  function openDelete(u) {
    setDeleteTarget(u)
    setDeleteOpen(true)
  }

  function openReactivate(u) {
    setReactivateTarget(u)
    setReactivateOpen(true)
  }

  async function handleCreate() {
    const name = createForm.name.trim()
    const email = createForm.email.trim()
    const password = createForm.password
    const roleValue = createForm.role

    if (!name || !email || !password || !roleValue) {
      setToast({ type: 'error', message: 'Name, Email, Password, and Role are required.' })
      return
    }

    setCreateSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ name, email, password, role: roleValue }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'Failed to create user')

      setCreateOpen(false)
      setToast({ type: 'success', message: 'User created.' })
      await loadUsers()
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'Failed to create user' })
    } finally {
      setCreateSaving(false)
    }
  }

  async function handleEdit() {
    const name = editForm.name.trim()
    const roleValue = editForm.role

    if (!name || !roleValue) {
      setToast({ type: 'error', message: 'Name and Role are required.' })
      return
    }

    setEditSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ name, role: roleValue }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'Failed to update user')

      setEditOpen(false)
      setToast({ type: 'success', message: 'User updated.' })
      await loadUsers()
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'Failed to update user' })
    } finally {
      setEditSaving(false)
    }
  }

  async function handleResetPassword() {
    if (!resetTarget?.id) return

    if (!resetPassword || String(resetPassword).length < 6) {
      setToast({ type: 'error', message: 'New password is required (min 6 chars).' })
      return
    }

    setResetSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${resetTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ password: resetPassword }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'Failed to reset password')

      setResetOpen(false)
      setToast({ type: 'success', message: 'Password reset successfully.' })
      await loadUsers()
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'Failed to reset password' })
    } finally {
      setResetSaving(false)
    }
  }

  async function handleReactivate() {
    if (!reactivateTarget?.id) return

    setReactivateSaving(true)
    setToast(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${reactivateTarget.id}/reactivate`, {
        method: 'POST',
        headers: authHeaders,
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'Failed to reactivate user')

      setReactivateOpen(false)
      setReactivateTarget(null)
      setToast({ type: 'success', message: 'User reactivated.' })
      await loadUsers()
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'Failed to reactivate user' })
    } finally {
      setReactivateSaving(false)
    }
  }

  async function handleDelete() {

    if (!deleteTarget?.id) return

    if (user?.id && String(deleteTarget.id) === String(user.id)) {
      setToast({ type: 'error', message: 'You cannot deactivate your own account.' })

      return
    }

    setDeleteSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'Failed to delete user')

      setDeleteOpen(false)
      setDeleteTarget(null)
      setToast({ type: 'success', message: 'User deleted.' })
      await loadUsers()
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'Failed to delete user' })
    } finally {
      setDeleteSaving(false)
    }
  }

  const isSelfTargetDelete = Boolean(user?.id && deleteTarget?.id && String(user.id) === String(deleteTarget.id))

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Layout title="Users" subtitle="User Management" >
        <div className="mx-auto max-w-6xl space-y-6">
          {toast ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                toast.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {toast.message}
            </div>
          ) : null}

          {fetchError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {fetchError}
            </div>
          ) : null}

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
              <div className="flex-1 sm:flex-none sm:w-auto">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Search</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, role..."
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                />
              </div>
              <div className="sm:w-48">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="">All Roles</option>
                  {ROLE_OPTIONS.filter(Boolean).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:w-48">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                  }}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setRoleFilter('')
                  setStatusFilter('all')
                }}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-black hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="ml-auto rounded-2xl bg-taguigRed px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/10 hover:bg-taguigDark"
              >
                Add New User
              </button>
            </div>
          </div>

          <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <p style={{ color: 'red' }}>
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#FFF0F0] text-gray-700">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created At</th>
                    <th className="px-4 py-3">Actions</th>

                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-4 py-4 text-gray-500" colSpan={6}>
                        Loading...
                      </td>
                    </tr>

                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-gray-500" colSpan={5}>
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="border-t border-gray-100 align-top">
                        <td className="px-4 py-3 font-medium text-black">{u.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{u.email || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{u.role || '—'}</td>
                        <td className="px-4 py-3">
                          {Boolean(u?.is_active) ? (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-600">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{formatDate(u.created_at)}</td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(u)}
                              className="rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-black hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            {Boolean(u?.is_active) ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openReset(u)}
                                  className="rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-black hover:bg-gray-50"
                                >
                                  Reset Password
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDelete(u)}
                                  disabled={Boolean(user?.id && String(user.id) === String(u.id))}
                                  className="rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Deactivate
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openReactivate(u)}
                                className="rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-black hover:bg-gray-50"
                              >
                                Reactivate
                              </button>
                            )}


                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {createOpen ? (
          <ModalShell
            title="Create New User"
            subtitle="Add a new user profile and auth account."
            onClose={() => setCreateOpen(false)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Name</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((c) => ({ ...c, name: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Email</label>
                <input
                  value={createForm.email}
                  onChange={(e) => setCreateForm((c) => ({ ...c, email: e.target.value }))}
                  type="email"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((c) => ({ ...c, role: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="admin">admin</option>
                  <option value="technician">technician</option>
                  <option value="inventory">inventory</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Password</label>
                <input
                  value={createForm.password}
                  onChange={(e) => setCreateForm((c) => ({ ...c, password: e.target.value }))}
                  type="password"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                />
                <p className="mt-2 text-xs text-gray-500">Minimum 6 characters.</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-black hover:bg-gray-50"
                disabled={createSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createSaving}
                className="rounded-2xl bg-taguigRed px-5 py-3 text-sm font-semibold text-white hover:bg-taguigDark disabled:opacity-60"
              >
                {createSaving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </ModalShell>
        ) : null}

        {editOpen ? (
          <ModalShell title="Edit User" subtitle="Update name and role." onClose={() => setEditOpen(false)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((c) => ({ ...c, role: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="admin">admin</option>
                  <option value="technician">technician</option>
                  <option value="inventory">inventory</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-black hover:bg-gray-50"
                disabled={editSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEdit}
                disabled={editSaving}
                className="rounded-2xl bg-taguigRed px-5 py-3 text-sm font-semibold text-white hover:bg-taguigDark disabled:opacity-60"
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </ModalShell>
        ) : null}

        {resetOpen && resetTarget ? (
          <ModalShell
            title="Reset User Password"
            subtitle={`Reset password for ${resetTarget.name || resetTarget.email || 'user'}.`}
            onClose={() => setResetOpen(false)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">New Password</label>
                <input
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  type="password"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                />
                <p className="mt-2 text-xs text-gray-500">Minimum 6 characters.</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setResetOpen(false)}
                className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-black hover:bg-gray-50"
                disabled={resetSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetSaving}
                className="rounded-2xl bg-taguigRed px-5 py-3 text-sm font-semibold text-white hover:bg-taguigDark disabled:opacity-60"
              >
                {resetSaving ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </ModalShell>
        ) : null}

        {reactivateOpen && reactivateTarget ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
              <h3 className="text-xl font-black text-black">Reactivate User</h3>

              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to reactivate <span className="font-semibold text-black">{reactivateTarget.name || reactivateTarget.email}</span>? They will be able to log in again.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setReactivateOpen(false)
                    setReactivateTarget(null)
                  }}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-black hover:bg-gray-50"
                  disabled={reactivateSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReactivate}
                  disabled={reactivateSaving}
                  className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                >
                  {reactivateSaving ? 'Reactivating...' : 'Reactivate'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {deleteOpen && deleteTarget ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
              <h3 className="text-xl font-black text-black">Deactivate User</h3>

              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to deactivate <span className="font-semibold text-black">{deleteTarget.name || deleteTarget.email}</span>? They will no longer be able to log in. You can reactivate them later.
              </p>

              {isSelfTargetDelete ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                  You cannot deactivate your own account.
                </div>
              ) : null}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteOpen(false)
                    setDeleteTarget(null)
                  }}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-black hover:bg-gray-50"
                  disabled={deleteSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteSaving || isSelfTargetDelete}
                  className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  {deleteSaving ? 'Deactivating...' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Layout>
    </ProtectedRoute>
  )
}

