import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function getNombaAccessToken() {
  const clientId = process.env.NOMBA_CLIENT_ID;
  const clientSecret = process.env.NOMBA_PRIVATE_KEY;
  const accountId = process.env.NOMBA_PARENT_ACCOUNT_ID;
  const baseUrl = "https://api.nomba.com";
  
  const response = await fetch(`${baseUrl}/v1/auth/token/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accountId": accountId!
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  const result: any = await response.json();
  return result.data.access_token;
}

async function run() {
  try {
    const token = await getNombaAccessToken();
    console.log("Token successfully retrieved!");
    
    const accountNumbers = ["5554558689", "5641229959"];
    for (const acc of accountNumbers) {
      const url = `https://api.nomba.com/v1/transactions/virtual?virtual_account=${acc}`;
      console.log(`Querying: ${url}`);
      const res = await fetch(url, {
        headers: {
          "accountId": process.env.NOMBA_PARENT_ACCOUNT_ID!,
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      console.log(`Result for ${acc}:`, JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
