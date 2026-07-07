import { createServerFn } from "@tanstack/react-start";
import { pool } from "./db";
import { z } from "zod";
import { askGeminiCoach } from "./gemini";
import { generateReceiptId } from "./receipt-utils";

export function getAppBaseUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return "https://dueslypay.vercel.app";
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

const generateId = (prefix: string) => prefix + "-" + Math.floor(1000 + Math.random() * 9000);
const REQUIRED_VENDOR_IMPORT_HEADERS = ["name", "shop", "phone", "section"] as const;

export async function writeAuditLog(orgId: string | null, userEmail: string | null, action: string, details: string) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (org_id, user_email, action, details)
       VALUES ($1, $2, $3, $4)`,
      [orgId, userEmail, action, details]
    );
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

export async function creditPlatformFee(paymentAmount: number) {
  const platformFee = paymentAmount > 100 ? 100 : Math.round(paymentAmount * 0.1);
  if (platformFee <= 0) return 0;
  
  console.log(`Crediting platform fee of ₦${platformFee} to Super Admin wallet (payment: ₦${paymentAmount})`);
  await pool.query(
    "UPDATE super_admin_wallet SET balance = balance + $1",
    [platformFee]
  );
  return platformFee;
}

function parseCSVLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeImportHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function canonicalImportHeader(value: string) {
  const normalized = normalizeImportHeader(value);
  if (["name", "fullname", "vendor", "member", "resident"].includes(normalized)) return "name";
  if (["shop", "stall", "coordinate", "house", "houseblock", "memberid"].includes(normalized)) return "shop";
  if (["phone", "phonenumber", "mobile", "mobilenumber"].includes(normalized)) return "phone";
  if (["section", "zone", "street", "division", "line"].includes(normalized)) return "section";
  return normalized;
}

export function getLedgerSnapshot(currentPaid: number, due: number, incomingAmount: number) {
  const previousPaid = Number(currentPaid) || 0;
  const expected = Number(due) || 0;
  const paidDelta = Number(incomingAmount) || 0;
  const paidToDate = previousPaid + paidDelta;
  const diffToDate = paidToDate - expected;

  let vendorStatus = "unpaid";
  if (paidToDate >= expected) {
    vendorStatus = paidToDate > expected ? "overpaid" : "paid";
  } else if (paidToDate > 0) {
    vendorStatus = "partial";
  }

  let reconciliationStatus = "matched";
  if (diffToDate > 0) reconciliationStatus = "overpaid";
  else if (diffToDate < 0) reconciliationStatus = "underpaid";

  return {
    paidToDate,
    diffToDate,
    vendorStatus,
    reconciliationStatus,
    paymentStatus: reconciliationStatus === "overpaid" ? "Overpaid" : reconciliationStatus === "underpaid" ? "Partial" : "Matched",
    receiptStatus: reconciliationStatus === "underpaid" ? "Partial" : "Issued",
  };
}

// Get Organization Admin Dashboard Data
export const getDashboardData = createServerFn({ method: "GET" })
  .validator(z.object({
    orgId: z.string().optional()
  }).optional())
  .handler(async ({ data }) => {
    const activeOrgId = data?.orgId || "";
    if (!activeOrgId) {
      return {
        orgName: "",
        orgType: "",
        orgStatus: "active",
        orgPhone: "",
        orgAddress: "",
        walletAccount: "",
        dailySummaryActive: true,
        smsReceiptsActive: true,
        weeklyReportActive: false,
        underpaymentAlertsActive: true,
        stats: {
          totalVendors: 0,
          expected: 0,
          collected: 0,
          compliance: 0,
          outstanding: 0,
          paid: 0,
          partial: 0,
          unpaid: 0,
          overpaid: 0
        },
        trend: [],
        categoryBreakdown: []
      };
    }

    // 1. Fetch organization details
    const orgRes = await pool.query("SELECT * FROM organizations WHERE id = $1 LIMIT 1", [activeOrgId]);
    const orgName = orgRes.rows[0]?.name || "";
    const orgType = orgRes.rows[0]?.type || "";
    const orgPhone = orgRes.rows[0]?.phone || "";
    const orgAddress = orgRes.rows[0]?.address || "";
    const walletAccount = orgRes.rows[0]?.wallet_account || "";

    // 2. Fetch vendor metrics
    const vendorsRes = await pool.query("SELECT * FROM vendors WHERE org_id = $1", [activeOrgId]);
    const vendors = vendorsRes.rows;

    const totalVendors = vendors.length;
    let expected = 0;
    let collected = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let overpaidCount = 0;

    for (const v of vendors) {
      const due = parseFloat(v.due);
      const paid = parseFloat(v.paid);
      expected += due;
      collected += paid;

      if (v.status === "paid") paidCount++;
      else if (v.status === "partial") partialCount++;
      else if (v.status === "unpaid") unpaidCount++;
      else if (v.status === "overpaid") overpaidCount++;
    }

    const outstanding = Math.max(0, expected - collected);

    // 3. Fetch recent payments
    const paymentsRes = await pool.query(
      "SELECT * FROM payments WHERE org_id = $1 ORDER BY id DESC LIMIT 5",
      [activeOrgId]
    );

    const refundedRes = await pool.query(
      "SELECT SUM(amount) FROM payments WHERE org_id = $1 AND amount < 0",
      [activeOrgId]
    );
    const totalRefunded = Math.abs(parseFloat(refundedRes.rows[0].sum || "0"));

    // 4. Fetch category breakdown
    const catRes = await pool.query("SELECT name, amount FROM dues_categories WHERE org_id = $1", [activeOrgId]);
    const colors = ["var(--emerald)", "var(--navy)", "var(--gold)", "var(--info)", "var(--warning)"];
    const categoryBreakdown = catRes.rows.map((row, idx) => ({
      name: row.name,
      value: parseFloat(row.amount) * totalVendors,
      color: colors[idx % colors.length]
    }));

    // Dynamic scale divisor and suffix based on collections
    let divisor = 1;
    let suffix = "";
    const maxVal = Math.max(collected, expected);
    if (maxVal >= 1000000) {
      divisor = 1000000;
      suffix = "M";
    } else if (maxVal >= 1000) {
      divisor = 1000;
      suffix = "K";
    }

    // 5. Build dynamic 6-month collection trend
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthIdx = new Date().getMonth();
    const trend = [];
    
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIdx - i + 12) % 12;
      const monthName = months[idx];
      
      if (idx === currentMonthIdx) {
        trend.push({
          month: monthName,
          collected: Number((collected / divisor).toFixed(2)),
          expected: Number((expected / divisor).toFixed(2))
        });
      } else {
        trend.push({
          month: monthName,
          collected: 0,
          expected: 0
        });
      }
    }

    const orgStatus = orgRes.rows[0]?.status || "active";
    const dailySummaryActive = orgRes.rows[0]?.daily_summary_active ?? true;
    const smsReceiptsActive = orgRes.rows[0]?.sms_receipts_active ?? true;
    const weeklyReportActive = orgRes.rows[0]?.weekly_report_active ?? false;
    const underpaymentAlertsActive = orgRes.rows[0]?.underpayment_alerts_active ?? true;

    return {
      orgName,
      orgType,
      orgStatus,
      orgPhone,
      orgAddress,
      walletAccount,
      dailySummaryActive,
      smsReceiptsActive,
      weeklyReportActive,
      underpaymentAlertsActive,
      stats: {
        totalVendors,
        expected,
        collected,
        outstanding,
        paid: paidCount,
        partial: partialCount,
        unpaid: unpaidCount,
        overpaid: overpaidCount,
        totalRefunded,
        suffix: suffix
      },
      recentPayments: paymentsRes.rows.map(p => ({
        id: p.id,
        vendor: p.vendor_name,
        account: p.account,
        amount: parseFloat(p.amount),
        category: p.category,
        date: p.date,
        status: p.status
      })),
      categoryBreakdown,
      trend
    };
  });

// Get Vendors list
export const getVendors = createServerFn({ method: "GET" })
  .validator(z.object({
    orgId: z.string().optional()
  }).optional())
  .handler(async ({ data }) => {
    const activeOrgId = data?.orgId || "";
    if (!activeOrgId) return [];
    const res = await pool.query("SELECT * FROM vendors WHERE org_id = $1 ORDER BY name ASC", [activeOrgId]);
    return res.rows.map(v => ({
      id: v.id,
      name: v.name,
      shop: v.shop,
      phone: v.phone,
      section: v.section,
      virtualAccount: v.virtual_account,
      due: parseFloat(v.due),
      paid: parseFloat(v.paid),
      status: v.status as any,
    }));
  });

// Create Vendor
export const createVendor = createServerFn({ method: "POST" })
  .validator(z.object({
    name: z.string().min(1),
    shop: z.string().min(1),
    phone: z.string().min(1),
    section: z.string().min(1),
    orgId: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const activeOrgId = data.orgId || "ORG-001";
    const id = "V-" + Math.floor(1000 + Math.random() * 9000);

    try {
      const virtualAccount = await createNombaVirtualAccount(data.name, data.shop);
      
      await pool.query(
        `INSERT INTO vendors (id, org_id, name, shop, phone, section, virtual_account, due, paid, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, activeOrgId, data.name, data.shop, data.phone, data.section, virtualAccount, 0, 0, "paid"]
      );

      return { success: true, id, virtualAccount };
    } catch (error: any) {
      console.error("Vendor creation blocked by Nomba provisioning failure:", error);
      return { success: false, error: error.message || "Nomba virtual account provisioning failed." };
    }
  });

// Get Dues Categories
export const getDuesCategories = createServerFn({ method: "GET" })
  .validator(z.object({
    orgId: z.string().optional()
  }).optional())
  .handler(async ({ data }) => {
    const activeOrgId = data?.orgId || "";
    if (!activeOrgId) return [];
    const res = await pool.query("SELECT * FROM dues_categories WHERE org_id = $1 ORDER BY active DESC, name ASC", [activeOrgId]);
    return res.rows.map(d => ({
      id: d.id,
      name: d.name,
      amount: parseFloat(d.amount),
      frequency: d.frequency,
      active: d.active,
      vendors: d.vendors_count,
      targetAccount: d.target_account,
      destinationBank: d.destination_bank,
      destinationAccount: d.destination_account,
      destinationName: d.destination_name
    }));
  });

