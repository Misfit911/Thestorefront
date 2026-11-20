export function mpesaConfigured() {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_CALLBACK_URL,
  );
}

function baseUrl() {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

export function darajaTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = read("hour") === "24" ? "00" : read("hour");
  return `${read("year")}${read("month")}${read("day")}${hour}${read("minute")}${read("second")}`;
}

async function accessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("MPESA_NOT_CONFIGURED");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const response = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });
  const json = (await response.json().catch(() => null)) as { access_token?: string } | null;
  if (!response.ok || !json?.access_token) throw new Error("MPESA_AUTH_FAILED");
  return json.access_token;
}

function password() {
  const shortcode = process.env.MPESA_SHORTCODE ?? "";
  const passkey = process.env.MPESA_PASSKEY ?? "";
  const timestamp = darajaTimestamp();
  return {
    shortcode,
    timestamp,
    password: Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64"),
  };
}

export async function stkPush(input: { phone: string; amountShillings: number; accountReference: string }) {
  const token = await accessToken();
  const creds = password();
  const response = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: creds.shortcode,
      Password: creds.password,
      Timestamp: creds.timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: input.amountShillings,
      PartyA: input.phone,
      PartyB: creds.shortcode,
      PhoneNumber: input.phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: input.accountReference.slice(0, 12),
      TransactionDesc: "Nike Nairobi",
    }),
    cache: "no-store",
  });
  const json = (await response.json().catch(() => null)) as {
    ResponseCode?: string;
    ResponseDescription?: string;
    errorMessage?: string;
    CheckoutRequestID?: string;
    MerchantRequestID?: string;
  } | null;
  if (!response.ok || json?.ResponseCode !== "0" || !json.CheckoutRequestID) {
    throw new Error(json?.errorMessage || json?.ResponseDescription || "MPESA_PUSH_FAILED");
  }
  return { checkoutRequestId: json.CheckoutRequestID, merchantRequestId: json.MerchantRequestID ?? "" };
}

export async function stkQuery(checkoutRequestId: string) {
  const token = await accessToken();
  const creds = password();
  const response = await fetch(`${baseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: creds.shortcode,
      Password: creds.password,
      Timestamp: creds.timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
    cache: "no-store",
  });
  const json = (await response.json().catch(() => null)) as {
    ResultCode?: string | number;
    ResultDesc?: string;
    ResponseCode?: string;
  } | null;
  if (!response.ok || !json) throw new Error("MPESA_QUERY_FAILED");
  return json;
}

const FAILED_CODES = new Set(["1", "1032", "1037", "1025", "9999", "2001", "1019", "1001", "17"]);

export function mpesaOutcome(result: { ResultCode?: string | number; ResultDesc?: string }) {
  const code = result.ResultCode == null ? "" : String(result.ResultCode);
  const description = result.ResultDesc ?? "";
  if (code === "0") return { state: "paid" as const, description };
  if (FAILED_CODES.has(code) || /cancel|timeout|insufficient|declin/i.test(description)) {
    return { state: "failed" as const, description: description || "M-Pesa payment was not completed" };
  }
  return { state: "pending" as const, description };
}
