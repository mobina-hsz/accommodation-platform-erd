"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, Accommodation, City } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const fallbackImages = [
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=85",
];
const typeLabels: Record<string, string> = { villa: "ویلا", apartment: "آپارتمان", suite: "سوئیت", hotel: "هتل", cottage: "کلبه", ecotourism: "بوم‌گردی" };

export default function Home() {
  const [items, setItems] = useState<Accommodation[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [city, setCity] = useState("");
  const [capacity, setCapacity] = useState("1");
  const [kind, setKind] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (city) params.set("city_id", city);
      if (capacity) params.set("min_capacity", capacity);
      if (kind) params.set("accommodation_type", kind);
      if (checkIn && checkOut) { params.set("check_in", checkIn); params.set("check_out", checkOut); }
      const data = await api<Accommodation[]>(`/api/accommodations${params.size ? `?${params}` : ""}`);
      setItems(data);
    } catch (e) { setError(e instanceof Error ? e.message : "دریافت اقامتگاه‌ها ناموفق بود."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    api<City[]>("/api/cities").then(setCities).catch(() => setCities([]));
  }, []);
  useEffect(() => { void Promise.resolve().then(() => load()); /* initial catalog */ }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = useMemo(() => items.filter((a) => `${a.title} ${a.address} ${cities.find((c) => c.city_id === a.city_id)?.name || ""}`.toLowerCase().includes(query.toLowerCase())), [items, query, cities]);

  return <main className="min-h-screen w-full overflow-x-clip bg-[#faf9f6] text-stone-800" dir="rtl">
    <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#faf9f6]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-teal-900 text-xl text-white">✳</span>
          <span><strong className="block text-lg font-black tracking-tight text-teal-950">خانه‌راه</strong><small className="text-[10px] tracking-wide text-stone-500">اقامت، با خیال آسوده</small></span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-stone-600 md:flex"><a href="#stays" className="hover:text-teal-800">اقامتگاه‌ها</a><a href="#why" className="hover:text-teal-800">چرا خانه‌راه؟</a><Link href="/my-bookings" className="hover:text-teal-800">سفرهای من</Link></nav>
        <div className="flex items-center gap-2"><Link href="/my-bookings" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 sm:block">رزروهای من</Link><Link href="/admin"><Button size="sm">ورود مدیر</Button></Link></div>
      </div>
    </header>

    <section className="relative isolate overflow-hidden bg-[#173f3b]">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(12,42,39,.94)_0%,rgba(12,42,39,.72)_48%,rgba(12,42,39,.12)_100%),url('https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=2000&q=90')] bg-cover bg-center" />
      <div className="mx-auto grid min-h-[520px] w-full min-w-0 max-w-7xl items-center px-5 py-16 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
        <div className="min-w-0 max-w-2xl text-white">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-teal-50"><span className="size-2 rounded-full bg-amber-300" /> مقصد بعدی‌ات همین‌جاست</div>
          <h1 className="text-4xl font-black leading-[1.5] tracking-tight sm:text-5xl lg:text-[58px]">جایی برای<br /><span className="text-[#e8c995]">خاطره‌های تازه</span></h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-white/75">از خانه‌های دنج جنگلی تا ویلاهای ساحلی؛ اقامتگاه دلخواهت را پیدا کن و با خیال راحت راهی سفر شو.</p>
          <div className="mt-9 flex flex-wrap gap-6 text-xs text-white/80"><span>✦ اقامتگاه‌های منتخب</span><span>✦ رزرو آنلاین آسان</span><span>✦ قیمت شفاف</span></div>
        </div>
        <div className="mt-12 w-full min-w-0 rounded-[28px] border border-white/30 bg-white p-5 text-stone-800 shadow-2xl shadow-black/20 sm:p-7 lg:mt-0">
          <div className="mb-6 flex items-center justify-between"><div><h2 className="text-xl font-black text-teal-950">اقامت بعدی‌ات را پیدا کن</h2><p className="mt-1 text-xs text-stone-500">جست‌وجو در میان اقامتگاه‌های ثبت‌شده</p></div><span className="text-2xl">⌕</span></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs font-bold text-stone-600">مقصد<select value={city} onChange={(e) => setCity(e.target.value)} className="h-12 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-normal outline-none focus:border-teal-700"><option value="">همه شهرها</option>{cities.map((c) => <option key={c.city_id} value={c.city_id}>{c.name}</option>)}</select></label>
            <label className="grid gap-2 text-xs font-bold text-stone-600">نوع اقامتگاه<select value={kind} onChange={(e) => setKind(e.target.value)} className="h-12 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-normal outline-none focus:border-teal-700"><option value="">همه موارد</option>{Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="grid gap-2 text-xs font-bold text-stone-600">تاریخ ورود<input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="h-12 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-normal outline-none focus:border-teal-700" /></label>
            <label className="grid gap-2 text-xs font-bold text-stone-600">تاریخ خروج<input type="date" min={checkIn || undefined} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="h-12 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-normal outline-none focus:border-teal-700" /></label>
            <label className="grid gap-2 text-xs font-bold text-stone-600 sm:col-span-2">تعداد مهمان<select value={capacity} onChange={(e) => setCapacity(e.target.value)} className="h-12 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-normal outline-none focus:border-teal-700">{[1,2,3,4,5,6,8,10,12].map((n) => <option key={n} value={n}>{n} نفر و بیشتر</option>)}</select></label>
          </div>
          <Button className="mt-5 w-full" size="lg" onClick={() => { if (checkIn && checkOut && checkOut <= checkIn) { setError("تاریخ خروج باید بعد از تاریخ ورود باشد."); return; } load(); document.getElementById("stays")?.scrollIntoView({ behavior: "smooth" }); }}>جست‌وجوی اقامتگاه‌ها <span>←</span></Button>
        </div>
      </div>
    </section>

    <section id="stays" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-3 text-xs font-bold tracking-wide text-teal-800">برای سفر بعدی تو</p><h2 className="text-3xl font-black text-teal-950">اقامتگاه‌هایی برای دوست داشتن</h2><p className="mt-2 text-sm text-stone-500">گزینه‌ای را انتخاب کن و جزئیاتش را ببین.</p></div><div className="w-full sm:max-w-xs"><Input placeholder="جست‌وجوی نام یا نشانی..." value={query} onChange={(e) => setQuery(e.target.value)} /></div></div>
      {error && <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button onClick={() => setError("")} className="mr-3 underline">بستن</button></div>}
      {loading ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((n) => <div key={n} className="h-[370px] animate-pulse rounded-3xl bg-stone-200" />)}</div> : filtered.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((a, i) => <StayCard key={a.accommodation_id} item={a} city={cities.find((c) => c.city_id === a.city_id)?.name || "ایران"} image={a.images?.[0]?.image_url || fallbackImages[i % fallbackImages.length]} />)}</div> : <Card className="grid justify-items-center gap-3 py-16 text-center"><span className="text-4xl">⌂</span><h3 className="font-bold text-teal-950">هنوز اقامتگاهی برای نمایش نداریم</h3><p className="text-sm text-stone-500">فیلترها را تغییر بده یا بعداً دوباره سر بزن.</p><Button variant="outline" onClick={() => { setCity(""); setKind(""); setCapacity("1"); setCheckIn(""); setCheckOut(""); setQuery(""); }}>پاک کردن فیلترها</Button></Card>}
    </section>

    <section id="why" className="border-y border-stone-200 bg-[#f1f2ed] py-16"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mb-10 max-w-xl"><p className="mb-3 text-xs font-bold text-teal-800">تجربه‌ای آسوده‌تر</p><h2 className="text-3xl font-black text-teal-950">از جست‌وجو تا اقامت، همراه تو هستیم</h2></div><div className="grid gap-8 md:grid-cols-3">{[{icon:"⌕",title:"پیدا کردن آسان",desc:"با فیلتر شهر، ظرفیت و تاریخ، گزینه‌های مناسب سفرت را پیدا کن."},{icon:"▣",title:"رزرو شفاف",desc:"قیمت شب‌ها و مبلغ نهایی پیش از ثبت رزرو برایت نمایش داده می‌شود."},{icon:"♡",title:"انتخاب‌های محبوب",desc:"اقامتگاه‌های موردعلاقه‌ات را ذخیره کن و هر زمان خواستی برگرد."}].map((x) => <div key={x.title} className="flex gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl text-teal-800 shadow-sm">{x.icon}</span><div><h3 className="font-bold text-teal-950">{x.title}</h3><p className="mt-2 text-sm leading-7 text-stone-600">{x.desc}</p></div></div>)}</div></div></section>
    <footer className="bg-[#173f3b] py-10 text-white"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-5 sm:flex-row sm:items-center lg:px-8"><div><strong className="text-xl font-black">خانه‌راه</strong><p className="mt-2 text-xs text-white/60">راهی برای رسیدن به اقامت دلخواه</p></div><div className="flex gap-5 text-sm text-white/75"><Link href="/my-bookings">سفرهای من</Link><Link href="/admin">پنل مدیریت</Link></div><span className="text-xs text-white/40">© خانه‌راه · ۱۴۰۵</span></div></footer>
  </main>;
}

