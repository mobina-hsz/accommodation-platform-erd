from datetime import date, datetime, time
from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class GuestCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    birth_date: date | None = None
    gender: str | None = None
    email: EmailStr
    phone: str = Field(min_length=5, max_length=30)

class GuestOut(ORMModel):
    guest_id: int
    first_name: str
    last_name: str
    birth_date: date | None
    gender: str | None
    email: EmailStr
    phone: str

class CountryCreate(BaseModel):
    name: str
    latitude: float | None = None
    longitude: float | None = None
class CountryOut(ORMModel):
    country_id: int
    name: str
    latitude: float | None
    longitude: float | None
class CityCreate(BaseModel):
    country_id: int
    name: str
    latitude: float | None = None
    longitude: float | None = None
class CityOut(ORMModel):
    city_id: int
    country_id: int
    name: str
    latitude: float | None
    longitude: float | None

class AmenityCreate(BaseModel):
    name: str
    category: str | None = None
class AmenityOut(ORMModel):
    amenity_id: int
    name: str
    category: str | None
class ImageCreate(BaseModel):
    image_url: str
    caption: str | None = None
    display_order: int = 0
class RuleCreate(BaseModel):
    title: str
    description: str
class PriceCreate(BaseModel):
    price_date: date
    price: float = Field(ge=0)
    availability_status: str = "available"
class AccommodationCreate(BaseModel):
    city_id: int
    title: str
    address: str
    type: str
    capacity: int = Field(gt=0)
    area: float | None = Field(default=None, gt=0)
    floor_unit: str | None = None
    build_year: int | None = None
    check_in_time: time | None = None
    check_out_time: time | None = None
    discount: float = Field(default=0, ge=0, le=100)
    amenity_ids: list[int] = []
    images: list[ImageCreate] = []
    rules: list[RuleCreate] = []
class AccommodationOut(BaseModel):
    accommodation_id: int
    city_id: int
    admin_id: int
    title: str
    address: str
    type: str
    capacity: int
    area: float | None
    floor_unit: str | None
    build_year: int | None
    check_in_time: time | None
    check_out_time: time | None
    discount: float
    average_rating: float | None = None
    images: list[dict] = []
    rules: list[dict] = []
    amenities: list[dict] = []
class ReservationCreate(BaseModel):
    guest_id: int
    accommodation_id: int
    check_in_date: date
    check_out_date: date
    guest_count: int = Field(gt=0)
class ReservationOut(ORMModel):
    reservation_id: int
    guest_id: int
    accommodation_id: int
    check_in_date: date
    check_out_date: date
    guest_count: int
    total_amount: float
    status: str
    created_at: datetime
class PaymentCreate(BaseModel):
    reservation_id: int
    method: str
    tracking_code: str | None = None
class PaymentOut(ORMModel):
    payment_id: int
    reservation_id: int
    amount: float
    method: str
    status: str
    tracking_code: str | None
    paid_at: datetime | None
class RatingCreate(BaseModel):
    guest_id: int
    accommodation_id: int
    score: int = Field(ge=1, le=5)
    comment: str | None = None
class RatingOut(ORMModel):
    rating_id: int
    guest_id: int
    accommodation_id: int
    score: int
    comment: str | None
    created_at: datetime
