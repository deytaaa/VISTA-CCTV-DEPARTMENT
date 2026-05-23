import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { pdf } from '@react-pdf/renderer'
import { supabase } from '../../../lib/supabaseClient'
import JODocument from '../../../components/pdf/JODocument'

export default function PDFDownloadPage() {
  const router = useRouter()
  const { id } = router.query
  const [status, setStatus] = useState('Loading...')

  useEffect(() => {
    if (!id) return

    async function generateAndDownload() {
      try {
        setStatus('Fetching job order...')

        const { data, error } = await supabase
          .from('job_orders')
          .select(`
            *,
            items:job_order_items(*),
            personnel:job_order_personnel(*)
          `)
          .eq('id', id)
          .single()

        if (error || !data) {
          setStatus('Error: Job order not found.')
          return
        }

        setStatus('Generating PDF...')

        const blob = await pdf(<JODocument jobOrder={data} />).toBlob()
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = `${data.jo_number}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        setStatus('Download started! You can close this page.')
      } catch (err) {
        console.error(err)
        setStatus('Error generating PDF. Please try again.')
      }
    }

    generateAndDownload()
  }, [id])

  return (
    <div
      style={{
        padding: 40,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        marginTop: 100,
      }}
    >
      <h2>JO PDF Download</h2>
      <p>{status}</p>
    </div>
  )
}