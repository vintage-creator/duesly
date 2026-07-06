import fs from "fs";
import path from "path";

// Read and parse .env manually
try {
  const envPath = path.resolve(process.cwd(), ".env");
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim();
      process.env[key] = val;
    }
  }
} catch (e) {}

const geminiApiKey = process.env.GEMINI_API_KEY || "";
console.log("Using API Key:", geminiApiKey);

const models = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-2.5-flash"
];

async function test() {
  for (const model of models) {
    console.log(`Testing model: ${model}...`);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Hi" }] }],
          }),
        }
      );
      console.log(`Status for ${model}:`, response.status);
      const text = await response.text();
      console.log(`Response snippet for ${model}:`, text.slice(0, 300));
    } catch (err) {
      console.error(`Error for ${model}:`, err);
    }
  }
}

test();
