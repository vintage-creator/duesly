const resendApiKey = process.env.RESEND_API_KEY || "";
const emailFrom = process.env.EMAIL_FROM || "Duesly <no-reply@xtera.co.uk>";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!resendApiKey) {
    console.warn("Resend API key missing. Email send bypassed.");
    return { success: false, error: "API key missing" };
  }

  try {
    let response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    let result = await response.json();

    // Catch 403 unverified sender domain restrictions and fall back to onboarding@resend.dev
    if (
      !response.ok &&
      (response.status === 403 ||
        result.message?.toLowerCase().includes("domain") ||
        result.message?.toLowerCase().includes("sender"))
    ) {
      console.warn("Unverified custom sender domain. Retrying via onboarding@resend.dev...");
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Duesly <onboarding@resend.dev>",
          to: [to],
          subject: subject,
          html: html,
        }),
      });
      result = await response.json();
    }

    if (response.ok) {
      console.log("Email sent successfully via Resend:", result);
      return { success: true, data: result };
    } else {
      console.error("Resend email send failed:", result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error("Resend email send error:", error);
    return { success: false, error };
  }
}

export async function sendPaymentAlert({
  vendorEmail,
  vendorName,
  amount,
  receiptId,
  category,
  orgName,
}: {
  vendorEmail: string;
  vendorName: string;
  amount: number;
  receiptId: string;
  category: string;
  orgName?: string;
}) {
  const formattedAmount = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

  const finalOrgName = orgName || "your association";
  const subject = `Payment Confirmed: ${category} — Duesly`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #0b1a3a;">Duesly Payment Confirmation</h2>
      <p>Hello <strong>${vendorName}</strong>,</p>
      <p>Your payment to <strong>${finalOrgName}</strong> has been successfully received and reconciled.</p>
      
      <div style="background-color: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #718096; font-size: 14px;">Receipt Number:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right; font-family: monospace;">${receiptId}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #718096; font-size: 14px;">Levy Category:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right;">${category}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #718096; font-size: 14px;">Amount Paid:</td>
            <td style="padding: 5px 0; font-weight: bold; color: #10b981; font-size: 18px; text-align: right;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #718096; font-size: 14px;">Date:</td>
            <td style="padding: 5px 0; text-align: right;">${new Date().toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 14px; color: #718096;">Thank you for your timely compliance. You can log into your Duesly Portal at any time to view your historical receipts and outstanding balances.</p>
      <p style="font-size: 12px; color: #a0aec0; border-top: 1px dashed #e2e8f0; padding-top: 15px; margin-top: 20px; text-align: center;">Powered by Duesly Technologies</p>
    </div>
  `;

  return sendEmail({ to: vendorEmail, subject, html });
}

export async function sendOutstandingReminder({
  vendorEmail,
  vendorName,
  amount,
  category,
  orgName,
}: {
  vendorEmail: string;
  vendorName: string;
  amount: number;
  category: string;
  orgName?: string;
}) {
  const formattedAmount = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

  const finalOrgName = orgName || "your association";
  const subject = `Urgent Reminder: Outstanding ${category} — Duesly`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #0b1a3a;">Outstanding Balance Alert</h2>
      <p>Hello <strong>${vendorName}</strong>,</p>
      <p>This is a notification from <strong>${finalOrgName}</strong> regarding your outstanding dues.</p>
      
      <div style="background-color: #fffaf0; padding: 15px; border-radius: 8px; border: 1px solid #feebc8; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #718096; font-size: 14px;">Levy Category:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right;">${category}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #718096; font-size: 14px;">Outstanding Balance:</td>
            <td style="padding: 5px 0; font-weight: bold; color: #dd6b20; font-size: 18px; text-align: right;">${formattedAmount}</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 14px; color: #718096;">Please make a transfer of the outstanding balance to your assigned virtual account to reconcile your ledger automatically.</p>
      <p style="font-size: 14px; color: #718096;">Thank you for your cooperation.</p>
      <p style="font-size: 12px; color: #a0aec0; border-top: 1px dashed #e2e8f0; padding-top: 15px; margin-top: 20px; text-align: center;">Powered by Duesly Technologies</p>
    </div>
  `;

  return sendEmail({ to: vendorEmail, subject, html });
}
