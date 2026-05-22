import { useEffect, useState } from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFDownloadLink } from '@react-pdf/renderer'
import ProtectedRoute from '../../../components/ProtectedRoute'

const styles = StyleSheet.create({
  page: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 6 }
})

function JOReport({ jo }){
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text>City Government of Taguig</Text>
            <Text>CCTV Department</Text>
          </View>
          <View>
            <Text>JO No: {jo.jo_number}</Text>
            <Text>Date: {jo.date}</Text>
            <Text>Location: {jo.location}</Text>
          </View>
        </View>

        <View>
          <Text>Table 1 — Supplies & Equipment</Text>
          {jo.items.map((it, i)=> (
            <View key={i} style={styles.tableRow}>
              <Text>{i+1}. {it.item_name} — Ref: {it.reference_no} — Qty: {it.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 20 }}>
          <Text>Table 2 — Personnel</Text>
          {jo.personnel.map((p,i)=>(
            <View key={i} style={styles.tableRow}>
              <Text>{i+1}. {p.name}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 40 }}>
          <Text>Signatory: ___________________________</Text>
        </View>
      </Page>
    </Document>
  )
}

export default function JoPdfPage({ query }){
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Placeholder JO — in production fetch JO by id
  const jo = {
    jo_number: 'JO-2026-0001',
    date: new Date().toLocaleDateString(),
    location: 'Sample Location',
    items: [ { item_name: 'CCTV Camera', reference_no: 'REF-001', quantity: 2 } ],
    personnel: [ { name: 'Technician A' } ]
  }
  return (
    <ProtectedRoute>
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">JO PDF Preview</h1>
      {isClient ? (
        <PDFDownloadLink document={<JOReport jo={jo} />} fileName={`${jo.jo_number}.pdf`}>
          {({ loading }) => (loading ? 'Preparing document...' : <button className="px-3 py-2 bg-taguigRed text-white rounded">Download PDF</button>)}
        </PDFDownloadLink>
      ) : (
        <button className="px-3 py-2 bg-gray-400 text-white rounded" disabled>
          Download PDF
        </button>
      )}
    </div>
    </ProtectedRoute>
  )
}
