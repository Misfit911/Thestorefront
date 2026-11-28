const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export const WEEKDAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
] as const;

export function parseHoursDays(value: string) {
  const selected = new Set(
    value
      .split(",")
      .map((day) => day.trim().toLowerCase())
      .filter(Boolean),
  );
  return WEEKDAYS.filter((day) => selected.has(day.id)).map((day) => day.id);
}

export function joinHoursDays(days: string[]) {
  const selected = new Set(days.map((day) => day.toLowerCase()));
  return WEEKDAYS.filter((day) => selected.has(day.id))
    .map((day) => day.id)
    .join(",");
}

function nairobiParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = read("weekday").slice(0, 3).toLowerCase();
  const hour = read("hour") === "24" ? "00" : read("hour");
  return {
    day: DAY_KEYS.find((key) => weekday.startsWith(key)) ?? "mon",
    date: `${read("year")}-${read("month")}-${read("day")}`,
    minutes: Number(hour) * 60 + Number(read("minute") || "0"),
  };
}

function minutesOf(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function nairobiDate(now = new Date()) {
  return nairobiParts(now).date;
}

export function isStoreOpen(
  store: { hoursDays: string; hoursOpen: string; hoursClose: string },
  now = new Date(),
) {
  const clock = nairobiParts(now);
  const openDays = new Set(parseHoursDays(store.hoursDays));
  if (!openDays.has(clock.day)) return false;
  const open = minutesOf(store.hoursOpen);
  const close = minutesOf(store.hoursClose);
  if (open == null || close == null || close <= open) return false;
  return clock.minutes >= open && clock.minutes < close;
}
