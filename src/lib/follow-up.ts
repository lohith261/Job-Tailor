export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let remaining = days;

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }

  return result;
}

export function getSuggestedFollowUpDate(appliedAt?: Date | null): Date {
  return addBusinessDays(appliedAt ?? new Date(), 5);
}

export function formatDateLabel(iso: string | Date): string {
  const value = iso instanceof Date ? iso : new Date(iso);
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getFollowUpUrgency(
  followUpDate?: string | null
): "overdue" | "soon" | "upcoming" | "none" {
  if (!followUpDate) return "none";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(followUpDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return "overdue";
  if (diffDays <= 2) return "soon";
  return "upcoming";
}
