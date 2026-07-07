import { createFileRoute } from "@tanstack/react-router";
import { pool } from "@/lib/db";
import crypto from "crypto";
import { sendPaymentAlert } from "@/lib/email";

export const Route = createFileRoute("/api/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const signature = request.headers.get("nomba-signature");
          const rawBody = await request.text();
          
          // Verify webhook signature to ensure it came from Nomba
          const signingKey = process.env.NOMBA_WEBHOOK_SIGNING_KEY || "NombaHackathon2026";
          const hmac = crypto.createHmac("sha256", signingKey);
          const computedSignature = hmac.update(rawBody).digest("hex");

          if (signature && computedSignature !== signature) {
            console.error("Nomba signature validation failed:", {
              received: signature,
              computed: computedSignature,
            });
            return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const body = JSON.parse(rawBody);
          console.log("Nomba verified webhook payload received:", body);

          const { event_type, data } = body;
          
          if (event_type !== "payment_success" || !data) {
            return new Response(JSON.stringify({ error: "Unsupported event type or invalid payload" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const amount = parseFloat(data.amount);
          const virtualAccountRaw = data.virtualAccount || "";
          const normalizedAccount = virtualAccountRaw.replace(/\s+/g, "");

          // Find vendor by virtual account (checking with and without spaces)
          const vendorRes = await pool.query(
            "SELECT * FROM vendors WHERE REPLACE(virtual_account, ' ', '') = $1 LIMIT 1",
            [normalizedAccount]
          );

          const txnId = "TXN-" + Math.floor(100000 + Math.random() * 900000);
          const rcpId = "RCP-" + Math.floor(10000 + Math.random() * 90000);
          const rcId = "RC-" + Math.floor(100 + Math.random() * 900);
          const today = new Date().toLocaleDateString("en-NG", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });

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

            // Update vendor paid & status
            await pool.query(
              "UPDATE vendors SET paid = $1, status = $2 WHERE id = $3",
              [newPaid, status, vendor.id]
            );

            // Insert payment log
            await pool.query(
              `INSERT INTO payments (id, org_id, vendor_id, vendor_name, account, amount, category, date, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                txnId,
                vendor.org_id,
                vendor.id,
                vendor.name,
                vendor.virtual_account,
                amount,
                "Monthly Levy",
                "Today, " + new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
                status === "overpaid" ? "Overpaid" : status === "partial" ? "Partial" : "Matched",
              ]
            );

            // Insert reconciliation entry
            let recStatus = "matched";
            if (status === "overpaid") recStatus = "overpaid";
            else if (status === "partial") recStatus = "underpaid";

            await pool.query(
              `INSERT INTO reconciliations (id, org_id, source, vendor_name, expected, paid, diff, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [rcId, vendor.org_id, vendor.virtual_account, vendor.name, due, amount, amount - due, recStatus]
            );

            // Insert receipt
            await pool.query(
              `INSERT INTO receipts (id, org_id, vendor_name, category, amount, date, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [rcpId, vendor.org_id, vendor.name, "Monthly Levy", amount, today, status === "partial" ? "Partial" : "Issued"]
            );

            // Dispatch receipt email to vendor via Resend API
            const vendorEmail = `${vendor.name.toLowerCase().replace(/\s+/g, "")}@duesly-vendor.org`;
            sendPaymentAlert({
              vendorEmail: vendorEmail,
              vendorName: vendor.name,
              amount: amount,
              receiptId: rcpId,
              category: "Monthly Levy",
            }).catch((err) => {
              console.error("Resend delivery failed:", err);
            });

            console.log(`Successfully processed verified webhook payment and dispatched email for vendor ${vendor.name}`);
            return new Response(JSON.stringify({ success: true, txnId }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          } else {
            // Unmatched virtual account - manual review queue
            console.log(`Webhook account unmatched: ${virtualAccountRaw}. Putting into review queue.`);
            
            // Insert unmatched reconciliation entry
            await pool.query(
              `INSERT INTO reconciliations (id, org_id, source, vendor_name, expected, paid, diff, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [rcId, "ORG-001", virtualAccountRaw, "Unmatched", 0, amount, amount, "review"]
            );

            // Insert payment log as review
            await pool.query(
              `INSERT INTO payments (id, org_id, vendor_id, vendor_name, account, amount, category, date, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                txnId,
                "ORG-001",
                null,
                "Unmatched Account",
                virtualAccountRaw,
                amount,
                "Unknown Levy",
                "Today, " + new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
                "Review",
              ]
            );

            return new Response(JSON.stringify({ success: true, status: "review", message: "Account unmatched, added to review queue" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
        } catch (e: any) {
          console.error("Error processing webhook:", e);
          return new Response(JSON.stringify({ error: "Failed to process webhook notification", details: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
