export interface OrgVocabulary {
  member: string;              // "Vendor" | "Resident" | "Cooperator" | "Member"
  members: string;             // "Vendors" | "Residents" | "Cooperators" | "Members"
  location: string;            // "Shop / Stall" | "House Number / Unit" | "Office / Store" | "Office / Suite"
  locationLabel: string;       // "Shop Number" | "House Number" | "Member ID / Office" | "Office / Suite"
  locationPlaceholder: string; // "e.g. Shop B-12" | "e.g. House 4A" | "e.g. COOP-901" | "e.g. Suite 312"
  section: string;             // "Market Section" | "Zone / Street" | "Branch / Wing" | "Trade Sector"
  sectionLabel: string;        // "Section" | "Zone / Street" | "Branch" | "Trade Sector"
  sectionPlaceholder: string;  // "e.g. Onion Section" | "e.g. Phase 1" | "e.g. Lagos Branch" | "e.g. Electronics"
  due: string;                 // "Levy" | "Service Charge" | "Contribution" | "Union Due"
  dues: string;                // "Levies" | "Service Charges" | "Contributions" | "Union Dues"
}

export const VOCABULARY: Record<string, OrgVocabulary> = {
  Market: {
    member: "Vendor",
    members: "Vendors",
    location: "Shop / Stall",
    locationLabel: "Shop Number",
    locationPlaceholder: "e.g. Shop B-12",
    section: "Market Section",
    sectionLabel: "Section",
    sectionPlaceholder: "e.g. Block A / Onion Section",
    due: "Levy",
    dues: "Dues & Levies"
  },
  Estate: {
    member: "Resident",
    members: "Residents",
    location: "House / Unit",
    locationLabel: "House Number",
    locationPlaceholder: "e.g. House 4A, Street 2",
    section: "Zone / Street",
    sectionLabel: "Zone / Street",
    sectionPlaceholder: "e.g. Zone B / Phase 1",
    due: "Service Charge",
    dues: "Service Charges & Levies"
  },
  Cooperative: {
    member: "Cooperator",
    members: "Cooperators",
    location: "Member ID / Office",
    locationLabel: "Member ID",
    locationPlaceholder: "e.g. COOP-901",
    section: "Branch / Wing",
    sectionLabel: "Branch",
    sectionPlaceholder: "e.g. Lagos Branch",
    due: "Contribution",
    dues: "Contributions & Savings"
  },
  "Trade Group": {
    member: "Member",
    members: "Members",
    location: "Office / Suite",
    locationLabel: "Office / Suite",
    locationPlaceholder: "e.g. Suite 312",
    section: "Trade Sector",
    sectionLabel: "Trade Sector",
    sectionPlaceholder: "e.g. Electronics Sector",
    due: "Union Due",
    dues: "Union Dues & Levies"
  }
};

export function getVocabulary(orgType?: string): OrgVocabulary {
  // Default to Market if type matches none or is empty
  const key = orgType || "Market";
  return VOCABULARY[key] || VOCABULARY["Market"];
}
