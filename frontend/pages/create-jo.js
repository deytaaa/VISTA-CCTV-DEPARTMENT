import { useState } from 'react'
import ProtectedRoute from '../components/ProtectedRoute'

export default function CreateJO() {
  const [items, setItems] = useState([{ item_no: 1, item_name: '', reference_no: '', quantity: 1 }]);
  const [personnel, setPersonnel] = useState([{ personnel_no: 1, name: '' }]);
  const addItem = () => setItems([...items, { item_no: items.length+1, item_name: '', reference_no: '', quantity: 1 }]);
  const removeItem = (i) => setItems(items.filter((_,idx)=>idx!==i));
  const addPerson = () => setPersonnel([...personnel, { personnel_no: personnel.length+1, name: '' }]);
  const removePerson = (i) => setPersonnel(personnel.filter((_,idx)=>idx!==i));

  async function handleGenerate(e){
    e.preventDefault();
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const res = await fetch(`${base}/api/jo/generate`, { method: 'POST' });
    const data = await res.json();
    alert('Generated JO: ' + (data.jo_number || 'error'));
  }

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-lightGrayBg p-6">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Create Job Order</h2>
        <form onSubmit={handleGenerate}>
          <label className="block mb-2">Location</label>
          <input className="w-full p-2 border rounded mb-4" name="location" />

          <h3 className="font-semibold">Supplies & Equipment</h3>
          {items.map((it, i)=> (
            <div key={i} className="flex gap-2 mb-2">
              <input value={it.item_name} onChange={e=>{
                const clone=[...items]; clone[i].item_name=e.target.value; setItems(clone);
              }} placeholder="Item name" className="flex-1 p-2 border rounded" />
              <input value={it.reference_no} onChange={e=>{
                const clone=[...items]; clone[i].reference_no=e.target.value; setItems(clone);
              }} placeholder="Ref No." className="w-32 p-2 border rounded" />
              <input type="number" value={it.quantity} onChange={e=>{
                const clone=[...items]; clone[i].quantity=e.target.value; setItems(clone);
              }} className="w-24 p-2 border rounded" />
              <button type="button" onClick={()=>removeItem(i)} className="px-2 bg-gray-200 rounded">-</button>
            </div>
          ))}
          <button type="button" onClick={addItem} className="px-3 py-1 bg-taguigRed text-white rounded mb-4">Add Item</button>

          <h3 className="font-semibold">Personnel / Job Description</h3>
          {personnel.map((p,i)=>(
            <div key={i} className="flex gap-2 mb-2">
              <input value={p.name} onChange={e=>{const c=[...personnel]; c[i].name=e.target.value; setPersonnel(c)}} placeholder="Name" className="flex-1 p-2 border rounded" />
              <button type="button" onClick={()=>removePerson(i)} className="px-2 bg-gray-200 rounded">-</button>
            </div>
          ))}
          <button type="button" onClick={addPerson} className="px-3 py-1 bg-taguigRed text-white rounded mb-4">Add Person</button>

          <div className="flex gap-2">
            <button className="px-4 py-2 bg-taguigRed text-white rounded">Save as Draft</button>
            <button type="submit" className="px-4 py-2 bg-taguigDark text-white rounded">Generate JO</button>
          </div>
        </form>
      </div>
    </div>
    </ProtectedRoute>
  )
}
