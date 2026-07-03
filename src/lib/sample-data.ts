export type PaymentStatus = "paid" | "partial" | "unpaid" | "overpaid";

export interface Vendor {
  id: string;
  name: string;
  shop: string;
  phone: string;
  section: string;
  virtualAccount: string;
  due: number;
  paid: number;
  status: PaymentStatus;
}

export const ORG_NAME = "Ariaria Market Association";

export const vendors: Vendor[] = [
  { id: "V-1042", name: "Chinedu Okafor", shop: "B-12", phone: "+234 803 412 9087", section: "Textile Line", virtualAccount: "9032 4410 88", due: 18000, paid: 18000, status: "paid" },
  { id: "V-1043", name: "Aisha Bello", shop: "C-04", phone: "+234 811 220 0098", section: "Provisions", virtualAccount: "9032 4410 89", due: 18000, paid: 10000, status: "partial" },
  { id: "V-1044", name: "Emeka Nwosu", shop: "A-21", phone: "+234 802 119 6633", section: "Electronics", virtualAccount: "9032 4410 90", due: 24000, paid: 0, status: "unpaid" },
  { id: "V-1045", name: "Funmi Adeyemi", shop: "D-09", phone: "+234 805 720 1144", section: "Cosmetics", virtualAccount: "9032 4410 91", due: 18000, paid: 22000, status: "overpaid" },
  { id: "V-1046", name: "Ibrahim Musa", shop: "E-17", phone: "+234 706 553 8821", section: "Grains", virtualAccount: "9032 4410 92", due: 15000, paid: 15000, status: "paid" },
  { id: "V-1047", name: "Ngozi Eze", shop: "B-08", phone: "+234 818 442 1109", section: "Textile Line", virtualAccount: "9032 4410 93", due: 18000, paid: 5000, status: "partial" },
  { id: "V-1048", name: "Tunde Bakare", shop: "F-02", phone: "+234 803 008 7766", section: "Hardware", virtualAccount: "9032 4410 94", due: 20000, paid: 0, status: "unpaid" },
  { id: "V-1049", name: "Halima Yusuf", shop: "C-15", phone: "+234 909 117 4422", section: "Provisions", virtualAccount: "9032 4410 95", due: 18000, paid: 18000, status: "paid" },
  { id: "V-1050", name: "Olu Adebayo", shop: "A-10", phone: "+234 812 661 2200", section: "Electronics", virtualAccount: "9032 4410 96", due: 24000, paid: 24000, status: "paid" },
  { id: "V-1051", name: "Kemi Lawal", shop: "D-14", phone: "+234 803 222 6655", section: "Cosmetics", virtualAccount: "9032 4410 97", due: 18000, paid: 12000, status: "partial" },
];

export const orgStats = {
  totalVendors: 1248,
  expected: 22_464_000,
  collected: 17_810_500,
  outstanding: 4_653_500,
  paid: 812,
  partial: 264,
  unpaid: 152,
  overpaid: 20,
};

export const recentPayments = [
  { id: "TXN-90211", vendor: "Chinedu Okafor", account: "9032 4410 88", amount: 18000, category: "Monthly Levy", date: "Today, 10:42", status: "Matched" },
  { id: "TXN-90210", vendor: "Funmi Adeyemi", account: "9032 4410 91", amount: 22000, category: "Monthly Levy", date: "Today, 09:31", status: "Overpaid" },
  { id: "TXN-90209", vendor: "Aisha Bello", account: "9032 4410 89", amount: 10000, category: "Monthly Levy", date: "Yesterday", status: "Partial" },
  { id: "TXN-90208", vendor: "Olu Adebayo", account: "9032 4410 96", amount: 24000, category: "Monthly Levy", date: "Yesterday", status: "Matched" },
  { id: "TXN-90207", vendor: "Halima Yusuf", account: "9032 4410 95", amount: 18000, category: "Monthly Levy", date: "2 days ago", status: "Matched" },
];

export const monthlyTrend = [
  { month: "Jan", collected: 12.4, expected: 18.2 },
  { month: "Feb", collected: 14.1, expected: 18.6 },
  { month: "Mar", collected: 16.0, expected: 19.4 },
  { month: "Apr", collected: 15.2, expected: 20.1 },
  { month: "May", collected: 17.8, expected: 21.0 },
  { month: "Jun", collected: 17.8, expected: 22.4 },
];

