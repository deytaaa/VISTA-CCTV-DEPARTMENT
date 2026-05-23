import { useEffect, useState } from 'react'
import ProtectedRoute from '../components/ProtectedRoute'
import Layout from '../components/layout/Layout'
import { useAuth } from '../context/AuthContext'

export default function CreateJO() {
  const { session, user } = useAuth()
  const [joNumber, setJoNumber] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [items, setItems] = useState([{ item_no: 1, item_name: '', reference_no: '', quantity: '' }])
  const [personnel, setPersonnel] = useState([{ personnel_no: 1, name: '' }])
  const [technicians, setTechnicians] = useState([])
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('')
  const [techniciansLoading, setTechniciansLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState({ visible: false, exiting: false, joNumber: '' })

  useEffect(() => {
    const now = new Date()
    setDate(now.toISOString().slice(0, 10))
  }, [])

  async function loadNextJoNumber() {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${base}/api/jo/next-number`)
      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to load next JO number')
      }

      setJoNumber(payload?.jo_number || '')
    } catch (fetchError) {
      setJoNumber('')
    }
  }

  useEffect(() => {
    loadNextJoNumber()
  }, [])

  useEffect(() => {
    let active = true

    async function loadTechnicians() {
      try {
        if (!session?.access_token) return

        setTechniciansLoading(true)

        const base = process.env.NEXT_PUBLIC_API_URL || ''
        const res = await fetch(`${base}/api/users/technicians`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        const payload = await res.json()

        if (!res.ok) {
          throw new Error(payload?.error || 'Failed to load technicians')
        }

        if (!active) return

        const list = Array.isArray(payload?.data) ? payload.data : []
        setTechnicians(list)
      } catch (fetchError) {
        if (active) {
          setError(fetchError.message)
        }
      } finally {
        if (active) setTechniciansLoading(false)
      }
    }

    loadTechnicians()

    return () => {
      active = false
    }
  }, [session?.access_token])

  const addItem = () => setItems([...items, { item_no: items.length + 1, item_name: '', reference_no: '', quantity: '' }])
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))
  const addPerson = () => setPersonnel([...personnel, { personnel_no: personnel.length + 1, name: '' }])
  const removePerson = (i) => setPersonnel(personnel.filter((_, idx) => idx !== i))

  function updateItem(index, field, value) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))
  }

  function updatePerson(index, value) {
    setPersonnel((current) => current.map((person, personIndex) => (personIndex === index ? { ...person, name: value } : person)))
  }

  function resetForm() {
    setJoNumber('')
    setDate('')
    setLocation('')
    setItems([{ item_no: 1, item_name: '', reference_no: '', quantity: '' }])
    setPersonnel([{ personnel_no: 1, name: '' }])
    setSelectedTechnicianId('')
  }

  useEffect(() => {
    if (!toast.visible) return

    const exitTimer = setTimeout(() => {
      setToast((current) => ({ ...current, exiting: true }))
    }, 5000)

    const resetTimer = setTimeout(() => {
      setToast({ visible: false, exiting: false, joNumber: '' })
      resetForm()
      void loadNextJoNumber()
    }, 5300)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(resetTimer)
    }
  }, [toast.visible, toast.joNumber])

  async function submitJobOrder(status) {
    setError('')
    setLoading(true)

    if (!selectedTechnicianId) {
      setError('Please assign this job order to a technician.')
      setLoading(false)
      return
    }

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || ''
      const headers = { 'Content-Type': 'application/json' }

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      let joNumberForSubmit = null

      // Generate JO number only when actually generating a JO (not on page load/drafts).
      if (status === 'sent') {
        const genRes = await fetch(`${base}/api/jo/generate`, {
          method: 'POST',
          headers,
        })

        const genPayload = await genRes.json()
        if (!genRes.ok || !genPayload?.jo_number) {
          throw new Error(genPayload?.error || 'Failed to generate JO number')
        }

        joNumberForSubmit = genPayload.jo_number
      }

      const res = await fetch(`${base}/api/job-orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jo_number: joNumberForSubmit,
          date,
          location,
          status,
          sender_id: user?.id || null,
          receiver_id: selectedTechnicianId,
          items,
          personnel,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save job order')
      }

      const savedJoNumber = data?.data?.jo_number || ''
      setJoNumber(savedJoNumber)

      if (status === 'sent') {
        setToast({ visible: true, exiting: false, joNumber: savedJoNumber })
      }
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'dispatcher']}>
      <Layout title="Create Job Order">
        {toast.visible || toast.exiting ? (
          <div className="fixed right-4 top-4 z-50 w-[320px] max-w-[calc(100vw-2rem)]">
            <div
              className={`rounded-2xl border-l-4 border-l-[#10B981] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out ${
                toast.exiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
              }`}
            >
              <p className="text-sm font-bold text-black">✅ Job Order Generated</p>
              <p className="mt-1 text-2xl font-black tracking-tight text-[#CC0000]">{toast.joNumber}</p>
              <p className="mt-1 text-xs font-medium text-gray-500">Sent to technician.</p>
            </div>
          </div>
        ) : null}

        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="border-b border-gray-100 pb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">Create Job Order</p>
            </div>

            {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <div className="mt-6 grid gap-5 lg:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">JO Number</label>
                <input value={joNumber} readOnly placeholder="Will be assigned on submit" className="w-full border-0 bg-transparent text-sm font-semibold text-black outline-none placeholder:text-gray-400" />
                <p className="mt-2 text-xs text-gray-500">AUTO-GENERATED ON SUBMIT</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Date</label>
                <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black" />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Location</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} type="text" placeholder="Enter location" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none placeholder:text-gray-400 focus:border-black" />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Assign To</label>
                <select
                  value={selectedTechnicianId}
                  onChange={(e) => setSelectedTechnicianId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black"
                  disabled={techniciansLoading}
                >
                  <option value="">{techniciansLoading ? 'Loading technicians...' : 'Select a technician'}</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name || technician.email} ({technician.email})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">Choose the technician who will receive this job order.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-black">Supplies & Equipment</h3>
                <p className="text-sm text-gray-600">Add the required items and quantities for the dispatch.</p>
              </div>
              <button type="button" onClick={addItem} className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-50">
                + Add Item
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <div className="grid grid-cols-[72px_1fr_180px_120px_72px] bg-[#fff3f3] px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-gray-600">
                <div>No.</div>
                <div>Item Name</div>
                <div>Ref No.</div>
                <div>Qty</div>
                <div></div>
              </div>

              <div className="divide-y divide-gray-100 bg-white">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[72px_1fr_180px_120px_72px] items-center gap-3 px-4 py-3">
                    <div className="text-sm font-semibold text-gray-500">{index + 1}</div>
                    <input value={item.item_name} onChange={(e) => updateItem(index, 'item_name', e.target.value)} placeholder="Enter item name" className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-black" />
                    <input value={item.reference_no} onChange={(e) => updateItem(index, 'reference_no', e.target.value)} placeholder="Reference no." className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-black" />
                    <input type="number" min="0" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} placeholder="0" className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-black" />
                    <button type="button" onClick={() => removeItem(index)} className="mx-auto rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-500 transition hover:border-red-200 hover:text-red-700" aria-label={`Remove item ${index + 1}`}>
                      -
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-black">Personnel / Job Description</h3>
                <p className="text-sm text-gray-600">List the personnel assigned to the job order.</p>
              </div>
              <button type="button" onClick={addPerson} className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-50">
                + Add Person
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <div className="grid grid-cols-[72px_1fr_72px] bg-[#fff3f3] px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-gray-600">
                <div>No.</div>
                <div>Name</div>
                <div></div>
              </div>

              <div className="divide-y divide-gray-100 bg-white">
                {personnel.map((person, index) => (
                  <div key={index} className="grid grid-cols-[72px_1fr_72px] items-center gap-3 px-4 py-3">
                    <div className="text-sm font-semibold text-gray-500">{index + 1}</div>
                    <input value={person.name} onChange={(e) => updatePerson(index, e.target.value)} placeholder="Enter person name" className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-black" />
                    <button type="button" onClick={() => removePerson(index)} className="mx-auto rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-500 transition hover:border-red-200 hover:text-red-700" aria-label={`Remove person ${index + 1}`}>
                      -
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-end">
            <button type="button" onClick={() => submitJobOrder('draft')} disabled={loading} className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Saving...' : 'Save as Draft'}
            </button>
            <button type="button" onClick={() => submitJobOrder('sent')} disabled={loading} className="rounded-2xl bg-taguigRed px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/10 transition hover:bg-taguigDark disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Generating...' : 'Generate JO'}
            </button>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
