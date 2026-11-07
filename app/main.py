from contextlib import asynccontextmanager
from datetime import date, datetime
from decimal import Decimal
from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from .database import Base, SessionLocal, engine, get_db, settings
from . import models as m, schemas as s
from .dependencies import get_current_admin
from .security import create_access_token, hash_password, verify_password


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(m.Admin).filter_by(email=settings.admin_email).first():
            db.add(m.Admin(full_name="System Administrator", email=settings.admin_email,
                           password_hash=hash_password(settings.admin_password)))
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(title="Accommodation Booking API", description="Backend API based on the accommodation platform ERD. No host role; accommodations are managed by the admin.", version="1.0.0", lifespan=lifespan)
api = "/api"

def commit_or_409(db: Session, message: str = "A record with these unique values already exists"):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail=message)

def accommodation_out(db: Session, a: m.Accommodation):
    avg = db.query(func.avg(m.Rating.score)).filter(m.Rating.accommodation_id == a.accommodation_id).scalar()
    return {"accommodation_id": a.accommodation_id, "city_id": a.city_id, "admin_id": a.admin_id,
            "title": a.title, "address": a.address, "type": a.type, "capacity": a.capacity,
            "area": a.area, "floor_unit": a.floor_unit, "build_year": a.build_year,
            "check_in_time": a.check_in_time, "check_out_time": a.check_out_time,
            "discount": a.discount, "average_rating": float(avg) if avg is not None else None,
            "images": [{"image_no": i.image_no, "image_url": i.image_url, "caption": i.caption, "display_order": i.display_order} for i in a.images],
            "rules": [{"custom_rule_id": r.custom_rule_id, "title": r.title, "description": r.description} for r in a.rules],
            "amenities": [{"amenity_id": x.amenity.amenity_id, "name": x.amenity.name, "category": x.amenity.category} for x in a.amenity_links]}

@app.get("/", tags=["System"])
def root():
    return {"message": "Accommodation Booking API", "docs": "/docs", "health": "/health"}

@app.get("/health", tags=["System"])
def health(db: Session = Depends(get_db)):
    db.execute(func.now().select())
    return {"status": "ok", "database": "connected"}

