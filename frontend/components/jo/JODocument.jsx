import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const HEADER_GREEN = '#A9D18E'
const HEADER_TEXT = '#375623'
const COLUMN_GREEN = '#C6EFCE'
const BORDER = '#000000'
const SUPPLIES_WIDTHS = {
  no: 28,
  items: 139,
  description: 108,
  ref: 68,
  qty: 44,
  remarks: 148,
}
// No=28 must match, Remarks=148 must match
// Name+Nature = 535 - 28 - 148 = 359
// Name takes ~items width, Nature takes description+ref+qty
const PERSONNEL_WIDTHS = {
  no: 28,
  name: 139,
  nature: 220,
  remarks: 148,
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingRight: 30,
    paddingBottom: 30,
    paddingLeft: 30,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    lineHeight: 1.2,
  },
  headerBar: {
    backgroundColor: HEADER_GREEN,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: BORDER,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: HEADER_TEXT,
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  topMeta: {
    marginTop: 0,
    borderTopWidth: 0,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  topMetaRow: {
    flexDirection: 'row',
  },
  topMetaRowGreen: {
    backgroundColor: HEADER_GREEN,
  },
  topMetaCell: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minHeight: 20,
    justifyContent: 'center',
  },
  topMetaCellLast: {
    borderRightWidth: 0,
  },
  label: {
    fontFamily: 'Helvetica-Bold',
  },
  value: {
    fontFamily: 'Helvetica',
  },
  descriptionRow: {
    flexDirection: 'row',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderColor: BORDER,
    minHeight: 28,
    alignItems: 'stretch',
  },
  descriptionLabelCell: {
    width: 128,
    borderRightWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 6,
    paddingVertical: 5,
    justifyContent: 'center',
  },
  descriptionValueCell: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  sectionBar: {
    backgroundColor: HEADER_GREEN,
    borderWidth: 1,
    borderTopWidth: 1,
    borderColor: BORDER,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  sectionBarText: {
    color: HEADER_TEXT,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.4,
  },
  table: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLUMN_GREEN,
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 15,
  },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 3,
    paddingVertical: 1.5,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 7.2,
    color: '#000000',
  },
  headerCellText: {
    fontSize: 7.2,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
  smallCenter: {
    textAlign: 'center',
  },
  footer: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  signatureBlock: {
    width: 125,
    alignItems: 'stretch',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderColor: BORDER,
    height: 12,
  },
  signatureLabel: {
    marginTop: 3,
    textAlign: 'center',
    fontSize: 8,
    color: '#000000',
  },
})

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`
}

function Cell({ children, width, center = false, header = false, last = false, noBottom = false }) {
  return (
    <View style={[styles.cell, { width }, last ? { borderRightWidth: 0 } : null, noBottom ? { borderBottomWidth: 0 } : null]}>
      <Text style={[header ? styles.headerCellText : styles.cellText, center ? styles.smallCenter : null]}>{children}</Text>
    </View>
  )
}

function HeaderCell({ children, width, center = true, last = false }) {
  return <Cell width={width} center={center} header last={last}>{children}</Cell>
}

function TableRow({ columns, noBottom = false }) {
  return (
    <View style={[styles.tableRow, noBottom ? { borderBottomWidth: 0 } : null]}>
      {columns.map((column, index) => (
        <Cell
          key={`${column.key}-${index}`}
          width={column.width}
          center={column.center}
          last={index === columns.length - 1}
          noBottom={noBottom}
        >
          {column.value}
        </Cell>
      ))}
    </View>
  )
}

export default function JODocument({ jobOrder }) {
  const items = Array.isArray(jobOrder?.items)
    ? jobOrder.items.slice(0, 20)
    : Array.isArray(jobOrder?.job_order_items)
      ? jobOrder.job_order_items.slice(0, 20)
      : []
  const personnel = Array.isArray(jobOrder?.personnel)
    ? jobOrder.personnel.slice(0, 10)
    : Array.isArray(jobOrder?.job_order_personnel)
      ? jobOrder.job_order_personnel.slice(0, 10)
      : []

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>JOB ORDER</Text>
        </View>

        <View style={{
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 1,
          borderColor: BORDER,
        }}>
          {/* JO NO. row */}
          <View style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderColor: BORDER,
            minHeight: 18,
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingHorizontal: 6,
            paddingVertical: 3,
            backgroundColor: HEADER_GREEN,
          }}>
            <Text style={styles.value}>
              <Text style={styles.label}>JO NO.: </Text>
              {jobOrder?.jo_number || ''}
            </Text>
          </View>

          {/* Location and Date row */}
          <View style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderColor: BORDER,
            minHeight: 20,
          }}>
            <View style={{
              flex: 1,
              borderRightWidth: 1,
              borderColor: BORDER,
              paddingHorizontal: 6,
              paddingVertical: 4,
              justifyContent: 'center',
            }}>
              <Text style={styles.value}>
                <Text style={styles.label}>Location: </Text>
                {jobOrder?.location || ''}
              </Text>
            </View>
            <View style={{
              flex: 1,
              paddingHorizontal: 6,
              paddingVertical: 4,
              justifyContent: 'center',
            }}>
              <Text style={styles.value}>
                <Text style={styles.label}>Date: </Text>
                {formatDate(jobOrder?.date)}
              </Text>
            </View>
          </View>

          {/* Description of Work row */}
          <View style={{
            flexDirection: 'row',
            minHeight: 28,
            alignItems: 'stretch',
          }}>
            <View style={{
              borderRightWidth: 1,
              borderColor: BORDER,
              paddingHorizontal: 6,
              paddingVertical: 5,
              justifyContent: 'center',
            }}>
              <Text style={styles.label}>Description of Work:</Text>
            </View>
            <View style={{ flex: 1 }} />
          </View>
        </View>

        <View>
          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>LIST OF SUPPLIES AND EQUIPMENT NEEDED</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <HeaderCell width={SUPPLIES_WIDTHS.no}>No.</HeaderCell>
              <HeaderCell width={SUPPLIES_WIDTHS.items}>Items</HeaderCell>
              <HeaderCell width={SUPPLIES_WIDTHS.description}>Description</HeaderCell>
              <HeaderCell width={SUPPLIES_WIDTHS.ref}>Ref No.</HeaderCell>
              <HeaderCell width={SUPPLIES_WIDTHS.qty}>Qty</HeaderCell>
              <HeaderCell width={SUPPLIES_WIDTHS.remarks} last>Remarks</HeaderCell>
            </View>

            {Array.from({ length: 20 }, (_, index) => index + 1).map((rowNumber, index) => {
              const item = items[index]
              const isLastRow = index === 19

              return (
                <TableRow
                  key={`item-${rowNumber}`}
                  noBottom={false}
                  columns={[
                    { key: 'no', width: SUPPLIES_WIDTHS.no, center: true, value: rowNumber },
                    { key: 'items', width: SUPPLIES_WIDTHS.items, value: item?.item_name || '' },
                    { key: 'description', width: SUPPLIES_WIDTHS.description, value: '' },
                    { key: 'ref', width: SUPPLIES_WIDTHS.ref, value: item?.reference_no || '' },
                    { key: 'qty', width: SUPPLIES_WIDTHS.qty, center: true, value: item?.quantity ?? '' },
                    { key: 'remarks', width: SUPPLIES_WIDTHS.remarks, value: '' },
                  ]}
                />
              )
            })}
          </View>
        </View>

        <View>
          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>JOB DESCRIPTION</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <HeaderCell width={PERSONNEL_WIDTHS.no}>No.</HeaderCell>
              <HeaderCell width={PERSONNEL_WIDTHS.name}>Name</HeaderCell>
              <HeaderCell width={PERSONNEL_WIDTHS.nature}>Nature of Work</HeaderCell>
              <HeaderCell width={PERSONNEL_WIDTHS.remarks} last>Remarks</HeaderCell>
            </View>

            {Array.from({ length: 10 }, (_, index) => index + 1).map((rowNumber, index) => {
              const person = personnel[index]

              return (
                <TableRow
                  key={`person-${rowNumber}`}
                  noBottom={false}
                  columns={[
                    { key: 'no', width: PERSONNEL_WIDTHS.no, center: true, value: rowNumber },
                    { key: 'name', width: PERSONNEL_WIDTHS.name, value: person?.name || '' },
                    { key: 'nature', width: PERSONNEL_WIDTHS.nature, value: '' },
                    { key: 'remarks', width: PERSONNEL_WIDTHS.remarks, value: '' },
                  ]}
                />
              )
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Signatory</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}