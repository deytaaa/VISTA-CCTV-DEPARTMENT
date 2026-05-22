import { useEffect, useState } from 'react'
import ProtectedRoute from '../components/ProtectedRoute'
import Layout from '../components/layout/Layout'

export default function CreateJO() {
  const [joNumber, setJoNumber] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [items, setItems] = useState([{ item_no: 1, item_name: '', reference_no: '', quantity: '' }])
  const [personnel, setPersonnel] = useState([{ personnel_no: 1, name: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const now = new Date()
    setDate(now.toISOString().slice(0, 10))
  }, [])

  useEffect(() => {
    let active = true

    async function loadJoNumber() {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || ''
        const res = await fetch(`${base}/api/jo/generate`, { method: 'POST' })
        const data = await res.json()
        if (active && data?.jo_number) {
          setJoNumber(data.jo_number)
        }
      } catch (fetchError) {
        if (active) {
          setJoNumber('JO-AUTO-GENERATED')
        }
      }
    }

    loadJoNumber()

    return () => {
      active = false
    }
  }, [])

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

  async function submitJobOrder(status) {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${base}/api/job-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jo_number: joNumber,
          date,
          location,
          status,
          items,
          personnel,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save job order')
      }

      setSuccess(status === 'draft' ? 'Job order saved as draft.' : 'Job order generated successfully.')
      if (data?.data?.jo_number) setJoNumber(data.data.jo_number)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'dispatcher', 'supervisor']}>
      <Layout title="Create Job Order">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="border-b border-gray-100 pb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">Create Job Order</p>
            </div>

            {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            {success ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">JO Number</label>
                <input value={joNumber} readOnly className="w-full border-0 bg-transparent text-sm font-semibold text-black outline-none" />
                <p className="mt-2 text-xs text-gray-500">AUTO-GENERATED - READ ONLY</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Date</label>
                <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black" />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Location</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} type="text" placeholder="Enter location" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none placeholder:text-gray-400 focus:border-black" />
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
                    <input type="number" min="0" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black" />
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
