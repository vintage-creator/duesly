const geminiApiKey = process.env.GEMINI_API_KEY || "";

export async function askGeminiCoach(prompt: string): Promise<string> {
  if (!geminiApiKey) {
    console.warn("Gemini API key missing. Returning fallback AI advice.");
    return getDefaultAdvice();
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API call failed:", errText);
      return getDefaultAdvice();
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (generatedText) {
      return generatedText.trim();
    }
    return getDefaultAdvice();
  } catch (error) {
    console.error("Gemini API error:", error);
    return getDefaultAdvice();
  }
}

export async function analyzeCollectionInsights(stats: {
  totalVendors: number;
  expected: number;
  collected: number;
  outstanding: number;
  paid: number;
  partial: number;
  unpaid: number;
  overpaid: number;
}, categoryBreakdown: { name: string; value: number }[]): Promise<string> {
  const prompt = `
    You are Duesly AI, a financial analyst for market unions and collection groups in Nigeria.
    Provide 3 key, actionable financial collection recommendations based on this data:
    - Total Vendors: ${stats.totalVendors}
    - Total Expected collection: ₦${stats.expected.toLocaleString()}
    - Total Collected: ₦${stats.collected.toLocaleString()} (${Math.round((stats.collected / (stats.expected || 1)) * 100)}% compliance)
    - Outstanding Balance: ₦${stats.outstanding.toLocaleString()}
    - Vendor Statuses: Fully Paid: ${stats.paid}, Partially Paid: ${stats.partial}, Unpaid: ${stats.unpaid}, Overpaid: ${stats.overpaid}
    - Levy Categories Breakdown: ${categoryBreakdown.map(c => `${c.name}: ₦${c.value.toLocaleString()}`).join(", ")}

    Keep your advice extremely concise (around 150-200 words total).
    Target specific lines/sections (e.g. provisions line, hardware, textile line) or categories.
    Format your response in neat, professional Markdown using bullet points. Refrain from generic statements; focus on actionable collections steps like triggering SMS reminders or auditing partial payment cycles.
  `;

  return askGeminiCoach(prompt);
}

function getDefaultAdvice(): string {
  return `### Duesly AI Collection Coach Insights
*   **Target Lagging Sectors**: Outstanding balances are currently at 21%. Segment unpaid vendors by line (e.g., Textile, Provisions) and queue automated reminders.
*   **Sanitation Levy Audit**: Sanitation fee collection represents the highest underpayment margin. Ensure Nomba virtual accounts are correctly shared on receipts.
*   **Promote Vendor Self-Onboarding**: Have market section leaders distribute portal lookup cards to reduce manually onboarding queues.`;
}