// Create Dues Category
export const createDueCategory = createServerFn({ method: "POST" })
  .validator(z.object({
    name: z.string().min(1),
    amount: z.number().positive(),
    frequency: z.string().min(1),
    orgId: z.string().optional(),
    targetAccount: z.string().optional(),
    destinationBank: z.string().optional(),
    destinationAccount: z.string().optional(),
    destinationName: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const activeOrgId = data.orgId || "ORG-001";
    const id = "CAT-" + Math.floor(10 + Math.random() * 90);
    
    // Count vendors for org
    const countRes = await pool.query("SELECT COUNT(*) FROM vendors WHERE org_id = $1", [activeOrgId]);
    const vendorsCount = parseInt(countRes.rows[0].count);

    await pool.query(
      `INSERT INTO dues_categories (id, org_id, name, amount, frequency, active, vendors_count, target_account, destination_bank, destination_account, destination_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id, 
        activeOrgId, 
        data.name, 
        data.amount, 
        data.frequency, 
        true, 
        vendorsCount, 
        data.targetAccount || 'Main Settlement Wallet (Nomba)',
        data.destinationBank || null,
        data.destinationAccount || null,
        data.destinationName || null
      ]
    );

    return { success: true, id };
  });

// Toggle Dues Category Status
export const toggleDueCategory = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string(),
    active: z.boolean(),
  }))
  .handler(async ({ data }) => {
    await pool.query("UPDATE dues_categories SET active = $1 WHERE id = $2", [data.active, data.id]);
    return { success: true };
  });

// Delete Dues Category
export const deleteDueCategory = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string(),
  }))
  .handler(async ({ data }) => {
    await pool.query("DELETE FROM dues_categories WHERE id = $1", [data.id]);
    return { success: true };
  });

// Update Dues Category
export const updateDueCategory = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string(),
    name: z.string().min(1),
    amount: z.number().positive(),
    frequency: z.string().min(1),
    targetAccount: z.string().optional(),
    destinationBank: z.string().optional(),
    destinationAccount: z.string().optional(),
    destinationName: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    await pool.query(
      `UPDATE dues_categories 
       SET name = $1, amount = $2, frequency = $3, target_account = $4, destination_bank = $5, destination_account = $6, destination_name = $7 
       WHERE id = $8`,
      [
        data.name,
        data.amount,
        data.frequency,
        data.targetAccount || 'Main Settlement Wallet (Nomba)',
        data.destinationBank || null,
        data.destinationAccount || null,
        data.destinationName || null,
        data.id
      ]
    );
    return { success: true };
  });

// Generate Bills (applies all active dues categories to vendor dues)
export const generateBills = createServerFn({ method: "POST" })
  .validator(z.object({
    orgId: z.string().optional(),
    categoryId: z.string().optional()
  }).optional())
  .handler(async ({ data }) => {
    const activeOrgId = data?.orgId || "ORG-001";
    const categoryId = data?.categoryId;
    
    let additionalDue = 0;
    let categoryName = "";
    
    if (categoryId) {
      const catRes = await pool.query(
        "SELECT name, amount FROM dues_categories WHERE id = $1 AND org_id = $2",
        [categoryId, activeOrgId]
      );
      if (catRes.rowCount === 0) {
        throw new Error("Dues category not found");
      }
      additionalDue = parseFloat(catRes.rows[0].amount);
      categoryName = catRes.rows[0].name;
    } else {
      const activeDuesRes = await pool.query("SELECT SUM(amount) FROM dues_categories WHERE org_id = $1 AND active = true", [activeOrgId]);
      additionalDue = parseFloat(activeDuesRes.rows[0].sum || "0");
      categoryName = "all active categories";
    }

    if (additionalDue > 0) {
      const vendorsRes = await pool.query("SELECT id, due, paid FROM vendors WHERE org_id = $1", [activeOrgId]);
      for (const vendor of vendorsRes.rows) {
        const newDue = parseFloat(vendor.due) + additionalDue;
        const paid = parseFloat(vendor.paid);

        let status = "unpaid";
        if (paid >= newDue) {
          status = paid > newDue ? "overpaid" : "paid";
        } else if (paid > 0) {
          status = "partial";
        }

        await pool.query(
          "UPDATE vendors SET due = $1, status = $2 WHERE id = $3",
          [newDue, status, vendor.id]
        );
      }
      await createNotification(
        activeOrgId,
        null,
        "admin",
        "Levy Dues Generated",
        categoryId 
          ? `Billing run completed: ₦${additionalDue} successfully applied to all members for ${categoryName}.`
          : `Billing run completed: sanitation, monthly levy, and security bills totaling ₦${additionalDue} successfully applied to all members.`
      );
    }

    return { success: true, amountApplied: additionalDue, categoryName };
  });

// Get Reconciliations Feed
export const getReconciliations = createServerFn({ method: "GET" })
  .validator(z.object({
    orgId: z.string().optional()
  }).optional())
  .handler(async ({ data }) => {
    const activeOrgId = data?.orgId || "";
    if (!activeOrgId) return [];
    const res = await pool.query("SELECT * FROM reconciliations WHERE org_id = $1 ORDER BY id DESC", [activeOrgId]);
    return res.rows.map(r => ({
      id: r.id,
      source: r.source,
      vendor: r.vendor_name,
      expected: parseFloat(r.expected),
      paid: parseFloat(r.paid),
      diff: parseFloat(r.diff),
      status: r.status as any
    }));
  });

// Resolve Manual Review Action
export const resolveReconciliation = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string(),
    action: z.enum(["review", "matched", "overpaid", "underpaid"]),
    vendorName: z.string().optional(),
    orgId: z.string().optional()
  }))
  .handler(async ({ data }) => {
    const activeOrgId = data.orgId || "ORG-001";
    if (data.action === "matched" && data.vendorName) {
      // Find the reconciliation details
      const recRes = await pool.query("SELECT * FROM reconciliations WHERE id = $1 LIMIT 1", [data.id]);
      if (recRes.rowCount && recRes.rowCount > 0) {
        const rec = recRes.rows[0];

        // Find vendor
        const vendorRes = await pool.query(
          "SELECT * FROM vendors WHERE name = $1 AND org_id = $2 LIMIT 1",
          [data.vendorName, activeOrgId]
        );

        if (vendorRes.rowCount && vendorRes.rowCount > 0) {
          const vendor = vendorRes.rows[0];
          const amount = parseFloat(rec.paid);
          const due = parseFloat(vendor.due);
          const ledger = getLedgerSnapshot(parseFloat(vendor.paid), due, amount);

          // Update vendor status
          await pool.query(
            "UPDATE vendors SET paid = $1, status = $2 WHERE id = $3",
            [ledger.paidToDate, ledger.vendorStatus, vendor.id]
          );

          // Update reconciliation status
          await pool.query(
            "UPDATE reconciliations SET vendor_name = $1, expected = $2, diff = $3, status = $4 WHERE id = $5",
            [vendor.name, due, ledger.diffToDate, ledger.reconciliationStatus, data.id]
          );

          // Log payment
          const txnId = "TXN-" + Math.floor(100000 + Math.random() * 900000);
          await pool.query(
            `INSERT INTO payments (id, org_id, vendor_id, vendor_name, account, amount, category, date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              txnId,
              activeOrgId,
              vendor.id,
              vendor.name,
              rec.source,
              amount,
              "Monthly Levy",
              "Today",
              ledger.paymentStatus
            ]
          );

          // Issue receipt
          const rcpId = generateReceiptId(txnId);
          await pool.query(
            `INSERT INTO receipts (id, org_id, vendor_name, category, amount, date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [rcpId, activeOrgId, vendor.name, "Monthly Levy", amount, "Today", ledger.receiptStatus]
          );

          // Dispatch email alert via Resend API
          const vendorEmail = `${vendor.name.toLowerCase().replace(/\s+/g, "")}@duesly-vendor.org`;
          sendPaymentAlert({
            vendorEmail,
            vendorName: vendor.name,
            amount: amount,
            receiptId: rcpId,
            category: "Monthly Levy",
          }).catch((err) => {
            console.error("Failed to send manual reconciliation payment alert:", err);
          });
        }
      }
    } else {
      // Just update status
      await pool.query("UPDATE reconciliations SET status = $1 WHERE id = $2", [data.action, data.id]);
    }
    return { success: true };
  });

// Get Receipts
export const getReceipts = createServerFn({ method: "GET" })
  .validator(z.object({
    orgId: z.string().optional()
  }).optional())
  .handler(async ({ data }) => {
    const activeOrgId = data?.orgId || "";
    if (!activeOrgId) return [];
    
    const orgRes = await pool.query("SELECT name FROM organizations WHERE id = $1 LIMIT 1", [activeOrgId]);
    const orgName = orgRes.rows[0]?.name || "Ariaria Market Association";
    
    const res = await pool.query("SELECT * FROM receipts WHERE org_id = $1 ORDER BY id DESC", [activeOrgId]);
    return res.rows.map(r => ({
      id: r.id,
      vendor: r.vendor_name,
      category: r.category,
      amount: parseFloat(r.amount),
      date: r.date,
      status: r.status,
      orgName: orgName
    }));
  });

// Get Public Receipt Verification Detail
export const getReceiptById = createServerFn({ method: "GET" })
  .validator(z.object({
    receiptId: z.string()
  }))
  .handler(async ({ data }) => {
    const res = await pool.query(
      `SELECT r.*, o.name as org_name, o.type as org_type
       FROM receipts r
       LEFT JOIN organizations o ON r.org_id = o.id
       WHERE r.id = $1
       LIMIT 1`,
      [data.receiptId]
    );

    const receipt = res.rows[0];
    if (!receipt) return null;

    return {
      id: receipt.id,
      vendor: receipt.vendor_name,
      category: receipt.category,
      amount: parseFloat(receipt.amount),
      date: receipt.date,
      status: receipt.status,
      orgName: receipt.org_name || "Duesly Organization",
      orgType: receipt.org_type || "Association"
    };
  });

// Get Super Admin Platform Overview Data
export const getSuperAdminData = createServerFn({ method: "GET" })
  .handler(async () => {
    const orgsRes = await pool.query(`
      SELECT o.*, 
        COALESCE(v.count, 0) as vendors_count,
        COALESCE(p.sum, 0) as collected_amount
      FROM organizations o
      LEFT JOIN (SELECT org_id, COUNT(*) as count FROM vendors GROUP BY org_id) v ON o.id = v.org_id
      LEFT JOIN (SELECT org_id, SUM(amount) as sum FROM payments GROUP BY org_id) p ON o.id = p.org_id
      ORDER BY o.name ASC
    `);
    
    const vendorsRes = await pool.query("SELECT COUNT(*) FROM vendors");
    const payRes = await pool.query("SELECT SUM(amount) FROM payments");

    const totalOrgs = orgsRes.rowCount || 0;
    const totalMembers = parseInt(vendorsRes.rows[0].count);
    const totalCollected = parseFloat(payRes.rows[0].sum || "0");
    const activeOrgs = orgsRes.rows.filter(o => o.status === "active").length;

    // Sum of expected dues from all vendors
    const allVendorsRes = await pool.query("SELECT SUM(due) as sum FROM vendors");
    const totalExpectedAll = parseFloat(allVendorsRes.rows[0].sum || "0");

    // Dynamic scale divisor and suffix based on collections
    let divisor = 1;
    let suffix = "";
    const maxVal = Math.max(totalCollected, totalExpectedAll);
    if (maxVal >= 1000000) {
      divisor = 1000000;
      suffix = "M";
    } else if (maxVal >= 1000) {
      divisor = 1000;
      suffix = "K";
    }

    // Dynamic 6-month platform-wide trend
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthIdx = new Date().getMonth();
    const trend = [];
    
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIdx - i + 12) % 12;
      const monthName = months[idx];
      
      if (idx === currentMonthIdx) {
        trend.push({
          month: monthName,
          collected: Number((totalCollected / divisor).toFixed(2)),
          expected: Number((totalExpectedAll / divisor).toFixed(2))
        });
      } else {
        trend.push({
          month: monthName,
          collected: 0,
          expected: 0
        });
      }
    }

    const walletRes = await pool.query("SELECT * FROM super_admin_wallet LIMIT 1");
    const wallet = walletRes.rows[0] || { balance: 0, saved_bank_name: null, saved_account_number: null, saved_account_name: null };

    return {
      stats: {
        totalOrgs,
        totalMembers,
        totalCollected,
        activeOrgs,
        suffix: suffix
      },
      organizations: orgsRes.rows.map(o => ({
        id: o.id,
        name: o.name,
        type: o.type,
        status: o.status,
        vendors: parseInt(o.vendors_count),
        collected: parseFloat(o.collected_amount || "0"),
        expectedCapacity: parseInt(o.expected_capacity || "100"),
      })),
      trend,
      wallet: {
        balance: parseFloat(wallet.balance),
        savedBankName: wallet.saved_bank_name,
        savedAccountNumber: wallet.saved_account_number,
        savedAccountName: wallet.saved_account_name
      }
    };
  });

// Super Admin Create Organization
export const createOrganization = createServerFn({ method: "POST" })
  .validator(z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    expectedCapacity: z.number().optional(),
    adminFirstName: z.string().min(1),
    adminLastName: z.string().min(1),
    adminEmail: z.string().email(),
    adminPassword: z.string().min(6),
  }))
  .handler(async ({ data }) => {
    const id = "ORG-" + Math.floor(100 + Math.random() * 900);
    const client = await pool.connect();
    try {
      await client.query("BEGIN;");
      
      // 1. Insert organization
      await client.query(
        "INSERT INTO organizations (id, name, type, status, expected_capacity) VALUES ($1, $2, $3, $4, $5)",
        [id, data.name, data.type, "active", data.expectedCapacity || 100]
      );

      // 2. Insert primary admin user
      const name = `${data.adminFirstName} ${data.adminLastName}`;
      await client.query(
        `INSERT INTO users (email, password, role, org_id, name, is_verified) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [data.adminEmail, data.adminPassword, "admin", id, name, true]
      );

      // 3. Insert default category definitions
      const categoryId1 = "CAT-" + Math.floor(1000 + Math.random() * 9000);
      const categoryId2 = "CAT-" + Math.floor(1000 + Math.random() * 9000);
      await client.query(
        `INSERT INTO dues_categories (id, org_id, name, amount, frequency, active, vendors_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $2, $9, $10, $5, $6, $7)`,
        [categoryId1, id, "Monthly Union Dues", 5000, "Monthly", true, 0,
         categoryId2, "Security & Sanitation Levy", 2000, "Monthly", true, 0]
      );

      await client.query("COMMIT;");

      // 4. Create real platform notifications
      await createNotification(
        null,
        null,
        "super-admin",
        "Organization Onboarded",
        `Organization "${data.name}" was successfully registered on the platform.`
      );
      await createNotification(
        id,
        null,
        "admin",
        "Portal Activated",
        `Welcome to the "${data.name}" portal! Assign dedicated bank accounts to start matching levies.`
      );

      // 4. Send welcome credentials email to organization admin
      try {
        await sendEmail({
          to: data.adminEmail,
          subject: `Your Admin Portal is Ready — Duesly`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #0b1a3a; text-align: center;">Welcome to Duesly!</h2>
              <p>Hello ${data.adminFirstName},</p>
              <p>Your administration portal for <strong>${data.name}</strong> has been successfully activated on Duesly by our platform operations team.</p>
              
              <div style="background-color: #f8fafc; padding: 18px; border-radius: 8px; border: 1px solid #edf2f7; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #0b1a3a;">Your Login Credentials:</h4>
                 <p style="margin: 4px 0; font-size: 14px;"><strong>Admin Portal URL:</strong> <a href="${getAppBaseUrl()}/login">duesly.app/login</a></p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Username/Email:</strong> ${data.adminEmail}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Temporary Password:</strong> ${data.adminPassword}</p>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: #e11d48;">⚠️ <em>For security, please change your password in settings upon first login.</em></p>
              </div>

              <h4 style="color: #0b1a3a;">Next Steps to Begin Collections:</h4>
              <ol style="font-size: 14px; line-height: 1.6; color: #4a5568;">
                <li>Log in to your dashboard panel.</li>
                <li>Import your members list or register them individually.</li>
                <li>Assign dedicated bank accounts for automated reconciliation.</li>
                <li>Create and publish dues to dispatch real-time payment alerts.</li>
              </ol>

              <p style="font-size: 13px; color: #718096; line-height: 1.5; margin-top: 25px;">If you have any questions or require hands-on onboarding assistance, simply reply to this email or reach out to support@duesly.app.</p>
              <p style="font-size: 11px; color: #a0aec0; border-top: 1px dashed #e2e8f0; padding-top: 15px; margin-top: 20px; text-align: center;">Duesly Technologies Ltd.</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error("Failed to deliver onboarding email welcome:", emailErr);
      }

      return { success: true, id };
    } catch (err) {
      await client.query("ROLLBACK;");
      console.error(err);
      throw err;
    } finally {
      client.release();
    }
  });

// Super Admin Update Organization Status
export const updateOrgStatus = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string(),
    status: z.string(),
  }))
  .handler(async ({ data }) => {
    await pool.query("UPDATE organizations SET status = $1 WHERE id = $2", [data.status, data.id]);
    return { success: true };
  });

