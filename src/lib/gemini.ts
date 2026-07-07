const geminiApiKey = process.env.GEMINI_API_KEY || "";

export async function askGeminiCoach(prompt: string, fallbackAdvice: string): Promise<string> {
  if (!geminiApiKey) {
    console.warn("Gemini API key missing. Returning fallback AI advice.");
    return fallbackAdvice;
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
      return fallbackAdvice;
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (generatedText) {
      return generatedText.trim();
    }
    return fallbackAdvice;
  } catch (error) {
    console.error("Gemini API error:", error);
    return fallbackAdvice;
  }
}

export async function analyzeCollectionInsights(stats: {
  orgName: string;
  orgType: string;
  totalVendors: number;
  expected: number;
  collected: number;
  outstanding: number;
  paid: number;
  partial: number;
  unpaid: number;
  overpaid: number;
  sections: string[];
}, categoryBreakdown: { name: string; value: number }[]): Promise<string> {
  
  const isBrandNew = stats.totalVendors === 0;
  const fallback = getDefaultAdvice({
    orgName: stats.orgName,
    orgType: stats.orgType,
    totalVendors: stats.totalVendors
  });
  
  let prompt = "";
  
  if (isBrandNew) {
    prompt = `
      You are Duesly AI, an expert financial consultant and setup coach for organizations in Nigeria.
      The administrator of "${stats.orgName}" (an organization of type "${stats.orgType}") has just signed up and has an empty database (0 members, 0 collections, 0 categories configured).
      
      Provide a warm, highly professional "Welcome & Getting Started Guide" for this administrator.
      Structure it into 3 actionable steps tailored specifically to their organization type ("${stats.orgType}"):
      - For "Market": focus on adding vendors, stall lines/zones, and setting up market levies and sanitation fees.
      - For "Estate": focus on adding residents, house/block numbering, and configuring security and waste management levies.
      - For "Cooperative": focus on adding members, thrift/cooperative numbers, and configuring monthly savings/shares categories.
      - For "Trade Group": focus on chapters, trade categories, and association dues.
      
      Format your response in neat, professional Markdown using bullet points. Keep it extremely concise (around 150-200 words total). Refrain from saying they have outstanding debts or compliance margins, as the system is brand new. Provide clear instruction on how setup enables collection tracking and automated payouts.
    `;
  } else {
    // Terminology map based on orgType
    const memberTerm = stats.orgType === "Estate" ? "Resident" : stats.orgType === "Cooperative" ? "Member" : "Vendor";
    const unitTerm = stats.orgType === "Estate" ? "House/Block" : stats.orgType === "Cooperative" ? "Member ID" : "Shop/Stall";
    const zoneTerm = stats.orgType === "Estate" ? "Zone/Phase" : stats.orgType === "Cooperative" ? "Branch/Chapter" : "Section/Line";
    
    const sectionsList = stats.sections.length > 0 
      ? `Use only these actual active ${zoneTerm}s defined in their database: ${stats.sections.join(", ")}`
      : `Suggest defining standard ${zoneTerm}s suitable for a ${stats.orgType}`;

    prompt = `
      You are Duesly AI, a financial analyst for ${stats.orgType}s in Nigeria.
      Provide 3 key, actionable financial collection recommendations for "${stats.orgName}" based on this data:
      - Total ${memberTerm}s: ${stats.totalVendors}
      - Total Expected collection: ₦${stats.expected.toLocaleString()}
      - Total Collected: ₦${stats.collected.toLocaleString()} (${Math.round((stats.collected / (stats.expected || 1)) * 100)}% compliance)
      - Outstanding Balance: ₦${stats.outstanding.toLocaleString()}
      - ${memberTerm} Statuses: Fully Paid: ${stats.paid}, Partially Paid: ${stats.partial}, Unpaid: ${stats.unpaid}, Overpaid: ${stats.overpaid}
      - Active Categories Breakdown: ${categoryBreakdown.map(c => `${c.name}: ₦${c.value.toLocaleString()}`).join(", ")}
      
      Terminology Rules:
      - Refer to members as "${memberTerm}s" (singular: "${memberTerm}").
      - Refer to physical spaces/identifiers as "${unitTerm}s".
      - Refer to sections as "${zoneTerm}s".
      - ${sectionsList}
      
      Keep your advice extremely concise (around 150-200 words total).
      Format your response in neat, professional Markdown using bullet points. Refrain from generic statements; focus on actionable collections steps like triggering SMS reminders or auditing partial payment cycles.
    `;
  }

  return askGeminiCoach(prompt, fallback);
}

function getDefaultAdvice(stats: { orgName: string; orgType: string; totalVendors: number }): string {
  const isBrandNew = stats.totalVendors === 0;
  
  if (isBrandNew) {
    const memberTerm = stats.orgType === "Estate" ? "residents" : stats.orgType === "Cooperative" ? "members" : "vendors";
    const duesTerm = stats.orgType === "Estate" ? "security/maintenance fees" : stats.orgType === "Cooperative" ? "monthly savings shares" : "market levies";
    
    return `### Welcome to ${stats.orgName || "Duesly"}
*   **Configure Dues Categories**: Go to the **Dues** section to set up your first collection items (e.g., ${duesTerm}).
*   **Onboard Your First Members**: Register your first ${memberTerm} or import them in bulk using the Excel importer in the **Vendors** section.
*   **Assign Payment Accounts**: Once added, each member will automatically receive a dedicated Nomba virtual account to transfer payments directly.`;
  }
  
  const memberTerm = stats.orgType === "Estate" ? "Resident" : stats.orgType === "Cooperative" ? "Member" : "Vendor";
  const zoneTerm = stats.orgType === "Estate" ? "Zone/Phase" : stats.orgType === "Cooperative" ? "Branch" : "Stall Line";
  
  return `### ${stats.orgName} AI Insights
*   **Target Stale Accounts**: Audited collections reveal outstanding balances. Segment unpaid ${memberTerm.toLowerCase()}s by ${zoneTerm} and dispatch SMS payment alerts.
*   **Virtual Account Verification**: Make sure all registered members have received their dedicated transfer details.
*   **Digital Collection Drive**: Encourage self-service payments by sharing vendor portal links via notifications.`;
}
