"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, Accommodation, City, DailyPrice, Guest, json, money } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+n); return localDate(d); };

export default function AccommodationPage() {
  return <Suspense fallback={<div dir="rtl" className="grid min-h-screen place-items-center bg-[#faf9f6] text-stone-500">در حال بارگذاری اقامتگاه…</div>}><AccommodationContent /></Suspense>;
}

function AccommodationContent() {
  const { id } = useParams<{ id: string }>();
  const today = localDate(new Date());
  const [item, setItem] = useState<Accommodation | null>(null);
  const [city, setCity] = useState("");
  const [prices, setPrices] = useState<DailyPrice[]>([]);
  const [start, setStart] = useState(addDays(today, 7));
  const [end, setEnd] = useState(addDays(today, 9));
  const [count, setCount] = useState("2");
  const [guest, setGuest] = useState<Guest | null>(null);
  const [guestForm, setGuestForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [showGuest, setShowGuest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [review, setReview] = useState({ score: "5", comment: "" });

  useEffect(() => {
    api<Accommodation>(`/api/accommodations/${id}`).then(setItem).catch((e) => setError(e.message));
    api<City[]>("/api/cities").then((cities) => api<Accommodation>(`/api/accommodations/${id}`).then((a) => setCity(cities.find((c) => c.city_id === a.city_id)?.name || ""))).catch(() => undefined);
    void Promise.resolve().then(() => { try { const saved = localStorage.getItem("stay_guest"); if (saved) { const currentGuest = JSON.parse(saved) as Guest; setGuest(currentGuest); void api<{ accommodation_id: number }[]>(`/api/guests/${currentGuest.guest_id}/favorites`).then((favorites) => setFavorite(favorites.some((favorite) => favorite.accommodation_id === Number(id)))).catch(() => undefined); } } catch { /* storage unavailable */ } });
  }, [id]);
  useEffect(() => {
    if (!item || !start || !end || end <= start) { void Promise.resolve().then(() => setPrices([])); return; }
    api<DailyPrice[]>(`/api/accommodations/${id}/prices?start=${start}&end=${addDays(end,-1)}`).then(setPrices).catch(() => setPrices([]));
  }, [item, id, start, end]);

  const nights = Math.max(0, Math.round((new Date(`${end}T12:00:00`).getTime()-new Date(`${start}T12:00:00`).getTime())/86400000));
  const priceByDate = useMemo(() => new Map(prices.map((p) => [p.price_date, p])), [prices]);
  const nightly = Array.from({ length: nights }, (_, i) => priceByDate.get(addDays(start, i)));
  const complete = nights > 0 && nightly.length === nights && nightly.every((p) => p && p.availability_status === "available");
  const subtotal = nightly.reduce((sum, p) => sum + (p?.price || 0), 0);
  const total = subtotal * (1 - Number(item?.discount || 0) / 100);
  const images = item?.images?.length ? [...item.images].sort((a,b) => a.display_order-b.display_order).map((x) => x.image_url) : ["https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=90"];

  async function submitBooking(guestOverride?: Guest) {
    setError(""); setNotice("");
    if (!item || !complete) { setError("برای تاریخ‌های انتخاب‌شده قیمت کامل یا ظرفیت آزاد ثبت نشده است."); return; }
    if (Number(count) > item.capacity) { setError("تعداد مهمان از ظرفیت اقامتگاه بیشتر است."); return; }
    const activeGuest = guestOverride ?? guest;
    if (!activeGuest) { setShowGuest(true); return; }
    setBusy(true);
    try {
      const reservation = await api<{ reservation_id: number; total_amount: number }>("/api/reservations", json({ guest_id: activeGuest.guest_id, accommodation_id: item.accommodation_id, check_in_date: start, check_out_date: end, guest_count: Number(count) }));
      const payment = await api<{ payment_id: number }>("/api/payments", json({ reservation_id: reservation.reservation_id, method: "demo", tracking_code: `stay-${Date.now()}` }));
      await api(`/api/payments/${payment.payment_id}/simulate-result?successful=true`, { method: "PATCH" });
      setNotice(`رزرو شماره ${reservation.reservation_id} با پرداخت آزمایشی موفق ثبت شد. مبلغ ${money(reservation.total_amount)}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "ثبت رزرو انجام نشد."); }
    finally { setBusy(false); }
  }

  async function registerGuest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const created = await api<Guest>("/api/guests", json(guestForm));
      setGuest(created); localStorage.setItem("stay_guest", JSON.stringify(created)); localStorage.setItem("stay_guest_id", String(created.guest_id)); setShowGuest(false);
      await submitBooking(created);
    } catch (e) { setError(e instanceof Error ? e.message : "ثبت اطلاعات مهمان انجام نشد."); }
    finally { setBusy(false); }
  }

  async function toggleFavorite() {
    if (!guest) { setShowGuest(true); setError("برای ذخیره علاقه‌مندی، ابتدا اطلاعات مهمان را ثبت کن."); return; }
    try { if (favorite) await api(`/api/guests/${guest.guest_id}/favorites/${id}`, { method: "DELETE" }); else await api(`/api/guests/${guest.guest_id}/favorites/${id}`, { method: "POST" }); setFavorite(!favorite); }
    catch (e) { setError(e instanceof Error ? e.message : "تغییر علاقه‌مندی انجام نشد."); }
  }

  async function submitReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!guest) { setShowGuest(true); return; }
    try { await api("/api/ratings", json({ guest_id: guest.guest_id, accommodation_id: Number(id), score: Number(review.score), comment: review.comment })); setNotice("امتیاز شما ثبت شد."); setReview({ score: "5", comment: "" }); }
    catch (e) { setError(e instanceof Error ? e.message : "ثبت نظر انجام نشد."); }
  }

  if (!item && !error) return <div dir="rtl" className="grid min-h-screen place-items-center bg-[#faf9f6] text-stone-500">در حال دریافت اطلاعات اقامتگاه…</div>;
  if (!item) return <div dir="rtl" className="mx-auto max-w-3xl p-10 text-center"><p className="text-red-700">{error}</p><Link className="mt-5 inline-block text-teal-800 underline" href="/">بازگشت به خانه</Link></div>;
  return <main dir="rtl" className="min-h-screen bg-[#faf9f6] text-stone-800"><header className="border-b border-stone-200 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5"><Link href="/" className="font-black text-teal-950">✳ خانه‌راه</Link><Link href="/my-bookings" className="text-sm font-semibold text-stone-600">سفرهای من</Link></div></header>
    <div className="mx-auto max-w-7xl px-5 py-8"><Link href="/" className="text-sm text-stone-500 hover:text-teal-800">← بازگشت به اقامتگاه‌ها</Link><div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-teal-800">⌖ {city} · {item.address}</p><h1 className="mt-2 text-3xl font-black text-teal-950">{item.title}</h1><p className="mt-2 text-sm text-stone-500">{item.type} · ظرفیت {item.capacity} نفر · {item.area ? `${item.area} متر مربع` : ""}</p></div><Button variant="outline" onClick={toggleFavorite}>{favorite ? "♥ ذخیره شده" : "♡ افزودن به علاقه‌مندی‌ها"}</Button></div>
      <div className="mt-7 grid gap-3 md:grid-cols-[1.5fr_1fr_1fr] md:grid-rows-2"><div className="relative h-72 overflow-hidden rounded-3xl bg-stone-200 md:row-span-2 md:h-[440px]"><div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${images[imageIndex]}")` }} /><button onClick={() => setImageIndex((imageIndex+images.length-1)%images.length)} className="absolute right-4 top-1/2 rounded-full bg-white/90 px-3 py-2">›</button><button onClick={() => setImageIndex((imageIndex+1)%images.length)} className="absolute left-4 top-1/2 rounded-full bg-white/90 px-3 py-2">‹</button></div>{images.slice(1,3).map((src) => <div key={src} className="hidden h-[214px] rounded-3xl bg-cover bg-center md:block" style={{ backgroundImage: `url("${src}")` }} />)}{item.images.length === 0 && <div className="hidden rounded-3xl bg-[#e8eee9] p-8 text-teal-900 md:block">فضایی برای آرامش و استراحت</div>}</div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_390px]"><div className="space-y-9"><section><h2 className="text-xl font-black text-teal-950">درباره این اقامتگاه</h2><p className="mt-3 leading-8 text-stone-600">{item.title} در {city || "این مقصد"}، با ظرفیت پذیرایی از {item.capacity} مهمان آماده میزبانی از شماست. نشانی: {item.address}</p></section><section><h2 className="text-xl font-black text-teal-950">امکانات اقامتگاه</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{item.amenities.map((a) => <div key={a.amenity_id} className="rounded-xl border border-stone-200 bg-white p-4 text-sm">✦ {a.name}</div>)}</div>{!item.amenities.length && <p className="mt-3 text-sm text-stone-500">امکاناتی ثبت نشده است.</p>}</section><section><h2 className="text-xl font-black text-teal-950">قوانین اقامت</h2><div className="mt-4 space-y-3">{item.rules.map((r) => <div key={r.custom_rule_id} className="rounded-xl bg-white p-4"><strong className="text-sm">{r.title}</strong><p className="mt-1 text-sm text-stone-500">{r.description}</p></div>)}</div>{!item.rules.length && <p className="mt-3 text-sm text-stone-500">قانون اختصاصی ثبت نشده است.</p>}</section><section><h2 className="text-xl font-black text-teal-950">ثبت امتیاز و نظر</h2><form onSubmit={submitReview} className="mt-4 grid gap-3 rounded-2xl border border-stone-200 bg-white p-5"><label className="grid gap-2 text-sm">امتیاز<select value={review.score} onChange={(e) => setReview({...review,score:e.target.value})} className="h-11 rounded-xl border border-stone-200 px-3">{[5,4,3,2,1].map((n)=><option key={n} value={n}>{n} از ۵</option>)}</select></label><textarea value={review.comment} onChange={(e)=>setReview({...review,comment:e.target.value})} placeholder="تجربه‌ات را بنویس..." className="min-h-24 rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-teal-700"/><Button type="submit" className="w-fit">ثبت نظر</Button></form></section></div>
      <aside className="h-fit lg:sticky lg:top-6"><Card><CardContent className="space-y-5"><div className="flex items-center justify-between"><div><span className="text-xs text-stone-500">قیمت بر اساس تاریخ انتخابی</span><p className="mt-1 text-xl font-black text-teal-950">{complete ? money(total) : "قیمت نامشخص"}</p></div>{item.discount>0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{item.discount}% تخفیف</span>}</div><div className="grid grid-cols-2 gap-3"><Field>ورود<Input type="date" min={today} value={start} onChange={(e)=>setStart(e.target.value)}/></Field><Field>خروج<Input type="date" min={addDays(start,1)} value={end} onChange={(e)=>setEnd(e.target.value)}/></Field></div><Field>تعداد مهمان<select value={count} onChange={(e)=>setCount(e.target.value)} className="h-11 rounded-xl border border-stone-200 px-3">{Array.from({length:item.capacity},(_,i)=>i+1).map((n)=><option key={n} value={n}>{n} نفر</option>)}</select></Field><div className="rounded-xl bg-stone-50 p-4 text-sm"><div className="flex justify-between"><span className="text-stone-500">{nights} شب · قیمت پایه</span><span>{money(subtotal)}</span></div>{item.discount>0&&<div className="mt-2 flex justify-between text-teal-800"><span>تخفیف</span><span>− {money(subtotal-total)}</span></div>}<div className="mt-3 flex justify-between border-t border-stone-200 pt-3 font-black"><span>مبلغ نهایی</span><span>{complete?money(total):"—"}</span></div></div>{!complete&&<p className="text-xs leading-6 text-amber-800">قیمت روزانه برای تمام شب‌های انتخابی باید توسط مدیریت ثبت شده باشد تا رزرو انجام شود.</p>}<Button className="w-full" size="lg" disabled={busy||!complete} onClick={()=>void submitBooking()}>{busy?"در حال ثبت…":"ثبت رزرو و پرداخت آزمایشی"}</Button><p className="text-center text-[11px] leading-5 text-stone-400">پرداخت این نسخه آزمایشی است و به درگاه بانکی متصل نیست.</p></CardContent></Card></aside></div>
      {showGuest&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardContent><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black text-teal-950">اطلاعات مهمان</h2><button onClick={()=>setShowGuest(false)} aria-label="بستن">✕</button></div><form onSubmit={registerGuest} className="grid gap-3"><div className="grid grid-cols-2 gap-3"><Field>نام<Input required value={guestForm.first_name} onChange={(e)=>setGuestForm({...guestForm,first_name:e.target.value})}/></Field><Field>نام خانوادگی<Input required value={guestForm.last_name} onChange={(e)=>setGuestForm({...guestForm,last_name:e.target.value})}/></Field></div><Field>ایمیل<Input type="email" required value={guestForm.email} onChange={(e)=>setGuestForm({...guestForm,email:e.target.value})}/></Field><Field>شماره تماس<Input required minLength={5} value={guestForm.phone} onChange={(e)=>setGuestForm({...guestForm,phone:e.target.value})}/></Field><Button disabled={busy} type="submit">{busy?"در حال ثبت…":"ثبت اطلاعات و ادامه رزرو"}</Button></form></CardContent></Card></div>}
      {(error||notice)&&<div className={`fixed bottom-5 left-5 z-40 max-w-md rounded-2xl p-4 text-sm shadow-xl ${error?"bg-red-50 text-red-800":"bg-teal-900 text-white"}`}>{error||notice}<button className="mr-3 underline" onClick={()=>{setError("");setNotice("")}}>بستن</button></div>}
    </div></main>;
}