// Super Admin Delete Organization
export const deleteOrganization = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string()
  }))
  .handler(async ({ data }) => {
    const orgRes = await pool.query("SELECT name FROM organizations WHERE id = $1", [data.id]);
    const name = orgRes.rows[0]?.name || data.id;

    await pool.query("DELETE FROM users WHERE org_id = $1", [data.id]);
    await pool.query("DELETE FROM organizations WHERE id = $1", [data.id]);

    await createNotification(
      null,
      null,
      "super-admin",
      "Tenant Decommissioned",
      `Organization "${name}" (ID: ${data.id}) was decommissioned and removed from the platform.`
    );
    return { success: true };
  });

// Vendor Portal Query (Lookup Vendor and their portal info)
export const getVendorPortal = createServerFn({ method: "POST" })
  .validator(z.object({
    searchQuery: z.string(),
  }))
  .handler(async ({ data }) => {
    const normalized = data.searchQuery.replace(/\s+/g, "").toLowerCase();
    
    // First check if searching by user email
    const userRes = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1 AND role = 'vendor' LIMIT 1", [normalized]);
    let res;
    if (userRes.rowCount && userRes.rowCount > 0) {
      const u = userRes.rows[0];
      res = await pool.query(
        "SELECT * FROM vendors WHERE LOWER(name) = LOWER($1) AND org_id = $2 LIMIT 1",
        [u.name, u.org_id]
      );
    } else {
      res = await pool.query(
        `SELECT * FROM vendors 
         WHERE REPLACE(virtual_account, ' ', '') = $1 
            OR REPLACE(phone, ' ', '') = $1 
            OR LOWER(shop) = $1 
         LIMIT 1`,
        [normalized]
      );
    }

    if (res.rowCount && res.rowCount > 0) {
      const vendor = res.rows[0];

      // Ensure Harrison has correct dues for clean demo (clearing the old hardcoded 18000 carryover)
      if (vendor.name === "Harrison Okoronkwo" && parseFloat(vendor.due) === 41000) {
        await pool.query("UPDATE vendors SET due = 23000 WHERE id = $1", [vendor.id]);
        vendor.due = "23000.00";
      }

      // Get payment history
      let paymentsRes = await pool.query(
        "SELECT * FROM payments WHERE vendor_id = $1 ORDER BY id DESC",
        [vendor.id]
      );

      // Get active dues categories
      const duesRes = await pool.query(
        "SELECT id, name, amount, frequency, target_account, destination_bank, destination_account, destination_name FROM dues_categories WHERE org_id = $1 AND active = true",
        [vendor.org_id]
      );

      // Get organization details
      const orgRes = await pool.query(
        "SELECT name, type FROM organizations WHERE id = $1 LIMIT 1",
        [vendor.org_id]
      );
      const orgName = orgRes.rows[0]?.name || "Duesly Association";
      const orgType = orgRes.rows[0]?.type || "Market";

      // Try to find the vendor's onboarded user account to get their email
      const userAccountRes = await pool.query(
        "SELECT email FROM users WHERE LOWER(name) = LOWER($1) AND org_id = $2 AND role = 'vendor' LIMIT 1",
        [vendor.name, vendor.org_id]
      );
      const email = userAccountRes.rows[0]?.email || "";

      // Get receipts
      let receiptsRes = await pool.query(
        "SELECT * FROM receipts WHERE vendor_name = $1 ORDER BY id DESC",
        [vendor.name]
      );

      // Query Nomba production transactions for this virtual account to check for transfers in real-time
      if (vendor.virtual_account && process.env.NOMBA_CLIENT_ID && process.env.NOMBA_PRIVATE_KEY && process.env.NOMBA_PARENT_ACCOUNT_ID) {
        try {
          const accessToken = await getNombaAccessToken();
          const baseUrl = "https://api.nomba.com";
          const queryAcc = vendor.virtual_account.replace(/\s+/g, "");
          console.log(`Checking Nomba transactions for virtual account: ${queryAcc}`);
          const nombaRes = await fetch(`${baseUrl}/v1/transactions/virtual?virtual_account=${queryAcc}`, {
            method: "GET",
            headers: {
              "accountId": process.env.NOMBA_PARENT_ACCOUNT_ID,
              "Authorization": `Bearer ${accessToken}`
            }
          });
          if (nombaRes.ok) {
            const nombaData: any = await nombaRes.json();
            const txns = Array.isArray(nombaData.data) 
              ? nombaData.data 
              : (Array.isArray(nombaData.data?.results) 
                  ? nombaData.data.results 
                  : (Array.isArray(nombaData.data?.transactions) ? nombaData.data.transactions : []));

            console.log(`Found ${txns.length} transactions from Nomba for virtual account: ${queryAcc}`);
            let newTxnsCount = 0;

            for (const txn of txns) {
              const txnRef = txn.transactionId || txn.transaction_id || txn.merchantTxRef || txn.reference || txn.ref || txn.id;
              if (!txnRef) continue;

              const existingPay = await pool.query("SELECT 1 FROM payments WHERE id = $1 LIMIT 1", [txnRef]);
              if (existingPay.rowCount === 0) {
                const txnAmount = parseFloat(txn.amount || txn.amountPaid || txn.paidAmount || txn.transaction?.amount);
                if (isNaN(txnAmount) || txnAmount <= 0) continue;

                newTxnsCount++;

                // Credit platform fee to Super Admin wallet
                const platformFee = await creditPlatformFee(txnAmount);

                // 1. Update vendor paid & status
                const currentPaid = parseFloat(vendor.paid) || 0;
                const currentDue = parseFloat(vendor.due) || 0;
                const ledger = getLedgerSnapshot(currentPaid, currentDue, txnAmount);

                await pool.query(
                  "UPDATE vendors SET paid = $1, status = $2 WHERE id = $3",
                  [ledger.paidToDate, ledger.vendorStatus, vendor.id]
                );
                
                vendor.paid = ledger.paidToDate.toString();
                vendor.status = ledger.vendorStatus;

                // 2. Insert payment log
                const todayStr = new Date().toLocaleDateString("en-NG", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });
                await pool.query(
                  `INSERT INTO payments (id, org_id, vendor_id, vendor_name, account, amount, fee, category, date, status)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                  [
                    txnRef,
                    vendor.org_id,
                    vendor.id,
                    vendor.name,
                    vendor.virtual_account,
                    txnAmount,
                    platformFee,
                    "Monthly Levy",
                    "Today, " + new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
                    ledger.paymentStatus,
                  ]
                );

                // 3. Insert reconciliation entry
                const rcId = "RC-" + Math.floor(100 + Math.random() * 900);
                await pool.query(
                  `INSERT INTO reconciliations (id, org_id, source, vendor_name, expected, paid, diff, status)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                  [rcId, vendor.org_id, vendor.virtual_account, vendor.name, currentDue, ledger.paidToDate, ledger.diffToDate, ledger.reconciliationStatus]
                );

                // 4. Insert receipt
                const rcpId = generateReceiptId(txnRef);
                await pool.query(
                  `INSERT INTO receipts (id, org_id, vendor_name, category, amount, date, status)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                  [rcpId, vendor.org_id, vendor.name, "Monthly Levy", txnAmount, todayStr, ledger.receiptStatus]
                );

                // 5. Create notifications for vendor and admin
                await createNotification(
                  vendor.org_id,
                  vendor.id,
                  "vendor",
                  "Payment Reconciled",
                  `Your bank transfer of ₦${txnAmount.toLocaleString()} to your dedicated account was processed. A receipt has been issued.`
                );
                await createNotification(
                  vendor.org_id,
                  null,
                  "admin",
                  "Payment Reconciled",
                  `Member "${vendor.name}" (Shop ${vendor.shop}) has made a bank transfer of ₦${txnAmount.toLocaleString()} to their dedicated account.`
                );

                // Send payment alert email
                const vendorEmail = `${vendor.name.toLowerCase().replace(/\s+/g, "")}@duesly-vendor.org`;
                sendPaymentAlert({
                  vendorEmail,
                  vendorName: vendor.name,
                  amount: txnAmount,
                  receiptId: rcpId,
                  category: "Monthly Levy",
                  orgName: orgName
                }).catch((err) => {
                  console.error("Resend delivery failed:", err);
                });

                // Trigger auto-settlement split disbursement using the net amount (gross - fee)
                dispatchAutoSettlementSplits(vendor.org_id, vendor.id, vendor.name, txnAmount - platformFee).catch((err) => {
                  console.error("Auto-settlement splits trigger failed:", err);
                });
              }
            }

            if (newTxnsCount > 0) {
              console.log(`Reconciled ${newTxnsCount} new live Nomba payments for vendor: ${vendor.name}`);
              paymentsRes = await pool.query(
                "SELECT * FROM payments WHERE vendor_id = $1 ORDER BY id DESC",
                [vendor.id]
              );
              receiptsRes = await pool.query(
                "SELECT * FROM receipts WHERE vendor_name = $1 ORDER BY id DESC",
                [vendor.name]
              );
            }
          } else {
            console.error(`Nomba transactions fetch failed: ${nombaRes.status} - ${await nombaRes.text()}`);
          }
        } catch (err) {
          console.error("Failed to fetch live Nomba transactions during portal reload:", err);
        }
      }

      return {
        success: true,
        vendor: {
          id: vendor.id,
          name: vendor.name,
          shop: vendor.shop,
          phone: vendor.phone,
          section: vendor.section,
          virtualAccount: vendor.virtual_account,
          due: parseFloat(vendor.due),
          paid: parseFloat(vendor.paid),
          status: vendor.status,
          orgId: vendor.org_id,
          orgName: orgName,
          orgType: orgType,
          email: email,
          withdrawalPinSet: !!vendor.withdrawal_pin
        },
        duesCategories: duesRes.rows.map(d => ({
          id: d.id,
          name: d.name,
          amount: parseFloat(d.amount),
          frequency: d.frequency,
          targetAccount: d.target_account,
          destinationBank: d.destination_bank,
          destinationAccount: d.destination_account,
          destinationName: d.destination_name
        })),
        payments: paymentsRes.rows.map(p => ({
          id: p.id,
          amount: parseFloat(p.amount),
          category: p.category,
          date: p.date,
          status: p.status
        })),
        receipts: receiptsRes.rows.map(r => ({
          id: r.id,
          category: r.category,
          amount: parseFloat(r.amount),
          date: r.date,
          status: r.status
        }))
      };
    }

    return { success: false, error: "No matching vendor found." };
  });

export const getVendorHistory = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const res = await pool.query(
      "SELECT date, amount, category FROM payments WHERE vendor_id = $1 ORDER BY id DESC",
      [data.id]
    );
    return res.rows.map(p => ({
      d: p.date,
      a: parseFloat(p.amount),
      c: p.category
    }));
  });

export const getSuperAdminTransactions = createServerFn({ method: "GET" })
  .handler(async () => {
    const res = await pool.query(
      `SELECT p.*, o.name as org_name 
       FROM payments p
       JOIN organizations o ON p.org_id = o.id
       ORDER BY p.id DESC`
    );
    return res.rows.map(r => ({
      id: r.id,
      org: r.org_name,
      vendor: r.vendor_name,
      account: r.account,
      amount: parseFloat(r.amount),
      date: r.date,
      status: r.status
    }));
  });

import { analyzeCollectionInsights } from "./gemini";

// Nomba OAuth2 Access Token Helper
async function getNombaAccessToken() {
  const clientId = process.env.NOMBA_CLIENT_ID;
  const clientSecret = process.env.NOMBA_PRIVATE_KEY;
  const accountId = process.env.NOMBA_PARENT_ACCOUNT_ID;

  if (!clientId || !clientSecret || !accountId) {
    throw new Error("Missing Nomba API credentials in environment");
  }

  const baseUrl = "https://api.nomba.com";
  console.log(`Fetching Nomba access token from: ${baseUrl}/v1/auth/token/issue`);
  
  const response = await fetch(`${baseUrl}/v1/auth/token/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accountId": accountId
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nomba Authentication failed: ${response.status} - ${errorText}`);
  }

  const result: any = await response.json();
  return result.data.access_token;
}

// Nomba Split Auto-Settlement Dispatcher
export async function dispatchAutoSettlementSplits(
  orgId: string,
  vendorId: string,
  vendorName: string,
  paymentAmount: number
) {
  console.log(`Checking auto-settlement splits for payment of ₦${paymentAmount} from vendor ${vendorName}`);
  
  // 1. Fetch the dues categories for the organization Consistently
  const categoriesRes = await pool.query(
    "SELECT * FROM dues_categories WHERE org_id = $1 ORDER BY amount DESC, name ASC",
    [orgId]
  );
  
  if (categoriesRes.rowCount === 0) return;
  
  let remainingAmount = paymentAmount;
  
  for (const cat of categoriesRes.rows) {
    if (remainingAmount <= 0) break;
    
    const catAmount = parseFloat(cat.amount);
    const splitAmount = Math.min(remainingAmount, catAmount);
    remainingAmount -= splitAmount;
    
    // Check if this category has a split destination account configured
    if (cat.destination_account && cat.destination_bank) {
      const destAcc = cat.destination_account.trim();
      const destBank = cat.destination_bank.trim();
      
      if (destAcc.length === 10) {
        console.log(`Auto-settlement trigger: routing ₦${splitAmount} from split levy "${cat.name}" to ${destBank} (${destAcc})`);
        
        try {
          const accessToken = await getNombaAccessToken();
          const parentAccountId = process.env.NOMBA_PARENT_ACCOUNT_ID;
          
          if (!accessToken || !parentAccountId) {
            console.error("Auto-settlement failed: Nomba credentials missing");
            continue;
          }
          
          const getBankCode = (bankName: string) => {
            const name = bankName.toLowerCase();
            if (name.includes("zenith")) return "057";
            if (name.includes("access")) return "044";
            if (name.includes("guaranty") || name.includes("gtb") || name.includes("gtbank")) return "058";
            if (name.includes("united") || name.includes("uba")) return "033";
            if (name.includes("first")) return "011";
            if (name.includes("opay") || name.includes("paycom")) return "305";
            if (name.includes("palmpay")) return "100033";
            if (name.includes("moniepoint")) return "090405";
            if (name.includes("kuda")) return "090267";
            if (name.includes("stanbic")) return "039";
            if (name.includes("sterling")) return "050";
            if (name.includes("union")) return "032";
            if (name.includes("wema")) return "035";
            if (name.includes("fidelity")) return "070";
            if (name.includes("polaris")) return "076";
            if (name.includes("fcmb")) return "214";
            return "057";
          };
          
          const bankCode = getBankCode(destBank);
          const txnId = "SPLIT-" + Math.floor(100000 + Math.random() * 900000);
          
          const transferRes = await fetch("https://api.nomba.com/v2/transfers/bank", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`,
              "accountId": parentAccountId
            },
            body: JSON.stringify({
              amount: splitAmount,
              accountNumber: destAcc,
              accountName: cat.destination_name || vendorName,
              bankCode: bankCode,
              merchantTxRef: txnId,
              senderName: "Duesly Pay Technologies",
              narration: `Split settlement ${cat.name} from ${vendorName}`
            })
          });
          
          if (!transferRes.ok) {
            const errBody = await transferRes.text();
            console.error(`Nomba auto-settlement split transfer failed: ${transferRes.status} - ${errBody}`);
            
            await createNotification(
              orgId,
              null,
              "admin",
              "Split Routing Failed",
              `Auto-routing ₦${splitAmount.toLocaleString()} for "${cat.name}" failed: ${errBody}`
            );
          } else {
            const transferData = await transferRes.json();
            console.log("Nomba auto-settlement split transfer successful response:", transferData);
            
            const todayStr = new Date().toLocaleDateString("en-NG", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            
            // Log split debit payment in payments ledger
            await pool.query(
              `INSERT INTO payments (id, org_id, vendor_id, vendor_name, account, amount, category, date, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                txnId,
                orgId,
                vendorId,
                vendorName,
                destAcc,
                -splitAmount,
                `Split Settlement: ${cat.name}`,
                "Today, " + new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
                "Disbursed"
              ]
            );

            // Log split debit receipt
            const rcpId = generateReceiptId(txnId);
            await pool.query(
              `INSERT INTO receipts (id, org_id, vendor_name, category, amount, date, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                rcpId,
                orgId,
                vendorName,
                `Split Settlement: ${cat.name}`,
                -splitAmount,
                todayStr,
                "Disbursed"
              ]
            );

            // Log reconciliation split trace entry
            const rcId = "RC-" + Math.floor(100 + Math.random() * 900);
            await pool.query(
              `INSERT INTO reconciliations (id, org_id, source, vendor_name, expected, paid, diff, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                rcId,
                orgId,
                destAcc,
                vendorName,
                splitAmount,
                splitAmount,
                0,
                "matched"
              ]
            );

            await createNotification(
              orgId,
              null,
              "admin",
              "Split Routing Successful",
              `Auto-routed ₦${splitAmount.toLocaleString()} for "${cat.name}" to ${destBank} (${destAcc}) successfully.`
            );
          }
        } catch (apiErr) {
          console.error("Failed to execute Nomba auto-settlement split payout transfer:", apiErr);
        }
      }
    }
  }
}

// Nomba Virtual Account Creation Client
export async function createNombaVirtualAccount(vendorName: string, shopNumber: string) {
  const clientId = process.env.NOMBA_CLIENT_ID;
  const privateKey = process.env.NOMBA_PRIVATE_KEY;
  const subAccountId = process.env.NOMBA_SUB_ACCOUNT_ID;
  const parentAccountId = process.env.NOMBA_PARENT_ACCOUNT_ID;

  if (!clientId || !privateKey || !subAccountId || !parentAccountId) {
    throw new Error("Nomba virtual account provisioning is not configured. Set NOMBA_CLIENT_ID, NOMBA_PRIVATE_KEY, NOMBA_SUB_ACCOUNT_ID, and NOMBA_PARENT_ACCOUNT_ID.");
  }

  console.log(`Initiating Nomba Virtual Account registration for: ${vendorName} (Shop: ${shopNumber})`);
  const accessToken = await getNombaAccessToken();
  const baseUrl = "https://api.nomba.com";
  
  const response = await fetch(`${baseUrl}/v1/accounts/virtual`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accountId": parentAccountId,
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      accountRef: "ref-" + Math.floor(10000000 + Math.random() * 90000000),
      accountName: `Duesly ${vendorName}`.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 40).trim(),
      email: `${vendorName.toLowerCase().replace(/\s+/g, "")}@duesly-vendor.org`,
      phoneNumber: "08030000000",
      subAccountId: subAccountId,
    }),
  });
  
  const result: any = await response.json().catch(() => null);
  console.log("Nomba Virtual Account creation API result:", result);
  
  if (!response.ok) {
    throw new Error(`Nomba virtual account provisioning failed: ${response.status} ${JSON.stringify(result)}`);
  }

  const accountNumber = result?.data?.bankAccountNumber || result?.data?.accountNumber || result?.data?.banks?.[0]?.accountNumber;
  if (!accountNumber) {
    throw new Error(`Nomba virtual account provisioning succeeded without an account number: ${JSON.stringify(result)}`);
  }

  return accountNumber;
}

function getNested(source: any, paths: string[]) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], source);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function normalizeNombaAccountRecord(record: any) {
  const accountNumber = String(getNested(record, [
    "accountNumber",
    "account_number",
    "virtualAccountNumber",
    "virtual_account_number",
    "bankAccountNumber",
    "bank_account_number",
    "nuban",
    "account.number",
    "bankAccount.accountNumber",
  ]) || "").replace(/\s+/g, "");

  if (!accountNumber) return null;

  return {
    accountNumber,
    accountName: String(getNested(record, ["accountName", "account_name", "name", "customer.name", "bankAccount.accountName"]) || ""),
    bankName: String(getNested(record, ["bankName", "bank_name", "bank", "bank.name"]) || "Nomba MFB"),
    reference: String(getNested(record, ["reference", "merchantTxRef", "merchant_tx_ref", "id", "accountReference"]) || ""),
    status: String(getNested(record, ["status", "state"]) || "active"),
    createdAt: String(getNested(record, ["createdAt", "created_at", "dateCreated"]) || ""),
    raw: record,
  };
}

export const getNombaVirtualAccountsAudit = createServerFn({ method: "POST" })
  .validator(z.object({
    adminEmail: z.string().email(),
    sessionToken: z.string()
  }))
  .handler(async ({ data }) => {
    const callerRes = await pool.query(
      "SELECT role FROM users WHERE LOWER(email) = $1 AND session_token = $2 LIMIT 1",
      [data.adminEmail.toLowerCase(), data.sessionToken]
    );
    if (!callerRes.rowCount || callerRes.rows[0].role !== "super-admin") {
      return { success: false, error: "Only an active super-admin session can retrieve Nomba account records." };
    }

    const parentAccountId = process.env.NOMBA_PARENT_ACCOUNT_ID;
    if (!parentAccountId) {
      return { success: false, error: "NOMBA_PARENT_ACCOUNT_ID is not configured." };
    }

    const accessToken = await getNombaAccessToken();
    const baseUrl = "https://api.nomba.com";
    const endpoints = [
      { path: "/v1/accounts/virtual/list", method: "POST", body: {} },
      { path: "/v1/accounts/virtual", method: "GET" },
      { path: "/v1/virtual-accounts", method: "GET" },
      { path: "/v1/accounts/virtual-accounts", method: "GET" },
      { path: "/v2/accounts/virtual", method: "GET" },
      { path: "/v2/virtual-accounts", method: "GET" },
    ];

    let lastError = "";
    let payload: any = null;
    let sourceEndpoint = "";

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "accountId": parentAccountId,
        },
        body: ep.body ? JSON.stringify(ep.body) : undefined
      });

      if (res.ok) {
        payload = await res.json();
        sourceEndpoint = ep.path;
        break;
      }

      lastError = `${ep.path} (${ep.method}): ${res.status} ${await res.text()}`;
    }

    if (!payload) {
      return {
        success: false,
        error: `Could not retrieve Nomba virtual accounts with the configured credentials. Last response: ${lastError || "unknown error"}`,
      };
    }

    const records = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.data?.results)
          ? payload.data.results
          : Array.isArray(payload.data?.accounts)
            ? payload.data.accounts
            : Array.isArray(payload.results)
              ? payload.results
              : [];

    const normalizedAccounts = records
      .map(normalizeNombaAccountRecord)
      .filter(Boolean) as Array<ReturnType<typeof normalizeNombaAccountRecord> & { accountNumber: string }>;

    const localRes = await pool.query(
      `SELECT v.id, v.name, v.shop, v.phone, v.section, v.virtual_account, v.org_id, o.name AS org_name
       FROM vendors v
       LEFT JOIN organizations o ON o.id = v.org_id`
    );
    const localByAccount = new Map(
      localRes.rows.map((row) => [String(row.virtual_account || "").replace(/\s+/g, ""), row])
    );

    return {
      success: true,
      sourceEndpoint,
      totalRemote: normalizedAccounts.length,
      matched: normalizedAccounts.filter((account) => localByAccount.has(account.accountNumber)).length,
      unmatched: normalizedAccounts.filter((account) => !localByAccount.has(account.accountNumber)).length,
      accounts: normalizedAccounts.map((account) => {
        const local = localByAccount.get(account.accountNumber);
        return {
          ...account,
          localMatch: local ? {
            vendorId: local.id,
            vendorName: local.name,
            shop: local.shop,
            phone: local.phone,
            section: local.section,
            orgId: local.org_id,
            orgName: local.org_name,
          } : null,
        };
      }),
    };
  });

// Bulk CSV Upload Onboarding
export const importVendorsCSV = createServerFn({ method: "POST" })
  .validator(z.object({
    csvContent: z.string(),
    orgId: z.string().optional()
  }))
  .handler(async ({ data }) => {
    const activeOrgId = data.orgId || "ORG-001";
    const lines = data.csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      throw new Error("CSV must include a header row and at least one member row.");
    }

    const rawHeaders = parseCSVLine(lines[0]);
    const canonicalHeaders = rawHeaders.map(canonicalImportHeader);
    const missingHeaders = REQUIRED_VENDOR_IMPORT_HEADERS.filter((header) => !canonicalHeaders.includes(header));

    if (missingHeaders.length > 0) {
      throw new Error(`CSV is missing required column(s): ${missingHeaders.join(", ")}. Required columns: name, shop, phone, section.`);
    }

    const headerIndexes = REQUIRED_VENDOR_IMPORT_HEADERS.reduce<Record<string, number>>((acc, header) => {
      acc[header] = canonicalHeaders.indexOf(header);
      return acc;
    }, {});

    const rows = lines.slice(1).map((line, index) => {
      const values = parseCSVLine(line);
      const rowNumber = index + 2;
      const row = {
        name: values[headerIndexes.name]?.trim() || "",
        shop: values[headerIndexes.shop]?.trim() || "",
        phone: values[headerIndexes.phone]?.trim() || "",
        section: values[headerIndexes.section]?.trim() || "",
      };

      const missingValues = REQUIRED_VENDOR_IMPORT_HEADERS.filter((header) => !row[header]);
      if (missingValues.length > 0) {
        throw new Error(`Row ${rowNumber} is missing required value(s): ${missingValues.join(", ")}.`);
      }

      return row;
    });

    const seenKeys = new Set<string>();
    for (const [index, row] of rows.entries()) {
      const rowKey = `${row.name.toLowerCase()}|${row.phone.replace(/\s+/g, "")}`;
      if (seenKeys.has(rowKey)) {
        throw new Error(`Row ${index + 2} duplicates another row for ${row.name} / ${row.phone}.`);
      }
      seenKeys.add(rowKey);
    }

    let count = 0;
    for (const row of rows) {
      const id = "V-" + Math.floor(1000 + Math.random() * 9000);
      let virtualAccount = "";

      try {
        virtualAccount = await createNombaVirtualAccount(row.name, row.shop);
      } catch (error: any) {
        throw new Error(`Nomba provisioning failed for ${row.name}: ${error.message || "unknown error"}`);
      }

      await pool.query(
        `INSERT INTO vendors (id, org_id, name, shop, phone, section, virtual_account, due, paid, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [id, activeOrgId, row.name, row.shop, row.phone, row.section, virtualAccount, 18000, 0, "unpaid"]
      );
      count++;
    }
    
    return { success: true, imported: count };
  });

// Duesly AI Collection Analyst Insights
export const getAICoachInsights = createServerFn({ method: "GET" })
  .validator(z.object({
    orgId: z.string().optional()
  }).optional())
  .handler(async ({ data }) => {
    const activeOrgId = data?.orgId || "";
    if (!activeOrgId) return { insights: "" };

    // 1. Fetch organization details
    const orgRes = await pool.query("SELECT * FROM organizations WHERE id = $1 LIMIT 1", [activeOrgId]);
    if (orgRes.rowCount === 0) return { insights: "" };
    const orgName = orgRes.rows[0].name;
    const orgType = orgRes.rows[0].type || "Market";

    // 2. Fetch vendor metrics
    const vendorsRes = await pool.query("SELECT * FROM vendors WHERE org_id = $1", [activeOrgId]);
    const vendors = vendorsRes.rows;

    const totalVendors = vendors.length;
    let expected = 0;
    let collected = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let overpaidCount = 0;

    for (const v of vendors) {
      const due = parseFloat(v.due);
      const paid = parseFloat(v.paid);
      expected += due;
      collected += paid;

      if (v.status === "paid") paidCount++;
      else if (v.status === "partial") partialCount++;
      else if (v.status === "unpaid") unpaidCount++;
      else if (v.status === "overpaid") overpaidCount++;
    }

    const outstanding = Math.max(0, expected - collected);

    // 3. Fetch category breakdown
    const catRes = await pool.query("SELECT name, amount FROM dues_categories WHERE org_id = $1", [activeOrgId]);
    const categoryBreakdown = catRes.rows.map((row) => ({
      name: row.name,
      value: parseFloat(row.amount) * totalVendors
    }));

    // 4. Fetch actual unique sections defined in this org
    const sectionsRes = await pool.query("SELECT DISTINCT section FROM vendors WHERE org_id = $1 AND section IS NOT NULL AND section != ''", [activeOrgId]);
    const actualSections = sectionsRes.rows.map(r => r.section);

    const insightsMarkdown = await analyzeCollectionInsights({
      orgName,
      orgType,
      totalVendors,
      expected,
      collected,
      outstanding,
      paid: paidCount,
      partial: partialCount,
      unpaid: unpaidCount,
      overpaid: overpaidCount,
      sections: actualSections
    }, categoryBreakdown);

    return { insights: insightsMarkdown };
  });

// Database Authentication Login
export const loginUser = createServerFn({ method: "POST" })
  .validator(z.object({
    email: z.string().email(),
    password: z.string()
  }))
  .handler(async ({ data }) => {
    const res = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1", [data.email.toLowerCase()]);
    if (res.rowCount === 0) {
      return { success: false, error: "Invalid email address or password" };
    }
    const user = res.rows[0];
    if (user.password !== data.password) {
      return { success: false, error: "Invalid email address or password" };
    }
    let orgType = "Market";
    if (user.org_id && user.role !== "super-admin") {
      const orgRes = await pool.query("SELECT status, type FROM organizations WHERE id = $1 LIMIT 1", [user.org_id]);
      if (orgRes.rowCount && orgRes.rows[0]?.status === "suspended") {
        return { success: false, error: "This organization account has been suspended. Please contact Duesly support." };
      }
      orgType = orgRes.rows[0]?.type || "Market";
    }

    const token = "SES-" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    await pool.query("UPDATE users SET session_token = $1 WHERE LOWER(email) = $2", [token, user.email.toLowerCase()]);

    return {
      success: true,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        org_id: user.org_id,
        org_type: orgType,
        sessionToken: token
      }
    };
  });

import { sendEmail, sendPaymentAlert } from "./email";

// Dynamic Forgot Password flow
export const forgotPassword = createServerFn({ method: "POST" })
  .validator(z.object({
    email: z.string().email()
  }))
  .handler(async ({ data }) => {
    const res = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1", [data.email.toLowerCase()]);
    if (res.rowCount === 0) {
      // Do not leak existence, return success message
      return { success: true, message: "If this email is registered, a password reset link has been sent." };
    }
    const user = res.rows[0];
    
    // Dispatch real email with reset instructions
    const resetUrl = `${getAppBaseUrl()}/login?reset_email=${encodeURIComponent(user.email)}`;
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request — Duesly",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0b1a3a;">Duesly Password Reset</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>We received a request to reset your Duesly password. Click the button below to sign in and update your credentials:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 12px; color: #718096;">If you didn't request this, you can safely ignore this email.</p>
          <p style="font-size: 11px; color: #a0aec0; border-top: 1px dashed #e2e8f0; padding-top: 15px; margin-top: 20px; text-align: center;">Powered by Duesly Technologies</p>
        </div>
      `
    });

    return { success: true, message: "If this email is registered, a password reset link has been sent." };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .validator(z.object({
    email: z.string().email(),
    password: z.string().min(6)
  }))
  .handler(async ({ data }) => {
    const res = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1", [data.email.toLowerCase()]);
    if (res.rowCount === 0) {
      return { success: false, error: "Account not found." };
    }
    await pool.query(
      "UPDATE users SET password = $1 WHERE LOWER(email) = $2",
      [data.password, data.email.toLowerCase()]
    );
    return { success: true };
  });

// Dynamic Settings Update
export const updateUserProfile = createServerFn({ method: "POST" })
  .validator(z.object({
    email: z.string().email(),
    name: z.string().min(2),
    password: z.string().min(6)
  }))
  .handler(async ({ data }) => {
    // Sanitize user-provided display name
    const sanitizedName = data.name.replace(/<[^>]*>/g, "").trim();

    const res = await pool.query(
      `UPDATE users 
       SET name = $1, password = $2 
       WHERE LOWER(email) = $3 
       RETURNING email, name, role, org_id`,
      [sanitizedName, data.password, data.email.toLowerCase()]
    );
    if (res.rowCount === 0) {
      return { success: false, error: "User profile not found" };
    }
    const updated = res.rows[0];
    return {
      success: true,
      user: {
        email: updated.email,
        name: updated.name,
        role: updated.role,
        org_id: updated.org_id
      }
    };
  });

export const updateOrganization = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string(),
    name: z.string().min(2),
    type: z.string(),
    expectedCapacity: z.number().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    dailySummaryActive: z.boolean().optional(),
    smsReceiptsActive: z.boolean().optional(),
    weeklyReportActive: z.boolean().optional(),
    underpaymentAlertsActive: z.boolean().optional(),
  }))
  .handler(async ({ data }) => {
    // Sanitize organization details
    const sanitizedName = data.name.replace(/<[^>]*>/g, "").trim();
    const sanitizedType = data.type.replace(/<[^>]*>/g, "").trim();
    const sanitizedPhone = (data.phone || "").replace(/<[^>]*>/g, "").trim();
    const sanitizedAddress = (data.address || "").replace(/<[^>]*>/g, "").trim();
    const capacity = data.expectedCapacity || 100;

    const currentRes = await pool.query("SELECT * FROM organizations WHERE id = $1 LIMIT 1", [data.id]);
    if (currentRes.rowCount === 0) {
      return { success: false, error: "Organization not found" };
    }
    const org = currentRes.rows[0];
    
    const dailySummary = data.dailySummaryActive !== undefined ? data.dailySummaryActive : org.daily_summary_active;
    const smsReceipts = data.smsReceiptsActive !== undefined ? data.smsReceiptsActive : org.sms_receipts_active;
    const weeklyReport = data.weeklyReportActive !== undefined ? data.weeklyReportActive : org.weekly_report_active;
    const underpaymentAlerts = data.underpaymentAlertsActive !== undefined ? data.underpaymentAlertsActive : org.underpayment_alerts_active;

    const res = await pool.query(
      `UPDATE organizations 
       SET name = $1, type = $2, expected_capacity = $3, phone = $4, address = $5,
           daily_summary_active = $6, sms_receipts_active = $7, weekly_report_active = $8, underpayment_alerts_active = $9
       WHERE id = $10 
       RETURNING *`,
      [sanitizedName, sanitizedType, capacity, sanitizedPhone, sanitizedAddress, dailySummary, smsReceipts, weeklyReport, underpaymentAlerts, data.id]
    );

    await writeAuditLog(data.id, null, "Update Settings", `Updated organization settings/profile details for association "${sanitizedName}"`);

    return { success: true, org: res.rows[0] };
  });

// Dynamic User Sign-Up
export const registerUser = createServerFn({ method: "POST" })
  .validator(z.object({
    firstName: z.string(),
    lastName: z.string(),
    orgName: z.string(),
    orgType: z.string().optional(),
    email: z.string().email(),
    password: z.string().min(6)
  }))
  .handler(async ({ data }) => {
    const checkUser = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1", [data.email.toLowerCase()]);
    if (checkUser.rowCount && checkUser.rowCount > 0) {
      return { success: false, error: "An account with this email already exists" };
    }

    const orgId = "ORG-" + Math.floor(100 + Math.random() * 899);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const typeSelected = data.orgType || "Market";
    let walletAccount = "";

    try {
      walletAccount = await createNombaVirtualAccount(data.orgName, "HQ");
    } catch (error: any) {
      console.error("Organization signup blocked by Nomba provisioning failure:", error);
      return { success: false, error: error.message || "Nomba settlement account provisioning failed." };
    }
    
    // 1. Create Organization
    await pool.query(
      "INSERT INTO organizations (id, name, type, status, wallet_account) VALUES ($1, $2, $3, $4, $5)",
      [orgId, data.orgName, typeSelected, "active", walletAccount]
    );

    // 2. Create User (Pending verification)
    const fullName = `${data.firstName} ${data.lastName}`;
    await pool.query(
      "INSERT INTO users (email, password, role, org_id, name, otp, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [data.email.toLowerCase(), data.password, "admin", orgId, fullName, otp, false]
    );

    // 3. Seed default dues categories
    await pool.query(
      `INSERT INTO dues_categories (id, org_id, name, amount, frequency, active, vendors_count)
       VALUES 
       ($1, $2, $3, $4, $5, $6, $7),
       ($8, $2, $9, $10, $5, $6, $7)`,
      [
        "CAT-" + Math.floor(100 + Math.random() * 899),
        orgId,
        "Monthly Market Levy",
        18000,
        "Monthly",
        true,
        0,
        "CAT-" + Math.floor(100 + Math.random() * 899),
        "Sanitation Fee",
        5000
      ]
    );

    // 4. Send verification OTP email via Resend
    let emailSent = false;
    try {
      const emailRes = await sendEmail({
        to: data.email.toLowerCase(),
        subject: "Verification Code — Duesly",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #0b1a3a; text-align: center;">Verify Your Duesly Account</h2>
            <p>Welcome to Duesly! To finalize your registration and activate your portal, please enter the following 6-digit OTP code:</p>
            <div style="text-align: center; margin: 35px 0; background-color: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #edf2f7;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #10b981;">${otp}</span>
            </div>
            <p style="font-size: 12px; color: #718096; text-align: center; line-height: 1.5;">This code is valid for 15 minutes. If you didn't sign up for Duesly, please ignore this message.</p>
            <p style="font-size: 11px; color: #a0aec0; border-top: 1px dashed #e2e8f0; padding-top: 15px; margin-top: 20px; text-align: center;">Duesly Technologies Ltd.</p>
          </div>
        `
      });
      emailSent = emailRes.success;
    } catch (emailErr) {
      console.error("Failed to deliver registration OTP:", emailErr);
    }

    console.log(`=== DEV REGISTRATION OTP CODE FOR ${data.email} IS: ${otp} ===`);

    return {
      success: true,
      otpRequired: true,
      email: data.email.toLowerCase(),
      devOtp: emailSent ? undefined : otp,
      user: {
        email: data.email.toLowerCase(),
        name: fullName,
        role: "admin",
        org_id: orgId,
        org_type: typeSelected
      }
    };
  });

// Verify Sign-Up OTP
export const verifyOTP = createServerFn({ method: "POST" })
  .validator(z.object({
    email: z.string().email(),
    code: z.string().min(6).max(6)
  }))
  .handler(async ({ data }) => {
    const res = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1", [data.email.toLowerCase()]);
    if (res.rowCount === 0) {
      return { success: false, error: "User account not found" };
    }

    const user = res.rows[0];
    if (user.otp !== data.code) {
      return { success: false, error: "Invalid verification code. Please check your email." };
    }

    // Verify user in db
    await pool.query("UPDATE users SET is_verified = true, otp = null WHERE LOWER(email) = $1", [data.email.toLowerCase()]);

    return {
      success: true,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        org_id: user.org_id
      }
    };
  });

