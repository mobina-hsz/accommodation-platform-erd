export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export type City = { city_id: number; country_id: number; name: string };
export type Country = { country_id: number; name: string };
export type Amenity = { amenity_id: number; name: string; category?: string | null };
export type Accommodation = {
  accommodation_id: number; city_id: number; title: string; address: string; type: string;
  capacity: number; area?: number | null; floor_unit?: string | null; build_year?: number | null;
  check_in_time?: string | null; check_out_time?: string | null; discount: number;
  average_rating?: number | null;
  images: { image_no: number; image_url: string; caption?: string | null; display_order: number }[];
  rules: { custom_rule_id: number; title: string; description: string }[];
  amenities: Amenity[];
};
export type Guest = { guest_id: number; first_name: string; last_name: string; email: string; phone: string; birth_date?: string | null; gender?: string | null };
export type Reservation = { reservation_id: number; guest_id: number; accommodation_id: number; check_in_date: string; check_out_date: string; guest_count: number; total_amount: number; status: string; created_at: string };
export type DailyPrice = { accommodation_id: number; price_date: string; price: number; availability_status: string };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function api<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try { response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" }); }
  catch { throw new ApiError("ارتباط با سرور برقرار نشد. مطمئن شوید بک‌اند اجراست.", 0); }
  if (!response.ok) {
    let message = `خطای سرور (${response.status})`;
    try { const data = await response.json(); message = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail ?? data); } catch { /* response has no JSON body */ }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const json = (value: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(value) });
export const putJson = (value: unknown): RequestInit => ({ method: "PUT", body: JSON.stringify(value) });
export const money = (value: number) => new Intl.NumberFormat("fa-IR").format(Math.round(value)) + " تومان";
export const dateFa = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
