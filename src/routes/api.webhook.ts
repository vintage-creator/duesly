import { createFileRoute } from "@tanstack/react-router";
import { pool } from "@/lib/db";
import crypto from "crypto";
import { sendPaymentAlert } from "@/lib/email";
import { dispatchAutoSettlementSplits, getLedgerSnapshot } from "@/lib/db-actions";
import { generateReceiptId } from "@/lib/receipt-utils";

function getNestedValue(source: any, paths: string[]) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], source);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function normalizeNombaWebhookPayload(body: any) {
  const eventType = String(getNestedValue(body, ["event_type", "eventType", "event", "type"]) || "").toLowerCase();
  const payload = getNestedValue(body, ["data", "payload", "transaction"]) || body;
  const amount = parseFloat(String(getNestedValue(payload, ["amount", "amountPaid", "paidAmount", "transaction.amount"]) || "0"));
  const virtualAccount = String(getNestedValue(payload, [
    "virtualAccount",
    "virtual_account",
    "accountNumber",
    "account_number",
    "destinationAccountNumber",
    "destination_account_number",
    "bankAccountNumber",
    "bank_account_number",
    "account.accountNumber",
    "account.account_number",
    "virtualAccount.accountNumber",
    "virtual_account.account_number",
  ]) || "");
  const transactionId = String(getNestedValue(payload, [
    "transactionId",
    "transaction_id",
    "merchantTxRef",
    "merchant_tx_ref",
    "reference",
    "ref",
    "id",
    "transaction.id",
    "transaction.reference",
  ]) || "");

  return {
    eventType,
    amount,
    virtualAccount,
    transactionId,
    rawData: payload,
  };
}

function isSupportedPaymentEvent(eventType: string) {
  if (!eventType) return true;
  return [
    "payment_success",
    "payment.success",
    "transaction.success",
    "transaction_success",
    "collection.success",
    "collection_success",
    "virtual_account.payment",
    "virtual.account.payment",
  ].some((supported) => eventType.includes(supported));
}

export const Route = createFileRoute("/api/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const signature = request.headers.get("nomba-signature");
          const rawBody = await request.text();
          
          // Verify webhook signature to ensure it came from Nomba
          const signingKey = process.env.NOMBA_WEBHOOK_SIGNING_KEY;
          if (!signingKey) {
            return new Response(JSON.stringify({ error: "Nomba webhook signing key is not configured" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          if (!signature) {
            return new Response(JSON.stringify({ error: "Missing Nomba webhook signature" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }
          const hmac = crypto.createHmac("sha256", signingKey);
          const computedSignature = hmac.update(rawBody).digest("hex");

          if (computedSignature !== signature) {
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

          const normalized = normalizeNombaWebhookPayload(body);

          if (!isSupportedPaymentEvent(normalized.eventType)) {
            return new Response(JSON.stringify({ error: "Unsupported event type or invalid payload" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const amount = normalized.amount;
          const virtualAccountRaw = normalized.virtualAccount;
          const normalizedAccount = virtualAccountRaw.replace(/\s+/g, "");

          if (!amount || amount <= 0 || !normalizedAccount) {
            return new Response(JSON.stringify({ error: "Missing valid amount or virtual account in webhook payload" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Find vendor by virtual account (checking with and without spaces)
          const vendorRes = await pool.query(
            "SELECT * FROM vendors WHERE REPLACE(virtual_account, ' ', '') = $1 LIMIT 1",
            [normalizedAccount]
          );

          const txnId = normalized.transactionId || ("TXN-" + Math.floor(100000 + Math.random() * 900000));
          const rcpId = generateReceiptId(txnId);
          const rcId = "RC-" + Math.floor(100 + Math.random() * 900);
          const today = new Date().toLocaleDateString("en-NG", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });

          if (vendorRes.rowCount && vendorRes.rowCount > 0) {
            const vendor = vendorRes.rows[0];
            const due = parseFloat(vendor.due);
            const ledger = getLedgerSnapshot(parseFloat(vendor.paid), due, amount);

            // Update vendor paid & status
            await pool.query(
              "UPDATE vendors SET paid = $1, status = $2 WHERE id = $3",
              [ledger.paidToDate, ledger.vendorStatus, vendor.id]
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
                ledger.paymentStatus,
              ]
            );

            // Insert reconciliation entry
            await pool.query(
              `INSERT INTO reconciliations (id, org_id, source, vendor_name, expected, paid, diff, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [rcId, vendor.org_id, vendor.virtual_account, vendor.name, due, ledger.paidToDate, ledger.diffToDate, ledger.reconciliationStatus]
            );

            // Insert receipt
            await pool.query(
              `INSERT INTO receipts (id, org_id, vendor_name, category, amount, date, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [rcpId, vendor.org_id, vendor.name, "Monthly Levy", amount, today, ledger.receiptStatus]
            );

            // Dispatch receipt email to vendor via Resend API
            const vendorEmail = `${vendor.name.toLowerCase().replace(/\s+/g, "")}@duesly-vendor.org`;
            pool.query("SELECT name FROM organizations WHERE id = $1 LIMIT 1", [vendor.org_id])
              .then((orgRes) => {
                const orgName = orgRes.rows[0]?.name || "your association";
                sendPaymentAlert({
                  vendorEmail: vendorEmail,
                  vendorName: vendor.name,
                  amount: amount,
                  receiptId: rcpId,
                  category: "Monthly Levy",
                  orgName: orgName,
                }).catch((err) => {
                  console.error("Resend delivery failed:", err);
                });
              })
              .catch((err) => {
                console.error("Failed to fetch orgName for email alert:", err);
                sendPaymentAlert({
                  vendorEmail: vendorEmail,
                  vendorName: vendor.name,
                  amount: amount,
                  receiptId: rcpId,
                  category: "Monthly Levy",
                }).catch((e) => console.error(e));
              });

            // Trigger auto-settlement split disbursement
            dispatchAutoSettlementSplits(vendor.org_id, vendor.id, vendor.name, amount).catch((err) => {
              console.error("Auto-settlement splits trigger failed:", err);
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