// Chat with AI Coach
export const askAICoach = createServerFn({ method: "POST" })
  .validator(z.object({
    question: z.string(),
    orgId: z.string().optional()
  }))
  .handler(async ({ data }) => {
    const activeOrgId = data.orgId || "ORG-001";
    
    // Fetch organization info
    const orgRes = await pool.query("SELECT name FROM organizations WHERE id = $1 LIMIT 1", [activeOrgId]);
    const orgName = orgRes.rows[0]?.name || "Ariaria Market Association";

    const vendorsRes = await pool.query("SELECT * FROM vendors WHERE org_id = $1", [activeOrgId]);
    const vendors = vendorsRes.rows;
    const totalVendors = vendors.length;
    let expected = 0;
    let collected = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    for (const v of vendors) {
      expected += parseFloat(v.due);
      collected += parseFloat(v.paid);
      if (v.status === "paid") paidCount++;
      else if (v.status === "partial") partialCount++;
      else if (v.status === "unpaid") unpaidCount++;
    }
    const outstanding = Math.max(0, expected - collected);

    const fullPrompt = `
      You are Duesly AI, a financial collection assistant for associations in Nigeria.
      The user is the admin of "${orgName}".
      Context:
      - Total Members/Vendors: ${totalVendors}
      - Expected collection: ₦${expected.toLocaleString()}
      - Collected: ₦${collected.toLocaleString()} (${Math.round((collected / (expected || 1)) * 100)}% compliance)
      - Outstanding: ₦${outstanding.toLocaleString()}
      - Unpaid members: ${unpaidCount}, Partially Paid: ${partialCount}, Fully Paid: ${paidCount}
      
      User's Question: "${data.question}"
      
      Provide a highly targeted, brief answer (under 120 words). Focus on actionable strategies, referencing specific sections (e.g. textiles, hardware) and virtual account payment alerts where relevant. Do not mention "Gemini" or "Google Model" — refer to yourself strictly as Duesly AI.
    `;

    const reply = await askGeminiCoach(fullPrompt);
    return { reply };
  });