function StayCard({ item, city, image }: { item: Accommodation; city: string; image: string }) {
  return <Card className="group overflow-hidden border-0 transition duration-300 hover:-translate-y-1 hover:shadow-xl"><Link href={`/accommodation/${item.accommodation_id}`}><div className="relative h-60 overflow-hidden bg-stone-200"><div className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105" style={{ backgroundImage: `url("${image}")` }} />{item.discount > 0 && <span className="absolute right-4 top-4 rounded-full bg-[#e8c995] px-3 py-1.5 text-xs font-black text-teal-950">{item.discount}% تخفیف</span>}<span className="absolute bottom-4 right-4 rounded-full bg-black/45 px-3 py-1.5 text-xs text-white backdrop-blur">{typeLabels[item.type] || item.type}</span></div><div className="p-5"><div className="mb-3 flex items-center justify-between"><span className="text-xs text-stone-500">⌖ {city}</span><span className="text-xs text-amber-600">★ {item.average_rating ? item.average_rating.toFixed(1) : "جدید"}</span></div><h3 className="text-lg font-black text-teal-950">{item.title}</h3><p className="mt-2 line-clamp-1 text-xs text-stone-500">{item.address}</p><div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4"><span className="text-xs text-stone-500">ظرفیت {item.capacity} نفر</span><span className="text-sm font-bold text-teal-900">مشاهده جزئیات <span className="mr-1">←</span></span></div></div></Link></Card>;
}
