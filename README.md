# سامانه رزرو اقامتگاه — Backend

پیاده‌سازی بک‌اند بر اساس ERD پروژه قبلی، با **FastAPI + SQLAlchemy + SQLite**. این پروژه فرانت‌اند ندارد. در مدل کسب‌وکار نقش Host وجود ندارد و مدیریت اقامتگاه‌ها فقط با Admin است.

## امکانات

- دیتابیس واقعی SQLite با ۱۴ جدول متناظر با ERD و کلیدهای خارجی/قیود یکتا.
- احراز هویت ادمین با JWT و هش امن رمز عبور (Argon2).
- مدیریت کشور، شهر، کاتالوگ امکانات و اقامتگاه‌ها (CRUD اقامتگاه فقط برای ادمین).
- تصاویر، قوانین اختصاصی، امکانات و تقویم قیمت روزانه اقامتگاه.
- جست‌وجوی اقامتگاه با فیلتر شهر، نوع، ظرفیت و بازه تاریخ.
- ثبت رزرو با کنترل ظرفیت، تداخل تاریخ‌ها، وضعیت روزها و محاسبه مبلغ از تقویم روزانه.
- ثبت پرداخت آزمایشی، امتیاز (هر مهمان برای هر اقامتگاه یک‌بار) و علاقه‌مندی.
- مستندات تعاملی Swagger در `/docs` و OpenAPI در `/openapi.json`.

## اجرا در Windows PowerShell

```powershell
cd "C:\chat on steroid\accommodation-platform-erd"
py -3.10 -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

مقادیر `ADMIN_EMAIL` و `ADMIN_PASSWORD` و `SECRET_KEY` را در فایل `.env` تغییر دهید. دیتابیس `accommodation.db` در اولین اجرای برنامه ساخته می‌شود و ادمین اولیه نیز در صورت نبودن همان ایمیل ایجاد خواهد شد.

```powershell
uvicorn app.main:app --reload
```

سپس آدرس‌های زیر در دسترس‌اند:

- API: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- Health check: `http://127.0.0.1:8000/health`

## احراز هویت

در Swagger ابتدا `POST /api/auth/admin/login` را با ایمیل و رمز ادمین اجرا کنید. مقدار `access_token` را کپی کرده و دکمه **Authorize** را بزنید؛ توکن را به شکل `Bearer <token>` وارد کنید. مسیرهای نوشتن اطلاعات پایه و CRUD اقامتگاه به توکن ادمین نیاز دارند.

## مسیرهای اصلی API

| حوزه | متد و مسیر | توضیح |
|---|---|---|
| Auth | `POST /api/auth/admin/login` | ورود ادمین و دریافت JWT |
| Guests | `POST /api/guests`, `GET /api/guests/{id}` | ثبت و مشاهده مهمان |
| Locations | `GET/POST /api/countries`, `GET/POST /api/cities` | کشورها و شهرها؛ POST مخصوص ادمین |
| Amenities | `GET/POST /api/amenities` | کاتالوگ مشترک امکانات |
| Accommodations | `GET/POST /api/accommodations`, `GET/PUT/DELETE /api/accommodations/{id}` | جست‌وجو و مدیریت اقامتگاه |
| Pricing | `PUT /api/accommodations/{id}/prices`, `GET /api/accommodations/{id}/prices` | ثبت/به‌روزرسانی و مشاهده قیمت روزانه |
| Reservations | `POST/GET /api/reservations`, `PATCH /api/reservations/{id}/cancel` | ثبت، فهرست و لغو رزرو |
| Payments | `POST /api/payments`, `PATCH /api/payments/{id}/simulate-result` | ایجاد پرداخت و شبیه‌سازی نتیجه درگاه |
| Ratings | `POST /api/ratings`, `GET /api/accommodations/{id}/ratings` | ثبت و مشاهده امتیاز |
| Favorites | `POST/GET/DELETE /api/guests/{guest_id}/favorites...` | مدیریت علاقه‌مندی |

### سناریوی پیشنهادی تست در Swagger/Postman

1. ورود ادمین و دریافت توکن.
2. ایجاد Country و سپس City.
3. ایجاد Guest (این مسیر عمومی است).
4. ایجاد Amenity و سپس Accommodation با `amenity_ids`، `images` و `rules`.
5. ثبت قیمت روزانه برای تک‌تک شب‌های بازه اقامت.
6. ایجاد Reservation؛ مبلغ کل از مجموع قیمت شب‌ها پس از اعمال تخفیف محاسبه می‌شود.
7. ایجاد Payment و اجرای `simulate-result?successful=true` برای شبیه‌سازی پرداخت موفق.
8. ثبت Rating و Favorite و مشاهده میانگین امتیاز اقامتگاه.

فایل `postman_collection.json` برای اجرای همین سناریو به‌صورت دستی در Postman ارائه شده است.

## اجرای تست‌ها

```powershell
pytest -q
```

تست‌ها از دیتابیس SQLite موقت مستقل استفاده می‌کنند و مسیرهای احراز هویت، کنترل دسترسی، ساخت موجودیت‌ها، رزرو و جلوگیری از تداخل، پرداخت آزمایشی، یکتایی امتیاز و علاقه‌مندی را بررسی می‌کنند.

## نگاشت ERD به دیتابیس

| ERD | جدول دیتابیس |
|---|---|
| Guest, Admin, Country, City, Accommodation | `guests`, `admins`, `countries`, `cities`, `accommodations` |
| Amenity, AccommodationAmenity | `amenities`, `accommodation_amenities` |
| AccommodationImage, CustomRule, DailyPrice | `accommodation_images`, `custom_rules`, `daily_prices` |
| Reservation, Payment | `reservations`, `payments` |
| Rating, Favorite | `ratings`, `favorites` |

`AverageRating` صفت مشتق‌شده است و در پاسخ API از جدول Rating محاسبه می‌شود؛ در دیتابیس به‌عنوان مقدار تکراری ذخیره نمی‌شود. کلیدهای مرکب جدول‌های واسط، عکس، تقویم قیمت و علاقه‌مندی و قید یکتای `(guest_id, accommodation_id)` در Rating مطابق ERD اعمال شده‌اند.

## محدوده و ملاحظات

- پرداخت به درگاه بانکی واقعی متصل نیست؛ مسیر `simulate-result` فقط برای تست چرخه پرداخت است.
- مطابق ERD، Guest فیلد رمز عبور ندارد؛ در این نسخه ورود JWT فقط برای Admin پیاده‌سازی شده است.
- عملیات رزرو و ثبت امتیاز در این نسخه برای تست API بدون احراز هویت مهمان در دسترس‌اند. برای استقرار واقعی باید احراز هویت مهمان و مجوز مالکیت رزرو نیز اضافه شود.
- `create_all` برای راه‌اندازی ساده آموزشی استفاده شده است؛ برای محیط عملیاتی بهتر است مهاجرت‌های Alembic اضافه شوند.