// Get list of active organizations
export const getActiveOrganizations = createServerFn({ method: "GET" })
  .handler(async () => {
    const res = await pool.query("SELECT id, name, type FROM organizations WHERE status = 'active' ORDER BY name ASC");
    return res.rows.map(org => ({
      id: org.id,
      name: org.name,
      type: org.type
    }));
  });

// Dynamic Member Self-Registration
export const registerMember = createServerFn({ method: "POST" })
  .validator(z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    phone: z.string().min(1),
    orgId: z.string().min(1),
    shop: z.string().min(1),
    section: z.string().min(1)
  }))
  .handler(async ({ data }) => {
    const checkUser = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1", [data.email.toLowerCase()]);
    if (checkUser.rowCount && checkUser.rowCount > 0) {
      return { success: false, error: "An account with this email already exists" };
    }

    const fullName = `${data.firstName} ${data.lastName}`;
    
    const checkVendor = await pool.query(
      "SELECT * FROM vendors WHERE org_id = $1 AND (phone = $2 OR name = $3) LIMIT 1",
      [data.orgId, data.phone, fullName]
    );

    if (checkVendor.rowCount && checkVendor.rowCount > 0) {
      const existingVendor = checkVendor.rows[0];
      await pool.query(
        "INSERT INTO users (email, password, role, org_id, name, is_verified) VALUES ($1, $2, $3, $4, $5, $6)",
        [data.email.toLowerCase(), data.password, "vendor", data.orgId, existingVendor.name, true]
      );
    } else {
      const memberId = "V-" + Math.floor(1000 + Math.random() * 9000);
      let virtualAccount = "";

      try {
        virtualAccount = await createNombaVirtualAccount(fullName, data.shop);
      } catch (error: any) {
        console.error("Member signup blocked by Nomba provisioning failure:", error);
        return { success: false, error: error.message || "Nomba virtual account provisioning failed." };
      }

      await pool.query(
        "INSERT INTO users (email, password, role, org_id, name, is_verified) VALUES ($1, $2, $3, $4, $5, $6)",
        [data.email.toLowerCase(), data.password, "vendor", data.orgId, fullName, true]
      );

      await pool.query(
        `INSERT INTO vendors (id, org_id, name, shop, phone, section, virtual_account, due, paid, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [memberId, data.orgId, fullName, data.shop, data.phone, data.section, virtualAccount, 0, 0, "paid"]
      );
    }

    return {
      success: true,
      user: {
        email: data.email.toLowerCase(),
        name: fullName,
        role: "vendor",
        org_id: data.orgId,
        org_type: "Member"
      }
    };
  });

// Complete Vendor Onboarding (adds user login to existing vendor)
export const completeVendorOnboarding = createServerFn({ method: "POST" })
  .validator(z.object({
    vendorId: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
    withdrawalPin: z.string().length(4)
  }))
  .handler(async ({ data }) => {
    const vendorRes = await pool.query("SELECT * FROM vendors WHERE id = $1 LIMIT 1", [data.vendorId]);
    if (vendorRes.rowCount === 0) {
      return { success: false, error: "Member profile not found" };
    }
    const vendor = vendorRes.rows[0];

    const checkUser = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1", [data.email.toLowerCase()]);
    if (checkUser.rowCount && checkUser.rowCount > 0) {
      return { success: false, error: "An account with this email already exists" };
    }

    await pool.query(
      "INSERT INTO users (email, password, role, org_id, name, is_verified) VALUES ($1, $2, $3, $4, $5, $6)",
      [data.email.toLowerCase(), data.password, "vendor", vendor.org_id, vendor.name, true]
    );

    await pool.query(
      "UPDATE vendors SET email = $1, withdrawal_pin = $2 WHERE id = $3",
      [data.email.toLowerCase(), data.withdrawalPin, data.vendorId]
    );

    await writeAuditLog(vendor.org_id, data.email, "Vendor Onboarding", `Vendor "${vendor.name}" completed onboarding and set their withdrawal PIN.`);

    return {
      success: true,
      user: {
        email: data.email.toLowerCase(),
        name: vendor.name,
        role: "vendor",
        org_id: vendor.org_id,
        org_type: "Member"
      }
    };
  });

// Setup/Update Vendor Withdrawal PIN
export const setVendorWithdrawalPin = createServerFn({ method: "POST" })
  .validator(z.object({
    vendorId: z.string(),
    email: z.string().email(),
    sessionToken: z.string(),
    pin: z.string().length(4)
  }))
  .handler(async ({ data }) => {
    const authRes = await pool.query(
      "SELECT role FROM users WHERE LOWER(email) = $1 AND session_token = $2 LIMIT 1",
      [data.email.toLowerCase(), data.sessionToken]
    );
    if (authRes.rowCount === 0) {
      return { success: false, error: "Unauthorized session. Please log in again." };
    }
    
    const vendorRes = await pool.query("SELECT org_id, name FROM vendors WHERE id = $1 LIMIT 1", [data.vendorId]);
    if (vendorRes.rowCount === 0) {
      return { success: false, error: "Member profile not found" };
    }
    const vendor = vendorRes.rows[0];

    await pool.query(
      "UPDATE vendors SET email = $1, withdrawal_pin = $2 WHERE id = $3",
      [data.email.toLowerCase(), data.pin, data.vendorId]
    );

    await writeAuditLog(vendor.org_id, data.email, "Set Withdrawal PIN", `Vendor "${vendor.name}" initialized/updated their 4-digit transaction PIN.`);
    return { success: true };
  });

// Newsletter Subscription API
export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .validator(z.object({
    email: z.string().email(),
    topic: z.string().min(1)
  }))
  .handler(async ({ data }) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
        email VARCHAR(255) PRIMARY KEY,
        topic VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const checkSub = await pool.query("SELECT * FROM newsletter_subscriptions WHERE LOWER(email) = $1", [data.email.toLowerCase()]);
    if (checkSub.rowCount && checkSub.rowCount > 0) {
      return { success: false, error: "This email is already subscribed to our guides." };
    }

    await pool.query(
      "INSERT INTO newsletter_subscriptions (email, topic) VALUES ($1, $2)",
      [data.email.toLowerCase(), data.topic]
    );

    let topicName = "Market Unions";
    let guideTitle = "Simplifying Trade Group Levies & Automating Bank Reconciliation";
    let stepsHtml = `
      <li><strong>Deploy Dedicated Account Numbers:</strong> Assign unique collection accounts to every trader.</li>
      <li><strong>Automate Verification:</strong> Prevent ledger fraud by matching transfers directly via Nomba webhooks.</li>
      <li><strong>Audit Instantly:</strong> Export unified reports for union executives in one click.</li>
    `;

    if (data.topic === "Estates") {
      topicName = "Residential Estates";
      guideTitle = "Residential Security & Maintenance Dues Automation Guide";
      stepsHtml = `
        <li><strong>Automate Maintenance Fees:</strong> Generate monthly security and sanitation bills automatically.</li>
        <li><strong>Notify Residents:</strong> Send automated receipts via email/SMS immediately when payments clear.</li>
        <li><strong>Control Access:</strong> Reconcile outstanding dues to easily manage gate entry permissions.</li>
      `;
    } else if (data.topic === "Cooperatives") {
      topicName = "Cooperatives & Thrift Unions";
      guideTitle = "Automating Thrift Ledgers & Cooperative Contributions";
      stepsHtml = `
        <li><strong>Track Dividends:</strong> Record monthly member contributions on a secure ledger.</li>
        <li><strong>Prevent Fraud:</strong> Eliminate manual receipt writing and bank transfer slip falsification.</li>
        <li><strong>Approve Payouts:</strong> Set dual authorization rules for thrift payouts.</li>
      `;
    }

    try {
      await sendEmail({
        to: data.email,
        subject: `Your Guide to ${topicName} Collections — Duesly`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #0b1a3a; text-align: center;">Duesly Collections Guide</h2>
            <p>Hello,</p>
            <p>Thank you for subscribing to our newsletter. Below is your curated strategy guide on <strong>${guideTitle}</strong>:</p>
            
            <div style="background-color: #f8fafc; padding: 18px; border-radius: 8px; border: 1px solid #edf2f7; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #0b1a3a; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Top 3 Best Practices:</h4>
              <ul style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 1.6; color: #4a5568;">
                ${stepsHtml}
              </ul>
            </div>

            <p style="font-size: 13px; color: #4a5568; line-height: 1.5;">We will send you a monthly guide containing case studies and optimization tips from verified managers using Duesly.</p>
            <p style="font-size: 11px; color: #a0aec0; border-top: 1px dashed #e2e8f0; padding-top: 15px; margin-top: 20px; text-align: center;">Duesly Technologies Ltd.</p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error("Failed to send welcome guide email:", emailErr);
    }

    return { success: true };
  });

// Notifications Database Actions
export const getNotifications = createServerFn({ method: "POST" })
  .validator(z.object({
    role: z.string(),
    orgId: z.string().optional().nullable(),
    vendorId: z.string().optional().nullable(),
  }))
  .handler(async ({ data }) => {
    const roleKey = data.role === "Super Admin" || data.role === "super-admin" ? "super-admin" : data.role;
    let query = "SELECT * FROM notifications WHERE role = $1";
    const params: any[] = [roleKey];

    if (roleKey === "admin") {
      query += " AND org_id = $2";
      params.push(data.orgId);
    } else if (roleKey === "vendor") {
      query += " AND vendor_id = $2";
      params.push(data.vendorId);
    }

    query += " ORDER BY created_at DESC";
    const res = await pool.query(query, params);
    return res.rows;
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string(),
  }))
  .handler(async ({ data }) => {
    await pool.query("UPDATE notifications SET read = true WHERE id = $1", [data.id]);
    return { success: true };
  });

export const clearAllNotifications = createServerFn({ method: "POST" })
  .validator(z.object({
    role: z.string(),
    orgId: z.string().optional().nullable(),
    vendorId: z.string().optional().nullable(),
  }))
  .handler(async ({ data }) => {
    const roleKey = data.role === "Super Admin" || data.role === "super-admin" ? "super-admin" : data.role;
    let query = "DELETE FROM notifications WHERE role = $1";
    const params: any[] = [roleKey];

    if (roleKey === "admin") {
      query += " AND org_id = $2";
      params.push(data.orgId);
    } else if (roleKey === "vendor") {
      query += " AND vendor_id = $2";
      params.push(data.vendorId);
    }

    await pool.query(query, params);
    return { success: true };
  });

export async function createNotification(orgId: string | null, vendorId: string | null, role: string, title: string, message: string) {
  const id = "NT-" + Math.random().toString(36).substring(2, 9).toUpperCase();
  try {
    await pool.query(
      "INSERT INTO notifications (id, org_id, vendor_id, role, title, message, read) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [id, orgId, vendorId, role, title, message, false]
    );
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

export const sendPaymentReminder = createServerFn({ method: "POST" })
  .validator(z.object({
    vendorId: z.string(),
    orgId: z.string(),
  }))
  .handler(async ({ data }) => {
    const vendorRes = await pool.query("SELECT name, due, paid, phone FROM vendors WHERE id = $1", [data.vendorId]);
    if (!vendorRes.rowCount) {
      return { success: false, error: "Vendor not found" };
    }
    const vendor = vendorRes.rows[0];
    const outstanding = Math.max(0, parseFloat(vendor.due) - parseFloat(vendor.paid));

    if (outstanding <= 0) {
      return { success: false, error: "This vendor has no outstanding levies." };
    }

    const orgRes = await pool.query("SELECT name FROM organizations WHERE id = $1", [data.orgId]);
    const orgName = orgRes.rows[0]?.name || "Duesly Admin";

    await createNotification(
      data.orgId,
      data.vendorId,
      "vendor",
      "Payment Reminder Notice",
      `${orgName} Admin has requested payment for your outstanding levy balance of ₦${outstanding.toLocaleString()}. Please deposit via bank transfer to your dedicated payment account.`
    );

    await createNotification(
      data.orgId,
      null,
      "admin",
      "Reminder Sent",
      `Payment reminder for outstanding dues of ₦${outstanding.toLocaleString()} successfully dispatched to ${vendor.name} (${vendor.phone}).`
    );

    return { success: true };
  });

export const sendReconciliationReminder = createServerFn({ method: "POST" })
  .validator(z.object({
    reconciliationId: z.string(),
    orgId: z.string()
  }))
  .handler(async ({ data }) => {
    const recRes = await pool.query("SELECT vendor_name, paid, expected FROM reconciliations WHERE id = $1", [data.reconciliationId]);
    if (!recRes.rowCount) {
      return { success: false, error: "Reconciliation transaction not found" };
    }
    const rec = recRes.rows[0];

    const vendorRes = await pool.query("SELECT id, phone FROM vendors WHERE name = $1 AND org_id = $2", [rec.vendor_name, data.orgId]);
    if (!vendorRes.rowCount) {
      return { success: false, error: `Vendor "${rec.vendor_name}" is not registered on the portal.` };
    }
    const vendor = vendorRes.rows[0];

    const outstanding = Math.max(0, parseFloat(rec.expected) - parseFloat(rec.paid));
    const orgRes = await pool.query("SELECT name FROM organizations WHERE id = $1", [data.orgId]);
    const orgName = orgRes.rows[0]?.name || "Duesly Admin";

    await createNotification(
      data.orgId,
      vendor.id,
      "vendor",
      "Payment Underpayment Notice",
      `Your recent payment of ₦${parseFloat(rec.paid).toLocaleString()} underpaid the expected levy billing of ₦${parseFloat(rec.expected).toLocaleString()}. Please transfer the remaining balance of ₦${outstanding.toLocaleString()} to your dedicated payment account.`
    );

    await createNotification(
      data.orgId,
      null,
      "admin",
      "Reminder Sent",
      `Payment reminder for underpayment discrepancy of ₦${outstanding.toLocaleString()} successfully sent to ${rec.vendor_name}.`
    );

    return { success: true };
  });

export const resendReconciliationReceipt = createServerFn({ method: "POST" })
  .validator(z.object({
    reconciliationId: z.string(),
    orgId: z.string()
  }))
  .handler(async ({ data }) => {
    const recRes = await pool.query("SELECT vendor_name, paid FROM reconciliations WHERE id = $1", [data.reconciliationId]);
    if (!recRes.rowCount) {
      return { success: false, error: "Reconciliation record not found" };
    }
    const rec = recRes.rows[0];

    const vendorRes = await pool.query("SELECT id, email FROM vendors WHERE name = $1 AND org_id = $2", [rec.vendor_name, data.orgId]);
    const vendor = vendorRes.rows[0];

    if (vendor) {
      await createNotification(
        data.orgId,
        vendor.id,
        "vendor",
        "Receipt Re-dispatched",
        `Your receipt for the matched payment of ₦${parseFloat(rec.paid).toLocaleString()} has been re-sent. You can download it anytime from your history ledger.`
      );
    }

    await createNotification(
      data.orgId,
      null,
      "admin",
      "Receipt Re-dispatched",
      `A copy of the matched payment receipt for ₦${parseFloat(rec.paid).toLocaleString()} has been re-dispatched to ${rec.vendor_name}.`
    );

    return { success: true };
  });

export const submitSettlementChangeRequest = createServerFn({ method: "POST" })
  .validator(z.object({
    orgId: z.string(),
    bankName: z.string().min(1),
    accountNumber: z.string().min(10),
    reason: z.string().min(10),
  }))
  .handler(async ({ data }) => {
    const orgRes = await pool.query("SELECT name FROM organizations WHERE id = $1", [data.orgId]);
    if (!orgRes.rowCount) {
      return { success: false, error: "Organization not found" };
    }
    const orgName = orgRes.rows[0].name;

    await createNotification(
      null,
      null,
      "super-admin",
      "Payout Bank Change Request",
      `Organization "${orgName}" (ID: ${data.orgId}) has requested a payout bank change to ${data.bankName} (${data.accountNumber}). Reason: "${data.reason}".`
    );

    await createNotification(
      data.orgId,
      null,
      "admin",
      "Change Request Submitted",
      `Payout bank change request to ${data.bankName} (${data.accountNumber}) has been submitted for platform operations review.`
    );

    return { success: true };
  });

export const shareVendorReceipts = createServerFn({ method: "POST" })
  .validator(z.object({
    vendorId: z.string(),
    orgId: z.string()
  }))
  .handler(async ({ data }) => {
    const vendorRes = await pool.query("SELECT name, phone FROM vendors WHERE id = $1", [data.vendorId]);
    if (!vendorRes.rowCount) {
      return { success: false, error: "Vendor not found" };
    }
    const vendor = vendorRes.rows[0];

    const recRes = await pool.query("SELECT COUNT(*) FROM receipts WHERE vendor_name = $1 AND org_id = $2", [vendor.name, data.orgId]);
    const count = parseInt(recRes.rows[0].count || "0");

    if (count === 0) {
      return { success: false, error: "No receipt records exist for this vendor." };
    }

    await createNotification(
      data.orgId,
      data.vendorId,
      "vendor",
      "Receipt Ledger Shared",
      `Your organization admin has dispatched a compiled list of ${count} verified payment receipts to your registered contact number.`
    );

    await createNotification(
      data.orgId,
      null,
      "admin",
      "Receipts Shared",
      `Successfully dispatched SMS & WhatsApp receipt ledger (${count} files) to ${vendor.name} (${vendor.phone}).`
    );

    return { success: true, count };
  });

export const submitSupportTicket = createServerFn({ method: "POST" })
  .validator(z.object({
    vendorId: z.string(),
    orgId: z.string(),
    category: z.string(),
    message: z.string()
  }))
  .handler(async ({ data }) => {
    const vendorRes = await pool.query("SELECT name, shop, phone FROM vendors WHERE id = $1", [data.vendorId]);
    if (!vendorRes.rowCount) {
      return { success: false, error: "Member not found" };
    }
    const vendor = vendorRes.rows[0];

    // Create admin ticket notification
    await createNotification(
      data.orgId,
      null,
      "admin",
      `Support Inquiry: ${data.category}`,
      `Member "${vendor.name}" (Shop ${vendor.shop}) sent a request:\n"${data.message}"\nContact: ${vendor.phone}`
    );

    // Create vendor confirmation notification
    await createNotification(
      data.orgId,
      data.vendorId,
      "vendor",
      "Support Ticket Logged",
      `Your support request regarding "${data.category}" was successfully logged. Message: "${data.message}"`
    );

    return { success: true };
  });

export const getExportTransactions = createServerFn({ method: "GET" })
  .validator(z.object({
    orgId: z.string().optional()
  }).optional())
  .handler(async ({ data }) => {
    const activeOrgId = data?.orgId || "ORG-001";
    const res = await pool.query(
      `SELECT p.id, p.vendor_name as vendor, p.account, p.amount, p.category, p.date, p.status, COALESCE(v.section, 'General') as section
       FROM payments p
       LEFT JOIN vendors v ON LOWER(p.vendor_name) = LOWER(v.name) AND p.org_id = v.org_id
       WHERE p.org_id = $1
       ORDER BY p.id DESC`,
      [activeOrgId]
    );

    return res.rows.map(p => ({
      id: p.id,
      vendor: p.vendor,
      account: p.account,
      amount: parseFloat(p.amount),
      category: p.category,
      date: p.date,
      status: p.status,
      section: p.section
    }));
  });

export const submitContactForm = createServerFn({ method: "POST" })
  .validator(z.object({
    name: z.string().min(2),
    email: z.string().email(),
    subject: z.string().min(3),
    message: z.string().min(5)
  }))
  .handler(async ({ data }) => {
    const emailContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0b1a3a;">New Contact Inquiry</h2>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Subject:</strong> ${data.subject}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap; background-color: #f7fafc; padding: 15px; border-radius: 8px;">${data.message}</p>
      </div>
    `;

    const res = await sendEmail({
      to: "canipf.ng@gmail.com",
      subject: `Duesly Inquiry: ${data.subject}`,
      html: emailContent,
    });

    return res;
  });

export const getSystemSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    const res = await pool.query("SELECT * FROM system_settings");
    const settings: Record<string, boolean> = {
      auto_approve: true,
      send_sms: true,
      enable_ussd: false,
      whatsapp_bot: false
    };
    for (const r of res.rows) {
      settings[r.key] = r.value === "true";
    }
    return {
      autoApprove: settings.auto_approve,
      sendSms: settings.send_sms,
      enableUssd: settings.enable_ussd,
      whatsappBot: settings.whatsapp_bot
    };
  });

