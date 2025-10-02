import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  headerLeft: {
    width: '45%',
  },
  headerRight: {
    width: '45%',
  },
  label: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  text: {
    fontSize: 10,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: '35%',
    fontSize: 9,
    color: '#666',
  },
  infoValue: {
    width: '65%',
    fontSize: 9,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 8,
    fontSize: 9,
  },
  col1: { width: '10%' },
  col2: { width: '25%' },
  col3: { width: '8%', textAlign: 'right' },
  col4: { width: '8%' },
  col5: { width: '12%', textAlign: 'right' },
  col6: { width: '8%', textAlign: 'right' },
  col7: { width: '8%', textAlign: 'right' },
  col8: { width: '15%', textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    padding: 8,
    fontSize: 10,
    fontWeight: 'bold',
  },
  totalLabel: {
    width: '85%',
    textAlign: 'right',
    paddingRight: 10,
  },
  totalValue: {
    width: '15%',
    textAlign: 'right',
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  notes: {
    marginTop: 20,
    fontSize: 9,
    color: '#666',
    fontStyle: 'italic',
  },
});

export type InvoiceData = {
  fd: {
    name: string;
    vat: string;
    address: string;
    contact: string;
    iban: string;
    bic: string;
  };
  insurer: {
    name: string;
    address: string;
    contact: string;
  };
  invoice: {
    number: string;
    date: string;
    due_date: string;
    currency: string;
    payment_terms_days: number;
    notes: string | null;
  };
  dossier: {
    display_id: string;
    deceased_name: string;
    flow_type: string;
    policy_ref: string;
  };
  items: {
    code: string;
    description: string;
    qty: number;
    unit: string;
    unit_price_ex_vat: number;
    discount_pct: number;
    vat_pct: number;
    amount_ex_vat?: number;
    vat_amount?: number;
    amount_inc_vat?: number;
  }[];
  totals?: {
    subtotal_ex_vat: number;
    vat_amount: number;
    total_inc_vat: number;
    vat_rate_caption: string;
  };
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('nl-NL');
};

export const InvoicePDF = ({ data }: { data: InvoiceData }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.text}>{data.fd.name}</Text>
            <Text style={styles.text}>BTW {data.fd.vat}</Text>
            <Text style={styles.text}>{data.fd.address}</Text>
            <Text style={styles.text}>{data.fd.contact}</Text>
            <Text style={styles.text}>IBAN {data.fd.iban}  BIC {data.fd.bic}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.label}>Te factureren aan</Text>
            <Text style={styles.text}>{data.insurer.name}</Text>
            <Text style={styles.text}>{data.insurer.address}</Text>
            <Text style={styles.text}>{data.insurer.contact}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Factuur</Text>

        {/* Invoice Details */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Factuurnummer:</Text>
            <Text style={styles.infoValue}>{data.invoice.number}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Factuurdatum:</Text>
            <Text style={styles.infoValue}>{formatDate(data.invoice.date)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vervaldatum:</Text>
            <Text style={styles.infoValue}>{formatDate(data.invoice.due_date)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dossier-ID:</Text>
            <Text style={styles.infoValue}>{data.dossier.display_id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Overledene:</Text>
            <Text style={styles.infoValue}>{data.dossier.deceased_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Uitvaarttype:</Text>
            <Text style={styles.infoValue}>{data.dossier.flow_type}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Polisreferentie:</Text>
            <Text style={styles.infoValue}>{data.dossier.policy_ref}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Code</Text>
            <Text style={styles.col2}>Omschrijving</Text>
            <Text style={styles.col3}>Aantal</Text>
            <Text style={styles.col4}>Eenheid</Text>
            <Text style={styles.col5}>Prijs (€)</Text>
            <Text style={styles.col6}>Kort. %</Text>
            <Text style={styles.col7}>BTW %</Text>
            <Text style={styles.col8}>Bedrag (€)</Text>
          </View>
          {data.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.col1}>{item.code}</Text>
              <Text style={styles.col2}>{item.description}</Text>
              <Text style={styles.col3}>{item.qty}</Text>
              <Text style={styles.col4}>{item.unit}</Text>
              <Text style={styles.col5}>{formatCurrency(item.unit_price_ex_vat)}</Text>
              <Text style={styles.col6}>{item.discount_pct}</Text>
              <Text style={styles.col7}>{item.vat_pct}</Text>
              <Text style={styles.col8}>{formatCurrency(item.amount_ex_vat || 0)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        {data.totals && (
          <>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotaal (excl. BTW)</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.totals.subtotal_ex_vat)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>BTW {data.totals.vat_rate_caption}</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.totals.vat_amount)}</Text>
            </View>
            <View style={[styles.totalRow, { fontSize: 12, backgroundColor: '#f0f0f0', marginTop: 5 }]}>
              <Text style={styles.totalLabel}>Totaal (incl. BTW)</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.totals.total_inc_vat)}</Text>
            </View>
          </>
        )}

        {/* Payment Instructions */}
        <View style={styles.footer}>
          <Text style={styles.sectionTitle}>Betaalinstructies</Text>
          <Text style={styles.text}>
            Gelieve het totaalbedrag te voldoen binnen {data.invoice.payment_terms_days} dagen na factuurdatum.
          </Text>
          <Text style={styles.text}>
            Vermeld bij betaling: Factuurnummer {data.invoice.number} en Dossier {data.dossier.display_id}.
          </Text>
          <Text style={styles.text}>
            IBAN: {data.fd.iban} • BIC: {data.fd.bic}
          </Text>
        </View>

        {/* Notes */}
        {data.invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.sectionTitle}>Opmerking</Text>
            <Text>{data.invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};