export const categoryBreakdown = [
  { name: "Market Levy", value: 9_400_000, color: "var(--emerald)" },
  { name: "Sanitation", value: 3_200_000, color: "var(--navy)" },
  { name: "Security Fee", value: 2_800_000, color: "var(--gold)" },
  { name: "Shop Rent", value: 2_010_500, color: "var(--info)" },
  { name: "Local Tax", value: 400_000, color: "var(--warning)" },
];

export const duesCategories = [
  { id: "CAT-01", name: "Monthly Market Levy", amount: 18000, frequency: "Monthly", active: true, vendors: 1248 },
  { id: "CAT-02", name: "Sanitation Fee", amount: 5000, frequency: "Monthly", active: true, vendors: 1248 },
  { id: "CAT-03", name: "Security Fee", amount: 4000, frequency: "Monthly", active: true, vendors: 1248 },
  { id: "CAT-04", name: "Shop Rent", amount: 60000, frequency: "Yearly", active: true, vendors: 1248 },
  { id: "CAT-05", name: "Local Government Tax", amount: 2500, frequency: "Monthly", active: false, vendors: 320 },
  { id: "CAT-06", name: "Annual Convention Levy", amount: 3000, frequency: "One-time", active: true, vendors: 1248 },
];

export const receipts = [
  { id: "RCP-20451", vendor: "Chinedu Okafor", category: "Monthly Levy", amount: 18000, date: "12 Jun 2026", status: "Issued" },
  { id: "RCP-20450", vendor: "Olu Adebayo", category: "Monthly Levy", amount: 24000, date: "12 Jun 2026", status: "Issued" },
  { id: "RCP-20449", vendor: "Halima Yusuf", category: "Monthly Levy", amount: 18000, date: "11 Jun 2026", status: "Issued" },
  { id: "RCP-20448", vendor: "Ngozi Eze", category: "Sanitation Fee", amount: 5000, date: "11 Jun 2026", status: "Issued" },
  { id: "RCP-20447", vendor: "Ibrahim Musa", category: "Shop Rent", amount: 60000, date: "10 Jun 2026", status: "Issued" },
  { id: "RCP-20446", vendor: "Kemi Lawal", category: "Monthly Levy", amount: 12000, date: "10 Jun 2026", status: "Partial" },
];

export const reconciliation = [
  { id: "RC-771", source: "9032 4410 88", vendor: "Chinedu Okafor", expected: 18000, paid: 18000, diff: 0, status: "matched" },
  { id: "RC-772", source: "9032 4410 91", vendor: "Funmi Adeyemi", expected: 18000, paid: 22000, diff: 4000, status: "overpaid" },
  { id: "RC-773", source: "9032 4410 89", vendor: "Aisha Bello", expected: 18000, paid: 10000, diff: -8000, status: "underpaid" },
  { id: "RC-774", source: "9032 4410 22", vendor: "Unmatched", expected: 0, paid: 9500, diff: 9500, status: "review" },
  { id: "RC-775", source: "9032 4410 96", vendor: "Olu Adebayo", expected: 24000, paid: 24000, diff: 0, status: "matched" },
];

export const organizations = [
  { id: "ORG-001", name: "Ariaria Market Association", type: "Market", vendors: 1248, collected: 17_810_500, status: "active" },
  { id: "ORG-002", name: "Lekki Phase 1 Estate", type: "Estate", vendors: 612, collected: 28_400_000, status: "active" },
  { id: "ORG-003", name: "Onitsha Main Market Union", type: "Market", vendors: 2104, collected: 32_100_500, status: "active" },
  { id: "ORG-004", name: "Trans-Amadi Cooperative", type: "Cooperative", vendors: 318, collected: 4_200_000, status: "active" },
  { id: "ORG-005", name: "Kano Leather Traders Assoc.", type: "Trade Group", vendors: 540, collected: 6_900_000, status: "pending" },
  { id: "ORG-006", name: "Magodo Residents Forum", type: "Estate", vendors: 430, collected: 19_800_000, status: "active" },
  { id: "ORG-007", name: "Abia State Transport Union", type: "Trade Group", vendors: 980, collected: 11_240_000, status: "suspended" },
];

export const platformStats = {
  totalOrgs: 47,
  totalMembers: 38_412,
  totalCollected: 1_842_300_000,
  activeOrgs: 41,
};

export const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

export const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-US").format(n);
