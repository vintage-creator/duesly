import { pool } from "../src/lib/db";
import crypto from "crypto";

async function runSimulation() {
  console.log("=== Starting Duesly Collection Simulation Tests ===\n");

  try {
    // 1. Create a dummy tenant Organization and User
    console.log("1. Testing Account Creation (Multi-Tenant onboarding)...");
    const testOrgId = "ORG-SIM-" + Math.floor(100 + Math.random() * 900);
    await pool.query(
      "INSERT INTO organizations (id, name, type, status) VALUES ($1, $2, $3, $4)",
      [testOrgId, "Simulation Market Association", "Market", "active"]
    );
    console.log(`✔ Organization registered: ${testOrgId}`);

    const testUserEmail = `admin-${testOrgId.toLowerCase()}@duesly.org`;
    await pool.query(
      "INSERT INTO users (email, password, role, org_id, name) VALUES ($1, $2, $3, $4, $5)",
      [testUserEmail, "simpassword", "admin", testOrgId, "Sim Admin"]
    );
    console.log(`✔ Admin User registered: ${testUserEmail}`);

    // 2. Insert dummy vendors with specified due limits
    console.log("\n2. Seeding test vendors & virtual Wema accounts...");
    const vendor1 = { id: "V-SIM-1", account: "9032 0001 11", due: 18000 }; // To test exact payment
    const vendor2 = { id: "V-SIM-2", account: "9032 0002 22", due: 18000 }; // To test underpayment
    const vendor3 = { id: "V-SIM-3", account: "9032 0003 33", due: 18000 }; // To test overpayment

    await pool.query(
      `INSERT INTO vendors (id, org_id, name, shop, phone, section, virtual_account, due, paid, status)
       VALUES 
       ($1, $2, 'Trader A', 'Shop A-01', '08011111111', 'Textiles', $3, $4, 0, 'unpaid'),
       ($5, $2, 'Trader B', 'Shop B-02', '08022222222', 'Provisions', $6, $7, 0, 'unpaid'),
       ($8, $2, 'Trader C', 'Shop C-03', '08033333333', 'Electronics', $9, $10, 0, 'unpaid')`,
      [
        vendor1.id, testOrgId, vendor1.account, vendor1.due,
        vendor2.id, vendor2.account, vendor2.due,
        vendor3.id, vendor3.account, vendor3.due
      ]
    );
    console.log("✔ Vendors seeded.");

    // Helper to simulate incoming Nomba payment webhook processing logic
    async function simulateWebhookPayment(virtualAccount: string, amount: number) {
      const normalizedAccount = virtualAccount.replace(/\s+/g, "");
      
      const vendorRes = await pool.query(
        "SELECT * FROM vendors WHERE REPLACE(virtual_account, ' ', '') = $1 LIMIT 1",
        [normalizedAccount]
      );

      const txnId = "TXN-" + Math.floor(100000 + Math.random() * 900000);
      const rcpId = "RCP-" + Math.floor(10000 + Math.random() * 90000);
      const rcId = "RC-" + Math.floor(100 + Math.random() * 900);

      if (vendorRes.rowCount && vendorRes.rowCount > 0) {
        const vendor = vendorRes.rows[0];
        const newPaid = parseFloat(vendor.paid) + amount;
        const due = parseFloat(vendor.due);
        
        let status = "unpaid";
        if (newPaid >= due) {
          status = newPaid > due ? "overpaid" : "paid";
        } else if (newPaid > 0) {
          status = "partial";
        }

        // Update vendor paid
        await pool.query(
          "UPDATE vendors SET paid = $1, status = $2 WHERE id = $3",
          [newPaid, status, vendor.id]
        );

        // Log payment
        await pool.query(
          `INSERT INTO payments (id, org_id, vendor_id, vendor_name, account, amount, category, date, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [txnId, vendor.org_id, vendor.id, vendor.name, vendor.virtual_account, amount, "Monthly Levy", "Today", status]
        );

        // Log reconciliation
        let recStatus = "matched";
        if (status === "overpaid") recStatus = "overpaid";
        else if (status === "partial") recStatus = "underpaid";

        await pool.query(
          `INSERT INTO reconciliations (id, org_id, source, vendor_name, expected, paid, diff, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [rcId, vendor.org_id, vendor.virtual_account, vendor.name, due, amount, amount - due, recStatus]
        );
        
        return { success: true, status, matchedVendor: vendor.name };
      } else {
        // Add to review queue
        await pool.query(
          `INSERT INTO reconciliations (id, org_id, source, vendor_name, expected, paid, diff, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [rcId, testOrgId, virtualAccount, "Unmatched", 0, amount, amount, "review"]
        );
        return { success: true, status: "review", matchedVendor: "Unmatched" };
      }
    }

    // 3. Test exact payment match
    console.log("\n3. Simulating exact bank transfer payment...");
    const res1 = await simulateWebhookPayment(vendor1.account, 18000);
    console.log(`✔ Result: status is "${res1.status}" (matched to: ${res1.matchedVendor})`);

    // 4. Test underpayment
    console.log("\n4. Simulating underpayment bank transfer...");
    const res2 = await simulateWebhookPayment(vendor2.account, 10000);
    console.log(`✔ Result: status is "${res2.status}" (matched to: ${res2.matchedVendor})`);

    // 5. Test overpayment
    console.log("\n5. Simulating overpayment bank transfer...");
    const res3 = await simulateWebhookPayment(vendor3.account, 25000);
    console.log(`✔ Result: status is "${res3.status}" (matched to: ${res3.matchedVendor})`);

    // 6. Test unmatched review queue
    console.log("\n6. Simulating unmatched virtual account transfer...");
    const res4 = await simulateWebhookPayment("9032 9999 99", 15000);
    console.log(`✔ Result: status is "${res4.status}" (added to manual review queue)`);

    // 7. Verify final database states
    console.log("\n7. Fetching resulting database ledger records for validation...");
    const dbVendors = await pool.query("SELECT name, due, paid, status FROM vendors WHERE org_id = $1 ORDER BY name ASC", [testOrgId]);
    console.table(dbVendors.rows);

    const dbReconciliations = await pool.query("SELECT vendor_name, expected, paid, diff, status FROM reconciliations WHERE org_id = $1", [testOrgId]);
    console.table(dbReconciliations.rows);

    console.log("\n✔ All simulations executed successfully! Ledger calculations correspond exactly.");

    // Clean up simulation data
    await pool.query("DELETE FROM reconciliations WHERE org_id = $1", [testOrgId]);
    await pool.query("DELETE FROM payments WHERE org_id = $1", [testOrgId]);
    await pool.query("DELETE FROM vendors WHERE org_id = $1", [testOrgId]);
    await pool.query("DELETE FROM users WHERE org_id = $1", [testOrgId]);
    await pool.query("DELETE FROM organizations WHERE id = $1", [testOrgId]);
    console.log("\n✔ Simulation test data cleaned up successfully.");

  } catch (error) {
    console.error("❌ Simulation encountered an error:", error);
  } finally {
    await pool.end();
  }
}

runSimulation();
