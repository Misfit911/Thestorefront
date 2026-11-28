import { z } from "zod";
import { createApplication } from "@/lib/db/applications";
import { StoreEditError } from "@/lib/db/mutations";
import { jsonError } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { normalizeKePhone } from "@/lib/phone";
import { safeWebUrl } from "@/lib/web-url";

export const runtime = "nodejs";

const schema = z.object({
  plan: z.enum(["link", "growth", "custom"]),
  businessName: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(200),
  phone: z.string().trim().min(8).max(20),
  socialUrl: z.string().trim().min(4).max(500),
  email: z.string().trim().max(200).optional().default(""),
  extraSocials: z.string().trim().max(500).optional().default(""),
  hoursDays: z.string().trim().min(3).max(80),
  hoursOpen: z.string().trim().regex(/^\d{2}:\d{2}$/),
  hoursClose: z.string().trim().regex(/^\d{2}:\d{2}$/),
  registrationNumber: z.string().trim().max(80).optional().default(""),
  identificationDetails: z.string().trim().max(200).optional().default(""),
  taxDetails: z.string().trim().max(80).optional().default(""),
});

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers.get("x-forwarded-for"));
    if (!rateLimit(`apply:${ip}`, 8, 10 * 60 * 1000)) {
      return Response.json({ error: "Too many applications. Try again shortly." }, { status: 429 });
    }
    const input = schema.parse(await request.json());
    if (!normalizeKePhone(input.phone)) return Response.json({ error: "Enter a valid Kenyan phone number" }, { status: 400 });
    if (!safeWebUrl(input.socialUrl)) return Response.json({ error: "Enter a social link" }, { status: 400 });
    if (input.email && !z.string().email().safeParse(input.email).success) {
      return Response.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    await createApplication({ ...input, email: input.email ?? "", extraSocials: input.extraSocials ?? "" });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof StoreEditError) return Response.json({ error: error.message }, { status: 400 });
    return jsonError(error);
  }
}
