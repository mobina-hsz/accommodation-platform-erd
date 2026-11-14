"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Accommodation, Guest, Reservation, money, dateFa } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const statusLabel: Record<string,string> = { pending:"در انتظار پرداخت", confirmed:"تأیید شده", cancelled:"لغو شده", completed:"تکمیل شده" };
export default function MyBookings() {
  const [guest,setGuest]=useState<Guest|null>(null);
  const [reservations,setReservations]=useState<Reservation[]>([]);
  const [favorites,setFavorites]=useState<Accommodation[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [tab,setTab]=useState<"bookings"|"favorites">("bookings");
  async function loadGuest(g:Guest) {
    setLoading(true);setError("");
    try {
      const [r,f]=await Promise.all([api<Reservation[]>(`/api/reservations?guest_id=${g.guest_id}`),api<{accommodation_id:number}[]>(`/api/guests/${g.guest_id}/favorites`)]);
      setReservations(r);
      const stays=await Promise.all(f.map((x)=>api<Accommodation>(`/api/accommodations/${x.accommodation_id}`).catch(()=>null)));
      setFavorites(stays.filter((x):x is Accommodation=>Boolean(x)));
    } catch(e){setError(e instanceof Error?e.message:"دریافت اطلاعات ناموفق بود.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{void Promise.resolve().then(()=>{try{const saved=localStorage.getItem("stay_guest");if(saved){const g=JSON.parse(saved) as Guest;setGuest(g);void loadGuest(g);}}catch{/* storage unavailable */}});},[]);
  async function cancel(id:number){try{await api(`/api/reservations/${id}/cancel`,{method:"PATCH"});if(guest)await loadGuest(guest);}catch(e){setError(e instanceof Error?e.message:"لغو رزرو انجام نشد.");}}
  async function removeFavorite(id:number){if(!guest)return;try{await api(`/api/guests/${guest.guest_id}/favorites/${id}`,{method:"DELETE"});setFavorites((old)=>old.filter((x)=>x.accommodation_id!==id));}catch(e){setError(e instanceof Error?e.message:"حذف علاقه‌مندی انجام نشد.");}}
  return <main dir="rtl" className="min-h-screen bg-[#faf9f6] text-stone-800"><header className="border-b border-stone-200 bg-white"><div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5"><Link href="/" className="font-black text-teal-950">✳ خانه‌راه</Link><Link href="/" className="text-sm text-stone-500">بازگشت به جست‌وجو ←</Link></div></header><div className="mx-auto max-w-5xl px-5 py-12"><p className="text-xs font-bold text-teal-800">حساب مهمان</p><h1 className="mt-2 text-3xl font-black text-teal-950">سفرهای من</h1><p className="mt-2 text-sm text-stone-500">رزروها و اقامتگاه‌های ذخیره‌شده‌ات را اینجا ببین.</p>
    {!guest&&<Card className="mt-8 max-w-xl"><CardContent><div className="grid gap-3"><p className="font-bold text-teal-950">اطلاعات مهمان در این مرورگر پیدا نشد.</p><p className="text-sm leading-7 text-stone-500">رزروها با اطلاعات مهمانی نمایش داده می‌شوند که هنگام ثبت رزرو در همین مرورگر ذخیره شده است. اگر مرورگر یا دستگاه را عوض کرده‌ای، برای ثبت رزرو جدید می‌توانی از صفحه اقامتگاه شروع کنی.</p><Link href="/" className="text-sm font-bold text-teal-800 underline">رفتن به فهرست اقامتگاه‌ها</Link></div></CardContent></Card>}
    {guest&&<><div className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#eaf0eb] p-5"><div><p className="font-bold text-teal-950">سلام {guest.first_name} {guest.last_name}</p><p className="mt-1 text-xs text-stone-500">{guest.email}</p></div><Button variant="outline" size="sm" onClick={()=>{localStorage.removeItem("stay_guest");localStorage.removeItem("stay_guest_id");setGuest(null);setReservations([]);setFavorites([]);}}>تغییر مهمان</Button></div><div className="mt-8 flex gap-2 border-b border-stone-200"><button onClick={()=>setTab("bookings")} className={`px-5 py-3 text-sm font-bold ${tab==="bookings"?"border-b-2 border-teal-800 text-teal-900":"text-stone-500"}`}>رزروها ({reservations.length})</button><button onClick={()=>setTab("favorites")} className={`px-5 py-3 text-sm font-bold ${tab==="favorites"?"border-b-2 border-teal-800 text-teal-900":"text-stone-500"}`}>علاقه‌مندی‌ها ({favorites.length})</button></div>
      {loading?<p className="py-12 text-center text-sm text-stone-500">در حال دریافت اطلاعات…</p>:tab==="bookings"?(reservations.length?<div className="mt-5 grid gap-4">{reservations.map((r)=><Card key={r.reservation_id}><CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-3"><strong className="text-teal-950">رزرو #{r.reservation_id}</strong><span className={`rounded-full px-3 py-1 text-xs font-bold ${r.status==="confirmed"?"bg-teal-50 text-teal-800":r.status==="cancelled"?"bg-red-50 text-red-700":"bg-amber-50 text-amber-800"}`}>{statusLabel[r.status]||r.status}</span></div><p className="mt-3 text-sm text-stone-600">ورود {dateFa(r.check_in_date)} · خروج {dateFa(r.check_out_date)} · {r.guest_count} مهمان</p><p className="mt-2 text-sm font-bold text-teal-900">{money(r.total_amount)}</p></div><div className="flex flex-wrap gap-2"><Link href={`/accommodation/${r.accommodation_id}`}><Button variant="outline" size="sm">مشاهده اقامتگاه</Button></Link>{["pending","confirmed"].includes(r.status)&&<Button variant="outline" size="sm" onClick={()=>cancel(r.reservation_id)}>لغو رزرو</Button>}</div></CardContent></Card>)}</div>:<Empty text="هنوز رزروی ثبت نکرده‌ای."/>):favorites.length?<div className="mt-5 grid gap-4 sm:grid-cols-2">{favorites.map((a)=><Card key={a.accommodation_id}><CardContent className="flex items-center justify-between gap-3"><div><Link href={`/accommodation/${a.accommodation_id}`} className="font-bold text-teal-950 hover:underline">{a.title}</Link><p className="mt-1 text-xs text-stone-500">{a.address}</p></div><Button variant="ghost" size="sm" onClick={()=>removeFavorite(a.accommodation_id)}>حذف ♥</Button></CardContent></Card>)}</div>:<Empty text="هنوز اقامتگاهی ذخیره نکرده‌ای."/>}</>}
    {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  </div></main>;
}
function Empty({text}:{text:string}){return <div className="mt-8 rounded-2xl border border-dashed border-stone-300 py-16 text-center text-sm text-stone-500">{text}<div className="mt-4"><Link href="/" className="font-bold text-teal-800 underline">دیدن اقامتگاه‌ها</Link></div></div>}
