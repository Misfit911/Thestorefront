import { ZodError } from "zod";
import { OrderError } from "@/lib/orders";

export function jsonError(error: unknown) {
  if (error instanceof OrderError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return Response.json({ error: error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  console.error(error);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}