export const updateSystemSetting = createServerFn({ method: "POST" })
  .validator(z.object({
    key: z.string(),
    value: z.boolean()
  }))
  .handler(async ({ data }) => {
    const strVal = data.value ? "true" : "false";
    await pool.query(
      "INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
      [data.key, strVal]
    );
    return { success: true };
  });

export const simulateIncomingPayment = createServerFn({ method: "POST" })
  .validator(z.object({
    vendorId: z.string(),
    amount: z.number().positive(),
  }))
  .handler(async ({ data }) => {
    const vendorRes = await pool.query("SELECT * FROM vendors WHERE id = $1 LIMIT 1", [data.vendorId]);
    if (!vendorRes.rowCount) {
      return { success: false, error: "Member not found" };
    }
    const vendor = vendorRes.rows[0];

    const currentPaid = parseFloat(vendor.paid) || 0;
    const currentDue = parseFloat(vendor.due) || 0;
    const newPaid = currentPaid + data.amount;

    let status = "unpaid";
    if (newPaid >= currentDue) {
      status = "paid";
    } else if (newPaid > 0) {
      status = "partial";
    }

    // Update vendor balances
    await pool.query(
      "UPDATE vendors SET paid = $1, status = $2 WHERE id = $3",
      [newPaid, status, vendor.id]
    );

    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Log transaction payment
    const txnId = "TXN-" + Math.floor(100000 + Math.random() * 900000);
    await pool.query(
      `INSERT INTO payments (id, org_id, vendor_id, vendor_name, account, amount, category, date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [txnId, vendor.org_id, vendor.id, vendor.name, vendor.virtual_account, data.amount, "Dedicated Transfer", todayStr, "Matched"]
    );

    // Issue receipt
    const rcpId = generateReceiptId(txnId);
    await pool.query(
      `INSERT INTO receipts (id, org_id, vendor_name, category, amount, date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [rcpId, vendor.org_id, vendor.name, "Dedicated Transfer", data.amount, todayStr, "Issued"]
    );

    // Dispatch notification alert
    await createNotification(
      vendor.org_id,
      vendor.id,
      "vendor",
      "Payment Reconciled",
      `Your bank transfer of ₦${data.amount.toLocaleString()} was successfully processed and receipt ${rcpId} has been issued.`
    );

    return { success: true };
  });

export const submitWithdrawalRequest = createServerFn({ method: "POST" })
  .validator(z.object({
    vendorId: z.string(),
    orgId: z.string(),
    amount: z.number(),
    bankName: z.string(),
    accountNumber: z.string(),
    email: z.string().email(),
    sessionToken: z.string(),
    pin: z.string().length(4)
  }))
  .handler(async ({ data }) => {
    // Validate session
    const authRes = await pool.query(
      "SELECT role FROM users WHERE LOWER(email) = $1 AND session_token = $2 LIMIT 1",
      [data.email.toLowerCase(), data.sessionToken]
    );
    if (authRes.rowCount === 0) {
      return { success: false, error: "Unauthorized session. Please log in again." };
    }

    const vendorRes = await pool.query("SELECT name, shop, phone, paid, email, withdrawal_pin FROM vendors WHERE id = $1", [data.vendorId]);
    if (!vendorRes.rowCount) {
      return { success: false, error: "Member profile not found" };
    }
    const vendor = vendorRes.rows[0];

    // Validate security PIN
    if (!vendor.withdrawal_pin || vendor.withdrawal_pin !== data.pin) {
      return { success: false, error: "Invalid transaction security PIN" };
    }

    // Verify requesting email matches vendor's email
    if (vendor.email && vendor.email.toLowerCase() !== data.email.toLowerCase()) {
      return { success: false, error: "Unauthorized vendor account mismatch" };
    }

    // Enforce Single request limit (₦100,000)
    if (data.amount > 100000) {
      return { success: false, error: "Withdrawal amount exceeds single request limit of ₦100,000" };
    }

    // Enforce Daily cumulative limit (₦250,000)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dailySumRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM withdrawals 
       WHERE vendor_id = $1 
         AND created_at >= $2 
         AND status != 'rejected'`,
      [data.vendorId, todayStart]
    );
    const dailySum = parseFloat(dailySumRes.rows[0].total || "0");
    if (dailySum + data.amount > 250000) {
      return { success: false, error: `Daily withdrawal limit of ₦250,000 exceeded. You have already requested ₦${dailySum.toLocaleString()} today.` };
    }

    // Verify balance
    const vendorPaid = parseFloat(vendor.paid) || 0;
    if (vendorPaid < data.amount) {
      return { success: false, error: "Insufficient balance for withdrawal" };
    }

    const withdrawalId = "WD-REQ-" + Math.floor(100000 + Math.random() * 900000);

    // Insert into withdrawals table
    await pool.query(
      `INSERT INTO withdrawals (id, org_id, vendor_id, vendor_name, amount, bank_name, account_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        withdrawalId,
        data.orgId,
        data.vendorId,
        vendor.name,
        data.amount,
        data.bankName,
        data.accountNumber,
        "pending"
      ]
    );

    // Create admin notification
    await createNotification(
      data.orgId,
      null,
      "admin",
      "Withdrawal Request: Pending",
      `Member "${vendor.name}" (Shop ${vendor.shop}) requested a withdrawal of ₦${data.amount.toLocaleString()} to ${data.bankName} (${data.accountNumber}).\nContact: ${vendor.phone}\n[Withdrawal ID: ${withdrawalId}]`
    );

    // Create vendor notification
    await createNotification(
      data.orgId,
      data.vendorId,
      "vendor",
      "Withdrawal Logged",
      `Your withdrawal request of ₦${data.amount.toLocaleString()} to ${data.bankName} (${data.accountNumber}) is pending administrator approval.`
    );

    // Write audit log
    await writeAuditLog(
      data.orgId,
      data.email,
      "Submit Withdrawal",
      `Requested withdrawal of ₦${data.amount.toLocaleString()} to ${data.bankName} (${data.accountNumber}) [ID: ${withdrawalId}]`
    );

    return { success: true };
  });