@app.post(api + "/auth/admin/login", response_model=s.Token, tags=["Authentication"])
def admin_login(data: s.AdminLogin, db: Session = Depends(get_db)):
    admin = db.query(m.Admin).filter(m.Admin.email == data.email).first()
    if not admin or not verify_password(data.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    return {"access_token": create_access_token(admin.email), "token_type": "bearer"}

@app.post(api + "/auth/admin/token", response_model=s.Token, tags=["Authentication"])
def admin_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 form endpoint used by Swagger's Authorize dialog."""
    admin = db.query(m.Admin).filter(m.Admin.email == form_data.username).first()
    if not admin or not verify_password(form_data.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    return {"access_token": create_access_token(admin.email), "token_type": "bearer"}

@app.post(api + "/guests", response_model=s.GuestOut, status_code=201, tags=["Guests"])
def create_guest(data: s.GuestCreate, db: Session = Depends(get_db)):
    guest = m.Guest(**data.model_dump())
    db.add(guest); commit_or_409(db, "Email or phone already registered"); db.refresh(guest)
    return guest

@app.get(api + "/guests/{guest_id}", response_model=s.GuestOut, tags=["Guests"])
def get_guest(guest_id: int, db: Session = Depends(get_db)):
    guest = db.get(m.Guest, guest_id)
    if not guest: raise HTTPException(404, "Guest not found")
    return guest

@app.get(api + "/countries", response_model=list[s.CountryOut], tags=["Locations"])
def list_countries(db: Session = Depends(get_db)):
    return db.query(m.Country).order_by(m.Country.name).all()

@app.post(api + "/countries", response_model=s.CountryOut, status_code=201, tags=["Locations"], dependencies=[Depends(get_current_admin)])
def create_country(data: s.CountryCreate, db: Session = Depends(get_db)):
    obj=m.Country(**data.model_dump()); db.add(obj); commit_or_409(db); db.refresh(obj); return obj

@app.get(api + "/cities", response_model=list[s.CityOut], tags=["Locations"])
def list_cities(country_id: int | None = None, db: Session = Depends(get_db)):
    q=db.query(m.City)
    if country_id: q=q.filter(m.City.country_id==country_id)
    return q.order_by(m.City.name).all()

@app.post(api + "/cities", response_model=s.CityOut, status_code=201, tags=["Locations"], dependencies=[Depends(get_current_admin)])
def create_city(data: s.CityCreate, db: Session = Depends(get_db)):
    if not db.get(m.Country,data.country_id): raise HTTPException(404,"Country not found")
    obj=m.City(**data.model_dump()); db.add(obj); commit_or_409(db); db.refresh(obj); return obj

@app.get(api + "/amenities", response_model=list[s.AmenityOut], tags=["Amenities"])
def list_amenities(db: Session = Depends(get_db)):
    return db.query(m.Amenity).order_by(m.Amenity.name).all()

@app.post(api + "/amenities", response_model=s.AmenityOut, status_code=201, tags=["Amenities"], dependencies=[Depends(get_current_admin)])
def create_amenity(data: s.AmenityCreate, db: Session = Depends(get_db)):
    obj=m.Amenity(**data.model_dump()); db.add(obj); commit_or_409(db); db.refresh(obj); return obj

@app.get(api + "/accommodations", response_model=list[s.AccommodationOut], tags=["Accommodations"])
def list_accommodations(city_id: int | None = None, accommodation_type: str | None = None,
                        min_capacity: int | None = Query(default=None, ge=1),
                        check_in: date | None = None, check_out: date | None = None,
                        db: Session = Depends(get_db)):
    q=db.query(m.Accommodation).options(joinedload(m.Accommodation.images), joinedload(m.Accommodation.rules), joinedload(m.Accommodation.amenity_links).joinedload(m.AccommodationAmenity.amenity))
    if city_id: q=q.filter(m.Accommodation.city_id==city_id)
    if accommodation_type: q=q.filter(m.Accommodation.type==accommodation_type)
    if min_capacity: q=q.filter(m.Accommodation.capacity>=min_capacity)
    items=q.order_by(m.Accommodation.accommodation_id.desc()).all()
    if check_in and check_out:
        if check_out <= check_in: raise HTTPException(422,"check_out must be after check_in")
        busy=db.query(m.Reservation.accommodation_id).filter(m.Reservation.status.in_(["pending","confirmed"]), m.Reservation.check_in_date < check_out, m.Reservation.check_out_date > check_in).subquery()
        blocked=db.query(m.DailyPrice.accommodation_id).filter(m.DailyPrice.price_date>=check_in, m.DailyPrice.price_date<check_out, m.DailyPrice.availability_status=="blocked").subquery()
        busy_ids={x[0] for x in db.query(busy.c.accommodation_id).all()} | {x[0] for x in db.query(blocked.c.accommodation_id).all()}
        items=[a for a in items if a.accommodation_id not in busy_ids]
    return [accommodation_out(db,a) for a in items]

@app.get(api + "/accommodations/{accommodation_id}", response_model=s.AccommodationOut, tags=["Accommodations"])
def get_accommodation(accommodation_id: int, db: Session = Depends(get_db)):
    a=db.query(m.Accommodation).options(joinedload(m.Accommodation.images),joinedload(m.Accommodation.rules),joinedload(m.Accommodation.amenity_links).joinedload(m.AccommodationAmenity.amenity)).filter_by(accommodation_id=accommodation_id).first()
    if not a: raise HTTPException(404,"Accommodation not found")
    return accommodation_out(db,a)

@app.post(api + "/accommodations", response_model=s.AccommodationOut, status_code=201, tags=["Accommodations"])
def create_accommodation(data: s.AccommodationCreate, db: Session = Depends(get_db), admin: m.Admin = Depends(get_current_admin)):
    payload=data.model_dump(exclude={"amenity_ids","images","rules"})
    if not db.get(m.City,payload["city_id"]): raise HTTPException(404,"City not found")
    for aid in data.amenity_ids:
        if not db.get(m.Amenity,aid): raise HTTPException(404,f"Amenity {aid} not found")
    a=m.Accommodation(**payload,admin_id=admin.admin_id); db.add(a); db.flush()
    for aid in data.amenity_ids: db.add(m.AccommodationAmenity(accommodation_id=a.accommodation_id,amenity_id=aid))
    for n,img in enumerate(data.images,1): db.add(m.AccommodationImage(accommodation_id=a.accommodation_id,image_no=n,**img.model_dump()))
    for rule in data.rules: db.add(m.CustomRule(accommodation_id=a.accommodation_id,**rule.model_dump()))
    commit_or_409(db); db.refresh(a)
    return accommodation_out(db,a)

@app.put(api + "/accommodations/{accommodation_id}", response_model=s.AccommodationOut, tags=["Accommodations"])
def update_accommodation(accommodation_id: int, data: s.AccommodationCreate, db: Session = Depends(get_db), _: m.Admin = Depends(get_current_admin)):
    a=db.get(m.Accommodation,accommodation_id)
    if not a: raise HTTPException(404,"Accommodation not found")
    payload=data.model_dump(exclude={"amenity_ids","images","rules"})
    if not db.get(m.City,payload["city_id"]): raise HTTPException(404,"City not found")
    for key,value in payload.items(): setattr(a,key,value)
    a.amenity_links.clear(); a.images.clear(); a.rules.clear(); db.flush()
    for aid in data.amenity_ids:
        if not db.get(m.Amenity,aid): raise HTTPException(404,f"Amenity {aid} not found")
        a.amenity_links.append(m.AccommodationAmenity(amenity_id=aid))
    for n,img in enumerate(data.images,1): a.images.append(m.AccommodationImage(image_no=n,**img.model_dump()))
    for rule in data.rules: a.rules.append(m.CustomRule(**rule.model_dump()))
    commit_or_409(db); db.refresh(a); return accommodation_out(db,a)

@app.delete(api + "/accommodations/{accommodation_id}", status_code=204, tags=["Accommodations"])
def delete_accommodation(accommodation_id: int, db: Session = Depends(get_db), _: m.Admin = Depends(get_current_admin)):
    a=db.get(m.Accommodation,accommodation_id)
    if not a: raise HTTPException(404,"Accommodation not found")
    db.delete(a); commit_or_409(db); return Response(status_code=204)

@app.put(api + "/accommodations/{accommodation_id}/prices", tags=["Pricing"])
def upsert_daily_price(accommodation_id: int, data: s.PriceCreate, db: Session = Depends(get_db), _: m.Admin = Depends(get_current_admin)):
    if data.availability_status not in ("available","blocked"): raise HTTPException(422,"availability_status must be available or blocked")
    if not db.get(m.Accommodation,accommodation_id): raise HTTPException(404,"Accommodation not found")
    obj=db.get(m.DailyPrice,(accommodation_id,data.price_date))
    if obj: obj.price=data.price; obj.availability_status=data.availability_status
    else: obj=m.DailyPrice(accommodation_id=accommodation_id,**data.model_dump()); db.add(obj)
    commit_or_409(db); return {"accommodation_id":accommodation_id,**data.model_dump()}

@app.get(api + "/accommodations/{accommodation_id}/prices", tags=["Pricing"])
def list_daily_prices(accommodation_id: int, start: date, end: date, db: Session = Depends(get_db)):
    if end < start: raise HTTPException(422,"end must be on or after start")
    return db.query(m.DailyPrice).filter(m.DailyPrice.accommodation_id==accommodation_id,m.DailyPrice.price_date>=start,m.DailyPrice.price_date<=end).order_by(m.DailyPrice.price_date).all()

@app.post(api + "/reservations", response_model=s.ReservationOut, status_code=201, tags=["Reservations"])
def create_reservation(data: s.ReservationCreate, db: Session = Depends(get_db)):
    if data.check_out_date<=data.check_in_date: raise HTTPException(422,"check_out_date must be after check_in_date")
    guest=db.get(m.Guest,data.guest_id); a=db.get(m.Accommodation,data.accommodation_id)
    if not guest: raise HTTPException(404,"Guest not found")
    if not a: raise HTTPException(404,"Accommodation not found")
    if data.guest_count>a.capacity: raise HTTPException(422,"Guest count exceeds accommodation capacity")
    overlap=db.query(m.Reservation).filter(m.Reservation.accommodation_id==a.accommodation_id,m.Reservation.status.in_(["pending","confirmed"]),m.Reservation.check_in_date<data.check_out_date,m.Reservation.check_out_date>data.check_in_date).first()
    if overlap: raise HTTPException(409,"Accommodation is already reserved for these dates")
    nights=(data.check_out_date-data.check_in_date).days
    prices=db.query(m.DailyPrice).filter(m.DailyPrice.accommodation_id==a.accommodation_id,m.DailyPrice.price_date>=data.check_in_date,m.DailyPrice.price_date<data.check_out_date).all()
    if prices and len(prices)!=nights: raise HTTPException(409,"Daily prices are incomplete for the selected dates")
    if any(p.availability_status!="available" for p in prices): raise HTTPException(409,"One or more selected dates are blocked")
    if not prices: raise HTTPException(409,"Daily prices have not been configured for the selected dates")
    total=sum((Decimal(str(p.price)) for p in prices),Decimal("0"))
    total=total*(Decimal("100")-Decimal(str(a.discount)))/Decimal("100")
    obj=m.Reservation(**data.model_dump(),total_amount=total.quantize(Decimal("0.01")),status="pending")
    db.add(obj); commit_or_409(db); db.refresh(obj); return obj

@app.get(api + "/reservations", response_model=list[s.ReservationOut], tags=["Reservations"])
def list_reservations(guest_id: int | None = None, db: Session = Depends(get_db)):
    q=db.query(m.Reservation)
    if guest_id: q=q.filter(m.Reservation.guest_id==guest_id)
    return q.order_by(m.Reservation.created_at.desc()).all()

@app.patch(api + "/reservations/{reservation_id}/cancel", response_model=s.ReservationOut, tags=["Reservations"])
def cancel_reservation(reservation_id: int, db: Session = Depends(get_db)):
    obj=db.get(m.Reservation,reservation_id)
    if not obj: raise HTTPException(404,"Reservation not found")
    if obj.status not in ("pending","confirmed"): raise HTTPException(409,"Reservation cannot be cancelled in its current state")
    obj.status="cancelled"; db.commit(); db.refresh(obj); return obj

@app.post(api + "/payments", response_model=s.PaymentOut, status_code=201, tags=["Payments"])
def create_payment(data: s.PaymentCreate, db: Session = Depends(get_db)):
    reservation=db.get(m.Reservation,data.reservation_id)
    if not reservation: raise HTTPException(404,"Reservation not found")
    if reservation.status!="pending": raise HTTPException(409,"Only pending reservations can be paid")
    obj=m.Payment(reservation_id=reservation.reservation_id,amount=reservation.total_amount,method=data.method,status="pending",tracking_code=data.tracking_code)
    db.add(obj); commit_or_409(db,"Tracking code already exists"); db.refresh(obj); return obj

@app.patch(api + "/payments/{payment_id}/simulate-result", response_model=s.PaymentOut, tags=["Payments"])
def simulate_payment_result(payment_id: int, successful: bool, db: Session = Depends(get_db)):
    obj=db.get(m.Payment,payment_id)
    if not obj: raise HTTPException(404,"Payment not found")
    if obj.status!="pending": raise HTTPException(409,"Payment has already been processed")
    obj.status="successful" if successful else "failed"
    if successful:
        obj.paid_at=datetime.utcnow(); obj.reservation.status="confirmed"
    db.commit(); db.refresh(obj); return obj

@app.post(api + "/ratings", response_model=s.RatingOut, status_code=201, tags=["Ratings"])
def create_rating(data: s.RatingCreate, db: Session = Depends(get_db)):
    if not db.get(m.Guest,data.guest_id): raise HTTPException(404,"Guest not found")
    if not db.get(m.Accommodation,data.accommodation_id): raise HTTPException(404,"Accommodation not found")
    obj=m.Rating(**data.model_dump()); db.add(obj); commit_or_409(db,"A guest can rate an accommodation only once"); db.refresh(obj); return obj

@app.get(api + "/accommodations/{accommodation_id}/ratings", response_model=list[s.RatingOut], tags=["Ratings"])
def list_ratings(accommodation_id: int, db: Session = Depends(get_db)):
    return db.query(m.Rating).filter_by(accommodation_id=accommodation_id).order_by(m.Rating.created_at.desc()).all()

@app.post(api + "/guests/{guest_id}/favorites/{accommodation_id}", status_code=201, tags=["Favorites"])
def add_favorite(guest_id: int, accommodation_id: int, db: Session = Depends(get_db)):
    if not db.get(m.Guest,guest_id): raise HTTPException(404,"Guest not found")
    if not db.get(m.Accommodation,accommodation_id): raise HTTPException(404,"Accommodation not found")
    if db.get(m.Favorite,(guest_id,accommodation_id)): raise HTTPException(409,"Already in favorites")
    db.add(m.Favorite(guest_id=guest_id,accommodation_id=accommodation_id)); db.commit(); return {"message":"Added to favorites"}

@app.get(api + "/guests/{guest_id}/favorites", tags=["Favorites"])
def list_favorites(guest_id: int, db: Session = Depends(get_db)):
    return db.query(m.Favorite).filter_by(guest_id=guest_id).all()

@app.delete(api + "/guests/{guest_id}/favorites/{accommodation_id}", status_code=204, tags=["Favorites"])
def remove_favorite(guest_id: int, accommodation_id: int, db: Session = Depends(get_db)):
    obj=db.get(m.Favorite,(guest_id,accommodation_id))
    if not obj: raise HTTPException(404,"Favorite not found")
    db.delete(obj); db.commit(); return Response(status_code=204)
