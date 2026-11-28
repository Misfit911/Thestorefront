"use client";

import { useEffect, useState } from "react";
import { WEEKDAYS, joinHoursDays } from "@/lib/hours";
import { normalizeKePhone } from "@/lib/phone";

const empty = {
  businessName: "",
  location: "",
  phone: "",
  socialUrl: "",
  email: "",
  extraSocials: "",
  hoursOpen: "09:00",
  hoursClose: "18:00",
  registrationNumber: "",
  identificationDetails: "",
  taxDetails: "",
};

export function ApplyForm() {
  const [plan, setPlan] = useState<string | null>(null);
  const [days, setDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri", "sat"]);
  const [form, setForm] = useState(empty);
  const [more, setMore] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onTier = (event: Event) => {
      const next = (event as CustomEvent<{ plan?: string }>).detail?.plan;
      if (next === "link" || next === "growth" || next === "custom") {
        setPlan(next);
        setMessage(null);
      }
    };
    const onClick = (event: Event) => {
      const button = (event.target as HTMLElement | null)?.closest?.("[data-plan]");
      const next = button?.getAttribute("data-plan");
      if (next === "link" || next === "growth" || next === "custom") {
        setPlan(next);
        setMessage(null);
      }
    };
    const root = document.getElementById("ck-packages");
    window.addEventListener("tier-selected", onTier);
    root?.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("tier-selected", onTier);
      root?.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    if (!plan) return;
    document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [plan]);

  if (!plan) return null;

  const label = plan === "link" ? "Link" : plan === "growth" ? "Growth" : "Custom Brand";

  return (
    <form
      id="apply-form"
      className="mt-8 scroll-mt-6 rounded-3xl border border-line bg-white p-5 text-ink"
      onSubmit={async (event) => {
        event.preventDefault();
        const nextErrors: Record<string, string> = {};
        if (form.businessName.trim().length < 2) nextErrors.businessName = "Business name is required";
        if (form.location.trim().length < 2) nextErrors.location = "Physical location is required";
        if (!normalizeKePhone(form.phone)) nextErrors.phone = "WhatsApp phone is required";
        if (form.socialUrl.trim().length < 4) nextErrors.socialUrl = "A social link is required";
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
          setMessage("Fill the required fields before applying.");
          return;
        }
        setBusy(true);
        setMessage(null);
        const response = await fetch("/api/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, plan, hoursDays: joinHoursDays(days) }),
        });
        const json = (await response.json()) as { error?: string };
        setBusy(false);
        if (!response.ok) {
          setMessage(json.error || "The application could not be sent");
          return;
        }
        setForm(empty);
        setMessage("Application received. Customs Kenya will open the shop and send the studio link.");
      }}
    >
      <h2 className="text-2xl font-medium">Start {label} free for 30 days</h2>
      <p className="mt-1 text-sm text-muted">Four details are enough. The rest can wait.</p>
      <div className="mt-4 grid gap-3">
        <Field label="Business name" value={form.businessName} onChange={(businessName) => setForm({ ...form, businessName })} error={errors.businessName} required />
        <Field label="Physical location" value={form.location} onChange={(location) => setForm({ ...form, location })} error={errors.location} required />
        <Field label="WhatsApp phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} error={errors.phone} required />
        <Field label="Social link" value={form.socialUrl} onChange={(socialUrl) => setForm({ ...form, socialUrl })} placeholder="https://instagram.com/yourshop" error={errors.socialUrl} required />
      </div>
      <fieldset className="mt-4">
        <legend className="text-sm">Working days</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <label key={day.id} className="flex items-center gap-1 rounded-full border border-line px-3 py-1 text-sm">
              <input
                type="checkbox"
                checked={days.includes(day.id)}
                onChange={(event) => {
                  setDays((current) => (event.target.checked ? [...current, day.id] : current.filter((item) => item !== day.id)));
                }}
              />
              {day.label}
            </label>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Opens" type="time" value={form.hoursOpen} onChange={(hoursOpen) => setForm({ ...form, hoursOpen })} />
          <Field label="Closes" type="time" value={form.hoursClose} onChange={(hoursClose) => setForm({ ...form, hoursClose })} />
        </div>
      </fieldset>
      <button type="button" className="mt-4 block text-sm underline" onClick={() => setMore((open) => !open)}>
        {more ? "Hide extra details" : "Add later if you have them"}
      </button>
      {more ? (
        <div className="mt-3 grid gap-3">
          <Field label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
          <Field label="Other social links" value={form.extraSocials} onChange={(extraSocials) => setForm({ ...form, extraSocials })} />
          <Field label="Business registration" value={form.registrationNumber} onChange={(registrationNumber) => setForm({ ...form, registrationNumber })} />
          <Field label="Identification" value={form.identificationDetails} onChange={(identificationDetails) => setForm({ ...form, identificationDetails })} />
          <Field label="Tax details" value={form.taxDetails} onChange={(taxDetails) => setForm({ ...form, taxDetails })} />
        </div>
      ) : null}
      <button type="submit" disabled={busy} className="mt-6 block rounded-full bg-ink px-5 py-3 text-sm text-white disabled:opacity-50">
        {busy ? "Sending…" : "Apply"}
      </button>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      {label}{required ? <span className="text-sale"> *</span> : null}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1 w-full rounded-xl border px-3 py-2 ${error ? "border-sale" : "border-line"}`}
      />
      {error ? <span className="mt-1 block text-xs text-sale">{error}</span> : null}
    </label>
  );
}