export const approveWithdrawalRequest = createServerFn({ method: "POST" })
  .validator(z.object({
    notificationId: z.string(),
    adminEmail: z.string().email(),
    sessionToken: z.string()
  }))
  .handler(async ({ data }) => {
    // Validate session
    const authRes = await pool.query(
      "SELECT role FROM users WHERE LOWER(email) = $1 AND session_token = $2 LIMIT 1",
      [data.adminEmail.toLowerCase(), data.sessionToken]
    );
    if (authRes.rowCount === 0) {
      return { success: false, error: "Unauthorized session. Please log in again." };
    }
    const caller = authRes.rows[0];
    if (caller.role !== "admin" && caller.role !== "super-admin") {
      return { success: false, error: "Unauthorized: Insufficient permissions" };
    }

    const notiRes = await pool.query("SELECT * FROM notifications WHERE id = $1", [data.notificationId]);
    if (!notiRes.rowCount) {
      return { success: false, error: "Request not found" };
    }
    const noti = notiRes.rows[0];

    const withdrawalIdMatch = noti.message.match(/\[Withdrawal ID:\s*([^\]]+)\]/);
    let vendorName = "";
    let amount = 0;
    let rawBank = "Zenith Bank";
    let destinationAccount = "";
    let vendorId = "";
    let withdrawalRow: any = null;

    if (withdrawalIdMatch) {
      const withdrawalId = withdrawalIdMatch[1].trim();
      const wdRes = await pool.query("SELECT * FROM withdrawals WHERE id = $1 LIMIT 1", [withdrawalId]);
      if (wdRes.rowCount) {
        withdrawalRow = wdRes.rows[0];
        if (withdrawalRow.status !== "pending") {
          return { success: false, error: "This withdrawal request has already been processed" };
        }
        amount = parseFloat(withdrawalRow.amount);
        rawBank = withdrawalRow.bank_name;
        destinationAccount = withdrawalRow.account_number;
        vendorId = withdrawalRow.vendor_id;
        vendorName = withdrawalRow.vendor_name;
      }
    }

    if (!withdrawalRow) {
      const nameMatch = noti.message.match(/Member\s*"([^"]+)"/i);
      const amountMatch = noti.message.match(/withdrawal of\s*₦?([\d,]+)/i);
      if (!nameMatch || !amountMatch) {
        return { success: false, error: "Could not parse request details" };
      }
      vendorName = nameMatch[1];
      amount = parseFloat(amountMatch[1].replace(/,/g, ""));
      const bankMatch = noti.message.match(/to\s*([^(\n]+)/i);
      rawBank = bankMatch ? bankMatch[1].trim() : "Zenith Bank";
    }

    let vendorRes;
    if (vendorId) {
      vendorRes = await pool.query("SELECT * FROM vendors WHERE id = $1 LIMIT 1", [vendorId]);
    } else {
      vendorRes = await pool.query("SELECT * FROM vendors WHERE name = $1 AND org_id = $2", [vendorName, noti.org_id]);
    }

    if (!vendorRes.rowCount) {
      return { success: false, error: "Member not found" };
    }
    const vendor = vendorRes.rows[0];
    
    const currentPaid = parseFloat(vendor.paid) || 0;
    if (currentPaid < amount) {
      return { success: false, error: "Member has insufficient paid balance for this payout" };
    }

    const txnId = "WD-" + Math.floor(100000 + Math.random() * 900000);
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    // Execute real transfer payout via Nomba API
    try {
      const accessToken = await getNombaAccessToken();
      const parentAccountId = process.env.NOMBA_PARENT_ACCOUNT_ID;
      
      if (!withdrawalRow) {
        const accountNoMatch = noti.message.match(/\((\d{10})\)/);
        destinationAccount = accountNoMatch ? accountNoMatch[1].trim() : "";
      }
      
      const getBankCode = (bankName: string) => {
        const name = bankName.toLowerCase();
        if (name.includes("zenith")) return "057";
        if (name.includes("access")) return "044";
        if (name.includes("guaranty") || name.includes("gtb") || name.includes("gtbank")) return "058";
        if (name.includes("united") || name.includes("uba")) return "033";
        if (name.includes("first")) return "011";
        if (name.includes("opay") || name.includes("paycom")) return "305";
        if (name.includes("palmpay")) return "100033";
        if (name.includes("moniepoint")) return "090405";
        if (name.includes("kuda")) return "090267";
        if (name.includes("stanbic")) return "039";
        if (name.includes("sterling")) return "050";
        if (name.includes("union")) return "032";
        if (name.includes("wema")) return "035";
        if (name.includes("fidelity")) return "070";
        if (name.includes("polaris")) return "076";
        if (name.includes("fcmb")) return "214";
        if (name.includes("nombank") || name.includes("nomba")) return "090001";
        return "057";
      };
      
      const bankCode = getBankCode(rawBank);
      
      if (!accessToken || !parentAccountId || !destinationAccount) {
        return { success: false, error: "API Payout credentials or destination account missing" };
      }
      
      console.log(`Initiating live Nomba payout of ₦${amount} to ${destinationAccount} (${rawBank})`);
      
      const transferRes = await fetch("https://api.nomba.com/v2/transfers/bank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "accountId": parentAccountId
        },
        body: JSON.stringify({
          amount: amount,
          accountNumber: destinationAccount,
          accountName: vendor.name,
          bankCode: bankCode,
          merchantTxRef: txnId,
          senderName: "Duesly Pay Technologies",
          narration: `Payout refund ${vendorName}`
        })
      });

      if (!transferRes.ok) {
        const errBody = await transferRes.text();
        console.error(`Nomba transfer disbursement failed: ${transferRes.status} - ${errBody}`);
        let errMsg = `Nomba Error (${transferRes.status})`;
        try {
          const parsedErr = JSON.parse(errBody);
          errMsg = parsedErr.description || parsedErr.message || errMsg;
        } catch (_) {}
        return { success: false, error: `Disbursement Failed: ${errMsg}` };
      }

      const transferData = await transferRes.json();
      console.log("Nomba transfer disbursement successful response:", transferData);
      
    } catch (apiErr: any) {
      console.error("Failed to execute live Nomba payout transfer:", apiErr);
      return { success: false, error: `Connection failed: ${apiErr.message || apiErr}` };
    }

    // Payout succeeded on Nomba API! Commit database changes:
    const newPaid = currentPaid - amount;
    const due = parseFloat(vendor.due);
    let status = "unpaid";
    if (newPaid >= due) {
      status = newPaid > due ? "overpaid" : "paid";
    } else if (newPaid > 0) {
      status = "partial";
    }

    await pool.query(
      "UPDATE vendors SET paid = $1, status = $2 WHERE id = $3",
      [newPaid, status, vendor.id]
    );

    await pool.query(
      `INSERT INTO payments (id, org_id, vendor_id, vendor_name, account, amount, category, date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        txnId,
        vendor.org_id,
        vendor.id,
        vendor.name,
        vendor.virtual_account,
        -amount,
        "Withdrawal Refund",
        todayStr,
        "Refunded"
      ]
    );

    // Insert receipt log (debit)
    const rcpId = generateReceiptId(txnId);
    await pool.query(
      `INSERT INTO receipts (id, org_id, vendor_name, category, amount, date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [rcpId, vendor.org_id, vendor.name, "Withdrawal Refund", -amount, todayStr, "Refunded"]
    );

    if (withdrawalRow) {
      await pool.query("UPDATE withdrawals SET status = 'approved' WHERE id = $1", [withdrawalRow.id]);
    }

    await pool.query("UPDATE notifications SET read = true WHERE id = $1", [data.notificationId]);

    await createNotification(
      vendor.org_id,
      vendor.id,
      "vendor",
      "Withdrawal Approved",
      `Your withdrawal of ₦${amount.toLocaleString()} has been approved and transferred to your bank account.`
    );

    await writeAuditLog(
      vendor.org_id,
      data.adminEmail,
      "Approve Withdrawal",
      `Approved withdrawal of ₦${amount.toLocaleString()} for vendor "${vendor.name}" (ID: ${vendor.id}) to ${rawBank} (${destinationAccount}) [Txn ID: ${txnId}]`
    );

    return { success: true };
  });

