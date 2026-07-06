import { createServerFn } from "@tanstack/react-start";
import { pool } from "./db";
import { z } from "zod";
import { askGeminiCoach } from "./gemini";

const generateId = (prefix: string) => prefix + "-" + Math.floor(1000 + Math.random() * 9000);

// Get Organization Admin Dashboard Data
export const getDashboardData = createServerFn({ method: "GET" })
  .validator(z.object({
    orgId: z.string().optional()
  }).optional())
  .handler(async ({ data }) => {
    const activeOrgId = data?.orgId || "ORG-001";
    // 1. Fetch organization details
    const orgRes = await pool.query("SELECT * FROM organizations WHERE id = $1 LIMIT 1", [activeOrgId]);
    const orgName = orgRes.rows[0]?.name || "Ariaria Market Association";
    const orgType = orgRes.rows[0]?.type || "Market";

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

    // 4. Fetch category breakdown
    const catRes = await pool.query("SELECT name, amount FROM dues_categories WHERE org_id = $1", [activeOrgId]);
    const colors = ["var(--emerald)", "var(--navy)", "var(--gold)", "var(--info)", "var(--warning)"];
    const categoryBreakdown = catRes.rows.map((row, idx) => ({
      name: row.name,
      value: parseFloat(row.amount) * totalVendors,
      color: colors[idx % colors.length]
    }));

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
          collected: Number((collected / 1000000).toFixed(3)),
          expected: Number((expected / 1000000).toFixed(3))
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

    return {
      orgName,
      orgType,
      orgStatus,
      stats: {
        totalVendors,
        expected,
        collected,
        outstanding,
        paid: paidCount,
        partial: partialCount,
        unpaid: unpaidCount,
        overpaid: overpaidCount,
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
    const activeOrgId = data?.orgId || "ORG-001";
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
    const virtualAccount = "9032 " + Math.floor(1000 + Math.random() * 9000) + " " + Math.floor(10 + Math.random() * 90);
    
    await pool.query(
      `INSERT INTO vendors (id, org_id, name, shop, phone, section, virtual_account, due, paid, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, activeOrgId, data.name, data.shop, data.phone, data.section, virtualAccount, 18000, 0, "unpaid"]
    );

    return { success: true, id, virtualAccount };
  });

// Get Dues Categories
export const getDuesCategories = createServerFn({ method: "GET" })
  .validator(z.object({
    orgId: z.string().optional()
  }).optional())
  .handler(async ({ data }) => {
    const activeOrgId = data?.orgId || "ORG-001";
    const res = await pool.query("SELECT * FROM dues_categories WHERE org_id = $1 ORDER BY active DESC, name ASC", [activeOrgId]);
    return res.rows.map(d => ({
      id: d.id,
      name: d.name,
      amount: parseFloat(d.amount),
      frequency: d.frequency,
      active: d.active,
      vendors: d.vendors_count
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
  }))
  .handler(async ({ data }) => {
    const activeOrgId = data.orgId || "ORG-001";
    const id = "CAT-" + Math.floor(10 + Math.random() * 90);
    
    // Count vendors for org
    const countRes = await pool.query("SELECT COUNT(*) FROM vendors WHERE org_id = $1", [activeOrgId]);
    const vendorsCount = parseInt(countRes.rows[0].count);

    await pool.query(
      `INSERT INTO dues_categories (id, org_id, name, amount, frequency, active, vendors_count, target_account)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, activeOrgId, data.name, data.amount, data.frequency, true, vendorsCount, data.targetAccount || 'Main Settlement Wallet (Nomba)']
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

// Generate Bills (applies all active dues categories to vendor dues)
export const generateBills = createServerFn({ method: "POST" })
  .validator(z.object({
    orgId: z.string().optional()
  }).optional())
  .handler(async ({ data }) => {
    const activeOrgId = data?.orgId || "ORG-001";
    // Get sum of active dues categories
    const activeDuesRes = await pool.query("SELECT SUM(amount) FROM dues_categories WHERE org_id = $1 AND active = true", [activeOrgId]);
    const additionalDue = parseFloat(activeDuesRes.rows[0].sum || "0");

    if (additionalDue > 0) {
      // Add this amount to every vendor's due
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
        `Sanitation, monthly levy, and security bills totaling ₦${additionalDue} successfully applied to all members.`
      );
    }

    return { success: true, amountApplied: additionalDue };
  });

// Get Reconciliations Feed
export const getReconciliations = createServerFn({ method: "GET" })
  .validator(z.object({
    orgId: z.string().optional()
  }).optional())
  .handler(async ({ data }) => {
    const activeOrgId = data?.orgId || "ORG-001";
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
          const newPaid = parseFloat(vendor.paid) + amount;
          const due = parseFloat(vendor.due);

          let status = "unpaid";
          if (newPaid >= due) {
            status = newPaid > due ? "overpaid" : "paid";
          } else if (newPaid > 0) {
            status = "partial";
          }

          // Update vendor status
          await pool.query(
            "UPDATE vendors SET paid = $1, status = $2 WHERE id = $3",
            [newPaid, status, vendor.id]
          );

          // Update reconciliation status
          await pool.query(
            "UPDATE reconciliations SET vendor_name = $1, expected = $2, diff = $3, status = $4 WHERE id = $5",
            [vendor.name, due, amount - due, "matched", data.id]
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
              "Matched"
            ]
          );

          // Issue receipt
          const rcpId = "RCP-" + Math.floor(10000 + Math.random() * 90000);
          await pool.query(
            `INSERT INTO receipts (id, org_id, vendor_name, category, amount, date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [rcpId, activeOrgId, vendor.name, "Monthly Levy", amount, "Today", "Issued"]
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
    const activeOrgId = data?.orgId || "ORG-001";
    const res = await pool.query("SELECT * FROM receipts WHERE org_id = $1 ORDER BY id DESC", [activeOrgId]);
    return res.rows.map(r => ({
      id: r.id,
      vendor: r.vendor_name,
      category: r.category,
      amount: parseFloat(r.amount),
      date: r.date,
      status: r.status
    }));
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
          collected: Number((totalCollected / 1000000).toFixed(3)),
          expected: Number((totalExpectedAll / 1000000).toFixed(3))
        });
      } else {
        trend.push({
          month: monthName,
          collected: 0,
          expected: 0
        });
      }
    }

    return {
      stats: {
        totalOrgs,
        totalMembers,
        totalCollected,
        activeOrgs
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
      trend
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
                <p style="margin: 4px 0; font-size: 14px;"><strong>Admin Portal URL:</strong> <a href="http://localhost:3000/login">duesly.app/login</a></p>
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
    
    const res = await pool.query(
      `SELECT * FROM vendors 
       WHERE REPLACE(virtual_account, ' ', '') = $1 
          OR REPLACE(phone, ' ', '') = $1 
          OR LOWER(shop) = $1 
       LIMIT 1`,
      [normalized]
    );

    if (res.rowCount && res.rowCount > 0) {
      const vendor = res.rows[0];

      // Get payment history
      const paymentsRes = await pool.query(
        "SELECT * FROM payments WHERE vendor_id = $1 ORDER BY id DESC",
        [vendor.id]
      );

      // Get receipts
      const receiptsRes = await pool.query(
        "SELECT * FROM receipts WHERE vendor_name = $1 ORDER BY id DESC",
        [vendor.name]
      );

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
        },
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

// Nomba Virtual Account Creation Client
export async function createNombaVirtualAccount(vendorName: string, shopNumber: string) {
  const clientId = process.env.NOMBA_CLIENT_ID;
  const privateKey = process.env.NOMBA_PRIVATE_KEY;
  const subAccountId = process.env.NOMBA_SUB_ACCOUNT_ID;
  const parentAccountId = process.env.NOMBA_PARENT_ACCOUNT_ID;

  if (clientId && privateKey && subAccountId && parentAccountId) {
    try {
      console.log(`Initiating Nomba Virtual Account registration for: ${vendorName} (Shop: ${shopNumber})`);
      const response = await fetch("https://api.nomba.com/v1/virtual-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "accountId": parentAccountId,
          "Authorization": `Bearer ${clientId}`,
        },
        body: JSON.stringify({
          accountName: `Duesly - ${vendorName}`,
          email: `${vendorName.toLowerCase().replace(/\s+/g, "")}@duesly-vendor.org`,
          phoneNumber: "08030000000",
          subAccountId: subAccountId,
        }),
      });
      const result = await response.json();
      if (response.ok && result.data?.accountNumber) {
        return result.data.accountNumber;
      }
    } catch (e) {
      console.warn("Nomba API contact failed, generating virtual NUBAN fallback:", e);
    }
  }

  // Fallback to Nomba simulated NUBAN format
  return "9032 " + Math.floor(1000 + Math.random() * 9000) + " " + Math.floor(10 + Math.random() * 90);
}

// Bulk CSV Upload Onboarding
export const importVendorsCSV = createServerFn({ method: "POST" })
  .validator(z.object({
    csvContent: z.string(),
    orgId: z.string().optional()
  }))
  .handler(async ({ data }) => {
    const activeOrgId = data.orgId || "ORG-001";
    const lines = data.csvContent.split("\n");
    let count = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(",").map(p => p.trim());
      
      // Skip header row
      if (parts[0].toLowerCase() === "name" || parts[0].toLowerCase() === "fullname" || parts[0].toLowerCase() === "vendor") {
        continue;
      }

      if (parts.length >= 3) {
        const name = parts[0];
        const shop = parts[1];
        const phone = parts[2];
        const section = parts[3] || "General Section";
        
        const id = "V-" + Math.floor(1000 + Math.random() * 9000);
        const virtualAccount = await createNombaVirtualAccount(name, shop);

        await pool.query(
          `INSERT INTO vendors (id, org_id, name, shop, phone, section, virtual_account, due, paid, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [id, activeOrgId, name, shop, phone, section, virtualAccount, 18000, 0, "unpaid"]
        );
        count++;
      }
    }
    
    return { success: true, imported: count };
  });

// Duesly AI Collection Analyst Insights
export const getAICoachInsights = createServerFn({ method: "GET" })
  .validator(z.object({
    orgId: z.string().optional()
  }).optional())
  .handler(async ({ data }) => {
    const activeOrgId = data?.orgId || "ORG-001";
    // 1. Fetch vendor metrics
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

    // 2. Fetch category breakdown
    const catRes = await pool.query("SELECT name, amount FROM dues_categories WHERE org_id = $1", [activeOrgId]);
    const categoryBreakdown = catRes.rows.map((row) => ({
      name: row.name,
      value: parseFloat(row.amount) * totalVendors
    }));

    const insightsMarkdown = await analyzeCollectionInsights({
      totalVendors,
      expected,
      collected,
      outstanding,
      paid: paidCount,
      partial: partialCount,
      unpaid: unpaidCount,
      overpaid: overpaidCount,
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
    return {
      success: true,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        org_id: user.org_id,
        org_type: orgType
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
    const resetUrl = `http://localhost:3000/login?reset_email=${encodeURIComponent(user.email)}`;
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

// Dynamic Organization Settings Update
export const updateOrganization = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string(),
    name: z.string().min(2),
    type: z.string(),
    expectedCapacity: z.number().optional()
  }))
  .handler(async ({ data }) => {
    // Sanitize organization details
    const sanitizedName = data.name.replace(/<[^>]*>/g, "").trim();
    const sanitizedType = data.type.replace(/<[^>]*>/g, "").trim();
    const capacity = data.expectedCapacity || 100;

    const res = await pool.query(
      `UPDATE organizations 
       SET name = $1, type = $2, expected_capacity = $3
       WHERE id = $4 
       RETURNING id, name, type, expected_capacity`,
      [sanitizedName, sanitizedType, capacity, data.id]
    );
    if (res.rowCount === 0) {
      return { success: false, error: "Organization not found" };
    }
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
    
    // 1. Create Organization
    await pool.query(
      "INSERT INTO organizations (id, name, type, status) VALUES ($1, $2, $3, $4)",
      [orgId, data.orgName, typeSelected, "active"]
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
    try {
      await sendEmail({
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
    } catch (emailErr) {
      console.error("Failed to deliver registration OTP:", emailErr);
    }

    const hasResend = !!process.env.RESEND_API_KEY;
    console.log(`=== DEV REGISTRATION OTP CODE FOR ${data.email} IS: ${otp} ===`);

    return {
      success: true,
      otpRequired: true,
      email: data.email.toLowerCase(),
      devOtp: hasResend ? undefined : otp,
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
      const virtualAccount = "9032 " + Math.floor(1000 + Math.random() * 9000) + " " + Math.floor(10 + Math.random() * 90);

      await pool.query(
        "INSERT INTO users (email, password, role, org_id, name, is_verified) VALUES ($1, $2, $3, $4, $5, $6)",
        [data.email.toLowerCase(), data.password, "vendor", data.orgId, fullName, true]
      );

      await pool.query(
        `INSERT INTO vendors (id, org_id, name, shop, phone, section, virtual_account, due, paid, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [memberId, data.orgId, fullName, data.shop, data.phone, data.section, virtualAccount, 18000, 0, "unpaid"]
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
    password: z.string().min(6)
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
    orgId: z.string()
  }))
  .handler(async ({ data }) => {
    const vendorRes = await pool.query("SELECT name, shop, phone FROM vendors WHERE id = $1", [data.vendorId]);
    if (!vendorRes.rowCount) {
      return { success: false, error: "Member not found" };
    }
    const vendor = vendorRes.rows[0];

    await createNotification(
      data.orgId,
      null,
      "admin",
      "Support Request",
      `Member "${vendor.name}" (Shop ${vendor.shop}) has opened a support ticket. Phone: ${vendor.phone}.`
    );

    await createNotification(
      data.orgId,
      data.vendorId,
      "vendor",
      "Support Ticket Logged",
      "Your support request has been logged successfully. The administrator has been notified."
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
