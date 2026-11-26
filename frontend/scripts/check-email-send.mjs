import { readFileSync } from "node:fs";

const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = {};
for (const line of text.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  env[match[1]] = value;
}

const headers = { Authorization: `Bearer ${env.RESEND_API_KEY}` };
const domains = await fetch("https://api.resend.com/domains", { headers });
const domainBody = await domains.json();
for (const domain of domainBody.data || []) {
  const detail = await fetch(`https://api.resend.com/domains/${domain.id}`, { headers });
  const body = await detail.json();
  const records = (body.records || []).map((record) => ({
    record: record.record,
    name: record.name,
    type: record.type,
    status: record.status,
    value: record.value,
  }));
  console.log(JSON.stringify({ name: body.name, status: body.status, records }, null, 2));
}

const listed = await fetch("https://api.resend.com/emails?limit=10", { headers });
const listBody = await listed.json();
const bounced = (listBody.data || []).find((email) => email.last_event === "bounced");
if (bounced) {
  const detail = await fetch(`https://api.resend.com/emails/${bounced.id}`, { headers });
  const body = await detail.json();
  console.log(JSON.stringify({ bouncedTo: body.to, subject: body.subject, lastEvent: body.last_event, bounce: body.bounce || body.reason || null }, null, 2));
}
