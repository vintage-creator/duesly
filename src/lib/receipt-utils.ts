export function generateReceiptId(sourceRef?: string) {
  const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fallbackEntropy = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const rawEntropy = sourceRef || globalThis.crypto?.randomUUID?.() || fallbackEntropy;
  const entropy = rawEntropy.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase().padStart(8, "0");
  return `RCP-${compactDate}-${entropy}`;
}

export function getReceiptVerificationCode(receiptId?: string) {
  if (!receiptId) return "";

  let hash = 0;
  for (const char of receiptId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return `DUESLY-${hash.toString(36).toUpperCase().padStart(7, "0")}`;
}