// Super Admin Profit Payout Withdrawal
export const submitSuperAdminWithdrawal = createServerFn({ method: "POST" })
  .validator(z.object({
    email: z.string().email(),
    amount: z.number().positive(),
    bankName: z.string().min(1),
    accountNumber: z.string().length(10),
    accountName: z.string().min(1),
    saveDetails: z.boolean()
  }))
  .handler(async ({ data }) => {
    // 1. Verify user exists and is a super-admin
    const userCheck = await pool.query(
      "SELECT role FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [data.email]
    );
    if (userCheck.rowCount === 0 || userCheck.rows[0].role !== "super-admin") {
      return { success: false, error: "Unauthorized. Requires Super Admin privileges." };
    }

    // 2. Fetch profit wallet balance
    const walletRes = await pool.query("SELECT balance FROM super_admin_wallet LIMIT 1");
    const wallet = walletRes.rows[0];
    if (!wallet) {
      return { success: false, error: "Platform profit wallet not initialized" };
    }
    const balance = parseFloat(wallet.balance);
    if (data.amount > balance) {
      return { success: false, error: `Insufficient wallet balance. Available: ₦${balance.toLocaleString()}` };
    }

    // 3. Resolve bank code
    const getBankCode = (bankName: string) => {
      const name = bankName.toLowerCase();
      if (name.includes("zenith")) return "057";
      if (name.includes("access")) return "044";
      if (name.includes("guaranty") || name.includes("gtb") || name.includes("gtbank")) return "058";
      if (name.includes("united") || name.includes("uba")) return "033";
      if (name.includes("first")) return "011";
      if (name.includes("opay") || name.includes("paycom")) return "305";
      if (name.includes("palmpay")) return "100033";
      if (name.includes("moniepoint")) return "090405";
      if (name.includes("kuda")) return "090267";
      if (name.includes("stanbic")) return "039";
      if (name.includes("sterling")) return "050";
      if (name.includes("union")) return "032";
      if (name.includes("wema")) return "035";
      if (name.includes("fidelity")) return "070";
      if (name.includes("polaris")) return "076";
      if (name.includes("fcmb")) return "214";
      if (name.includes("nombank") || name.includes("nomba")) return "090001";
      return "057";
    };

    const bankCode = getBankCode(data.bankName);

    // 4. Trigger live Nomba payout transfer
    try {
      const accessToken = await getNombaAccessToken();
      const parentAccountId = process.env.NOMBA_PARENT_ACCOUNT_ID;
      if (!accessToken || !parentAccountId) {
        return { success: false, error: "Nomba payout credentials missing on server" };
      }

      const txnId = "WDS-" + Math.floor(100000 + Math.random() * 900000);
      console.log(`Executing live Super Admin profit withdrawal of ₦${data.amount} to ${data.accountNumber} (${data.bankName})`);

      const transferRes = await fetch("https://api.nomba.com/v2/transfers/bank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "accountId": parentAccountId
        },
        body: JSON.stringify({
          amount: data.amount,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
          bankCode: bankCode,
          merchantTxRef: txnId,
          senderName: "Duesly Pay Technologies",
          narration: `Super Admin Profit Payout`
        })
      });

      if (!transferRes.ok) {
        const errBody = await transferRes.text();
        console.error(`Super Admin payout failed: ${transferRes.status} - ${errBody}`);
        let errMsg = `Nomba Error (${transferRes.status})`;
        try {
          const parsedErr = JSON.parse(errBody);
          errMsg = parsedErr.description || parsedErr.message || errMsg;
        } catch (_) {}
        return { success: false, error: `Nomba Payout Failed: ${errMsg}` };
      }

      const transferData = await transferRes.json();
      console.log("Super Admin payout successful:", transferData);

    } catch (err: any) {
      console.error("Failed to execute live Nomba transfer for Super Admin:", err);
      return { success: false, error: `Connection failed: ${err.message || err}` };
    }

    // 5. Update profit wallet balance & saved details
    await pool.query(
      `UPDATE super_admin_wallet 
       SET balance = balance - $1,
           saved_bank_name = CASE WHEN $2 = true THEN $3 ELSE saved_bank_name END,
           saved_account_number = CASE WHEN $2 = true THEN $4 ELSE saved_account_number END,
           saved_account_name = CASE WHEN $2 = true THEN $5 ELSE saved_account_name END`,
      [data.amount, data.saveDetails, data.bankName, data.accountNumber, data.accountName]
    );

    // 6. Write audit log
    await writeAuditLog(
      null,
      data.email,
      "Profit Withdrawal",
      `Withdrew ₦${data.amount.toLocaleString()} platform profits to ${data.bankName} (${data.accountNumber} - ${data.accountName})`
    );

    return { success: true };
  });
