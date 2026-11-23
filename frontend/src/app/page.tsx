"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpLeft, CalendarDays, Check, ChevronDown, Compass, Globe2, Heart, House, MapPin, Search, ShieldCheck, Sparkles, Star, Users, Wallet } from "lucide-react";
import { api, Accommodation, City, Country } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [capacity, setCapacity] = useState("2");
  const [kind, setKind] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [query, setQuery] = useState("");
  const [guestId, setGuestId] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("stay_guest");
      if (saved) {
        const guest = JSON.parse(saved) as { guest_id: number };
        setGuestId(guest.guest_id);
        api<{ accommodation_id: number }[]>(`/api/guests/${guest.guest_id}/favorites`).then((rows) => setFavorites(rows.map((row) => row.accommodation_id))).catch(() => undefined);
      }
    } catch { /* storage unavailable */ }
    Promise.all([api<Country[]>("/api/countries"), api<City[]>("/api/cities")]).then(([co, ci]) => { setCountries(co); setCities(ci); }).catch(() => undefined);
  }, []);

  async function load() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (city) params.set("city_id", city);
      if (capacity) params.set("min_capacity", capacity);
      if (kind) params.set("accommodation_type", kind);
      if (checkIn && checkOut) { params.set("check_in", checkIn); params.set("check_out", checkOut); }
      setItems(await api<Accommodation[]>(`/api/accommodations${params.size ? `?${params}` : ""}`));
    } catch (e) { setError(e instanceof Error ? e.message : "دریافت اقامتگاه‌ها ناموفق بود."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); // eslint-disable-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => items.filter((a) => {
    const c = cities.find((x) => x.city_id === a.city_id);
    const countryMatches = !country || String(c?.country_id) === country;
    return countryMatches && `${a.title} ${a.address} ${c?.name || ""}`.toLowerCase().includes(query.toLowerCase());
  }), [items, query, cities, country]);
  const cityOptions = cities.filter((c) => !country || String(c.country_id) === country);

  async function toggleFavorite(id: number) {
    if (!guestId) { window.location.href = `/accommodation/${id}`; return; }
    try {
      if (favorites.includes(id)) { await api(`/api/guests/${guestId}/favorites/${id}`, { method: "DELETE" }); setFavorites((old) => old.filter((x) => x !== id)); }
      else { await api(`/api/guests/${guestId}/favorites/${id}`, { method: "POST" }); setFavorites((old) => [...old, id]); }
    } catch (e) { setError(e instanceof Error ? e.message : "ذخیره علاقه‌مندی انجام نشد."); }
  }

  return <main className="min-h-screen overflow-x-clip bg-[#fbfaf7] text-[#202b27]" dir="rtl">
    <header className="sticky top-0 z-40 border-b border-[#e9e6df]/80 bg-[#fbfaf7]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 lg:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="خانه‌راه، صفحه اصلی"><span className="brand-mark grid size-11 place-items-center rounded-[17px] bg-[#164e43] text-white"><House size={20} strokeWidth={1.8}/></span><span><strong className="block text-[19px] font-black tracking-tight text-[#164e43]">خانه‌راه</strong><span className="block text-[10px] tracking-wide text-[#7d847c]">جایی برای حال خوب</span></span></Link>
        <nav className="hidden items-center gap-8 text-[13px] font-semibold text-[#5e6962] md:flex"><a href="#stays" className="transition hover:text-[#164e43]">اقامتگاه‌ها</a><a href="#experience" className="transition hover:text-[#164e43]">تجربه خانه‌راه</a><Link href="/my-bookings" className="transition hover:text-[#164e43]">علاقه‌مندی و سفرها</Link></nav>
        <div className="flex items-center gap-2"><Link href="/my-bookings" className="hidden items-center gap-2 rounded-full border border-[#e4e3dc] px-4 py-2.5 text-xs font-bold text-[#34463e] transition hover:border-[#164e43] sm:flex"><Heart size={15}/> سفرهای من</Link><Link href="/admin"><Button className="h-10 rounded-full bg-[#164e43] px-5 text-xs font-bold hover:bg-[#103d34]">ورود میزبان</Button></Link></div>
      </div>
    </header>

    <section className="hero-scene relative isolate overflow-hidden bg-[#173e35]">
      <div className="hero-photo absolute inset-0 -z-20"/><div className="hero-shade absolute inset-0 -z-10"/><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/>
      <div className="mx-auto grid min-h-[650px] max-w-[1320px] items-center gap-12 px-5 py-16 lg:grid-cols-[1fr_480px] lg:px-8 lg:py-20">
        <div className="hero-copy max-w-2xl text-white"><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white/90 backdrop-blur"><Sparkles size={14} className="text-[#e5c58e]"/> سفر، از انتخاب خانه شروع می‌شود</div><h1 className="text-[clamp(42px,6vw,76px)] font-black leading-[1.28] tracking-tight">جایی برای<br/><span className="text-[#e8c995]">خاطره‌های تازه</span></h1><p className="mt-6 max-w-lg text-[15px] leading-8 text-white/75">از کلبه‌ای میان درخت‌ها تا خانه‌ای رو به دریا؛ اقامتگاه دلخواهت را پیدا کن و با خیال راحت راهی شو.</p><div className="mt-9 flex flex-wrap gap-5 text-xs text-white/75"><span className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#e8c995]"/> قوانین روشن هر اقامتگاه</span><span className="flex items-center gap-2"><CalendarDays size={16} className="text-[#e8c995]"/> تقویم و قیمت روزانه</span></div></div>
        <div className="search-panel w-full rounded-[30px] border border-white/55 bg-[#fffefa] p-5 text-[#202b27] shadow-[0_28px_80px_rgba(0,0,0,.25)] sm:p-7"><div className="mb-6 flex items-start justify-between"><div><h2 className="text-xl font-black text-[#164e43]">اقامت بعدی‌ات را پیدا کن</h2><p className="mt-1.5 text-xs text-[#818780]">مقصد را انتخاب کن، ما خانه‌اش را پیدا می‌کنیم.</p></div><span className="grid size-11 place-items-center rounded-2xl bg-[#edf2ed] text-[#164e43]"><Compass size={21}/></span></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="search-field"><span><Globe2 size={14}/> کشور</span><select value={country} onChange={(e)=>{setCountry(e.target.value);setCity("");}}><option value="">همه کشورها</option>{countries.map((c)=><option key={c.country_id} value={c.country_id}>{c.name}</option>)}</select></label><label className="search-field"><span><MapPin size={14}/> شهر</span><select value={city} onChange={(e)=>setCity(e.target.value)}><option value="">همه شهرها</option>{cityOptions.map((c)=><option key={c.city_id} value={c.city_id}>{c.name}</option>)}</select></label><label className="search-field"><span><CalendarDays size={14}/> ورود</span><input type="date" min={new Date().toISOString().slice(0,10)} value={checkIn} onChange={(e)=>setCheckIn(e.target.value)}/></label><label className="search-field"><span><CalendarDays size={14}/> خروج</span><input type="date" min={checkIn || new Date().toISOString().slice(0,10)} value={checkOut} onChange={(e)=>setCheckOut(e.target.value)}/></label><label className="search-field sm:col-span-2"><span><Users size={14}/> تعداد مهمان</span><select value={capacity} onChange={(e)=>setCapacity(e.target.value)}>{[1,2,3,4,5,6,8,10,12].map((n)=><option key={n} value={n}>{n} نفر و بیشتر</option>)}</select></label></div>
          <Button className="mt-4 h-12 w-full rounded-2xl bg-[#164e43] text-sm font-bold hover:bg-[#103d34]" onClick={()=>{if(checkIn&&checkOut&&checkOut<=checkIn){setError("تاریخ خروج باید بعد از تاریخ ورود باشد.");return;}void load();document.getElementById("stays")?.scrollIntoView({behavior:"smooth"});}}><Search size={17}/> جست‌وجوی اقامتگاه‌ها <ArrowLeft size={16}/></Button><p className="mt-3 text-center text-[10px] text-[#939890]">رزرو شفاف · انتخاب آزاد · مقصدهای متنوع</p>
        </div>
      </div>
      <div className="hero-bottom-line"/>
    </section>

    <section id="stays" className="mx-auto max-w-[1320px] scroll-mt-24 px-5 py-20 lg:px-8 lg:py-24"><div className="mb-9 flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><p className="mb-3 text-xs font-bold text-[#8b6a3d]">برای سفر بعدی‌ات</p><h2 className="text-3xl font-black tracking-tight text-[#164e43] sm:text-4xl">خانه‌هایی برای دوست داشتن</h2><p className="mt-3 text-sm leading-7 text-[#778078]">گزینه‌ها را ببین، قوانین را بخوان و خانه مناسب خودت را انتخاب کن.</p></div><div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-[510px]"><label className="relative flex-1"><Search size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#89918a]"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="نام اقامتگاه، شهر یا نشانی..." className="h-12 w-full rounded-2xl border border-[#e6e5de] bg-white pr-11 pl-4 text-sm outline-none transition focus:border-[#164e43]"/></label><select value={kind} onChange={(e)=>setKind(e.target.value)} className="h-12 rounded-2xl border border-[#e6e5de] bg-white px-4 text-sm outline-none focus:border-[#164e43]"><option value="">همه نوع اقامتگاه</option>{Object.entries(typeLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div></div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-[#8a918a]">{loading?"در حال جست‌وجو...":`${filtered.length.toLocaleString("fa-IR")} اقامتگاه برای انتخاب`}</span>{(country||city||kind||query||checkIn||checkOut)&&<button className="text-xs font-bold text-[#164e43] underline underline-offset-4" onClick={()=>{setCountry("");setCity("");setKind("");setQuery("");setCapacity("2");setCheckIn("");setCheckOut("");void load();}}>پاک کردن فیلترها</button>}</div>
      {error&&<div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button onClick={()=>setError("")} className="mr-3 underline">بستن</button></div>}
      {loading?<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((n)=><div key={n} className="h-[390px] animate-pulse rounded-[26px] bg-[#eeece6]"/>)}</div>:filtered.length?<div className="stay-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((a,i)=><StayCard key={a.accommodation_id} item={a} city={cities.find((c)=>c.city_id===a.city_id)?.name||""} countryName={countries.find((co)=>co.country_id===cities.find((c)=>c.city_id===a.city_id)?.country_id)?.name||""} image={a.images?.[0]?.image_url||fallbackImages[i%fallbackImages.length]} favorite={favorites.includes(a.accommodation_id)} onFavorite={()=>void toggleFavorite(a.accommodation_id)} />)}</div>:<Card className="grid justify-items-center gap-3 rounded-[26px] border-dashed py-16 text-center"><span className="text-4xl">⌂</span><h3 className="font-bold text-[#164e43]">اقامتگاهی با این مشخصات پیدا نشد</h3><p className="text-sm text-[#858b84]">فیلترها را تغییر بده یا بعداً دوباره سر بزن.</p><Button variant="outline" className="rounded-full" onClick={()=>{setCountry("");setCity("");setKind("");setCapacity("2");setCheckIn("");setCheckOut("");setQuery("");void load();}}>نمایش همه اقامتگاه‌ها</Button></Card>}
    </section>

    <section id="experience" className="border-y border-[#e8e6df] bg-[#f0f2ec] py-16 lg:py-20"><div className="mx-auto max-w-[1320px] px-5 lg:px-8"><div className="mb-11 max-w-2xl"><p className="mb-3 text-xs font-bold text-[#8b6a3d]">تجربه‌ای آرام‌تر</p><h2 className="text-3xl font-black leading-tight text-[#164e43]">از پیدا کردن خانه تا<br className="hidden sm:block"/> لحظه رسیدن، همراهت هستیم.</h2></div><div className="grid gap-8 md:grid-cols-3">{[{icon:MapPin,title:"مقصدهای متنوع",desc:"با فیلتر کشور و شهر، اقامتگاه مناسب سفر خودت را سریع‌تر پیدا کن."},{icon:CalendarDays,title:"تقویم و قیمت روشن",desc:"روزهای قابل رزرو و قیمت شب‌ها را در صفحه هر خانه بررسی کن."},{icon:ShieldCheck,title:"قوانین مشخص",desc:"قوانین ورود و خروج و شرایط هر اقامتگاه را پیش از رزرو بخوان."}].map((x,i)=><div key={x.title} className="feature-item flex gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-[#164e43] shadow-sm">{i===0?<MapPin size={21}/>:i===1?<CalendarDays size={21}/>:<ShieldCheck size={21}/>}</span><div><h3 className="font-bold text-[#164e43]">{x.title}</h3><p className="mt-2 text-sm leading-7 text-[#737c74]">{x.desc}</p></div></div>)}</div></div></section>
    <footer className="bg-[#173e35] py-10 text-white"><div className="mx-auto flex max-w-[1320px] flex-col justify-between gap-6 px-5 sm:flex-row sm:items-center lg:px-8"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-white/10"><House size={18}/></span><div><strong className="text-lg font-black">خانه‌راه</strong><p className="mt-1 text-xs text-white/55">راهی برای رسیدن به اقامت دلخواه</p></div></div><div className="flex gap-5 text-sm text-white/70"><Link href="/my-bookings">سفرهای من</Link><Link href="/admin">پنل میزبان</Link></div><span className="text-xs text-white/40">© خانه‌راه · ۱۴۰۵</span></div></footer>
  </main>;
}

function StayCard({item,city,countryName,image,favorite,onFavorite}:{item:Accommodation;city:string;countryName:string;image:string;favorite:boolean;onFavorite:()=>void}) {
  return <Card className="stay-card group overflow-hidden rounded-[26px] border border-[#e9e7e0] bg-white transition duration-500 hover:-translate-y-1.5 hover:border-[#cbd8d0] hover:shadow-[0_22px_50px_rgba(28,59,48,.12)]"><div className="relative h-[258px] overflow-hidden bg-[#e9e9e2]"><Link href={`/accommodation/${item.accommodation_id}`} aria-label={`مشاهده ${item.title}`}><div className="stay-image absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.055]" style={{backgroundImage:`url("${image}")`}}/></Link><button aria-label={favorite?"حذف از علاقه‌مندی‌ها":"افزودن به علاقه‌مندی‌ها"} onClick={onFavorite} className={`absolute left-4 top-4 grid size-10 place-items-center rounded-full border border-white/70 backdrop-blur transition ${favorite?"bg-[#fff4f0] text-[#b84c3e]":"bg-white/90 text-[#45564d] hover:bg-white hover:text-[#b84c3e]"}`}><Heart size={17} fill={favorite?"currentColor":"none"}/></button>{item.discount>0&&<span className="absolute right-4 top-4 rounded-full bg-[#e8c995] px-3 py-1.5 text-[11px] font-black text-[#173e35]">{item.discount}% تخفیف</span>}<span className="absolute bottom-4 right-4 rounded-full bg-[#173e35]/85 px-3 py-1.5 text-[11px] text-white backdrop-blur">{typeLabels[item.type]||item.type}</span></div><Link href={`/accommodation/${item.accommodation_id}`} className="block p-5"><div className="mb-3 flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-[#7e877f]"><MapPin size={13}/>{city}{countryName?`, ${countryName}`:""}</span><span className="flex shrink-0 items-center gap-1 text-xs text-[#a17b43]"><Star size={13} fill="currentColor"/>{item.average_rating?item.average_rating.toFixed(1):"تازه"}</span></div><h3 className="truncate text-[17px] font-black text-[#164e43]">{item.title}</h3><p className="mt-2 line-clamp-1 text-xs text-[#899089]">{item.address}</p><div className="mt-5 flex items-center justify-between border-t border-[#f0efeb] pt-4"><span className="flex items-center gap-1.5 text-xs text-[#7e877f]"><Users size={14}/> ظرفیت {item.capacity} نفر</span><span className="flex items-center gap-1.5 text-xs font-bold text-[#164e43]">مشاهده و رزرو <ArrowUpLeft size={15}/></span></div></Link></Card>;
}
