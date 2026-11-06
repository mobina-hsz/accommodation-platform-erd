from datetime import date, datetime, time
from sqlalchemy import (Boolean, CheckConstraint, Date, DateTime, Float, ForeignKey,
                        Integer, Numeric, String, Text, Time, UniqueConstraint, func)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class Guest(Base):
    __tablename__ = "guests"
    guest_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    birth_date: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(30), unique=True)
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="guest")
    ratings: Mapped[list["Rating"]] = relationship(back_populates="guest")


class Admin(Base):
    __tablename__ = "admins"
    admin_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    accommodations: Mapped[list["Accommodation"]] = relationship(back_populates="admin")


class Country(Base):
    __tablename__ = "countries"
    country_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    cities: Mapped[list["City"]] = relationship(back_populates="country")


class City(Base):
    __tablename__ = "cities"
    city_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    country_id: Mapped[int] = mapped_column(ForeignKey("countries.country_id", ondelete="RESTRICT"))
    name: Mapped[str] = mapped_column(String(120), index=True)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    country: Mapped[Country] = relationship(back_populates="cities")
    accommodations: Mapped[list["Accommodation"]] = relationship(back_populates="city")
    __table_args__ = (UniqueConstraint("country_id", "name", name="uq_city_country_name"),)


class Accommodation(Base):
    __tablename__ = "accommodations"
    accommodation_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.city_id", ondelete="RESTRICT"))
    admin_id: Mapped[int] = mapped_column(ForeignKey("admins.admin_id", ondelete="RESTRICT"))
    title: Mapped[str] = mapped_column(String(180), index=True)
    address: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(60))
    capacity: Mapped[int] = mapped_column(Integer)
    area: Mapped[float | None] = mapped_column(Float)
    floor_unit: Mapped[str | None] = mapped_column(String(80))
    build_year: Mapped[int | None] = mapped_column(Integer)
    check_in_time: Mapped[time | None] = mapped_column(Time)
    check_out_time: Mapped[time | None] = mapped_column(Time)
    discount: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    city: Mapped[City] = relationship(back_populates="accommodations")
    admin: Mapped[Admin] = relationship(back_populates="accommodations")
    images: Mapped[list["AccommodationImage"]] = relationship(back_populates="accommodation", cascade="all, delete-orphan")
    rules: Mapped[list["CustomRule"]] = relationship(back_populates="accommodation", cascade="all, delete-orphan")
    daily_prices: Mapped[list["DailyPrice"]] = relationship(back_populates="accommodation", cascade="all, delete-orphan")
    amenity_links: Mapped[list["AccommodationAmenity"]] = relationship(back_populates="accommodation", cascade="all, delete-orphan")
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="accommodation")
    ratings: Mapped[list["Rating"]] = relationship(back_populates="accommodation", cascade="all, delete-orphan")


class Amenity(Base):
    __tablename__ = "amenities"
    amenity_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    category: Mapped[str | None] = mapped_column(String(80))
    accommodation_links: Mapped[list["AccommodationAmenity"]] = relationship(back_populates="amenity")


class AccommodationAmenity(Base):
    __tablename__ = "accommodation_amenities"
    accommodation_id: Mapped[int] = mapped_column(ForeignKey("accommodations.accommodation_id", ondelete="CASCADE"), primary_key=True)
    amenity_id: Mapped[int] = mapped_column(ForeignKey("amenities.amenity_id", ondelete="CASCADE"), primary_key=True)
    accommodation: Mapped[Accommodation] = relationship(back_populates="amenity_links")
    amenity: Mapped[Amenity] = relationship(back_populates="accommodation_links")


class AccommodationImage(Base):
    __tablename__ = "accommodation_images"
    accommodation_id: Mapped[int] = mapped_column(ForeignKey("accommodations.accommodation_id", ondelete="CASCADE"), primary_key=True)
    image_no: Mapped[int] = mapped_column(Integer, primary_key=True)
    image_url: Mapped[str] = mapped_column(Text)
    caption: Mapped[str | None] = mapped_column(String(200))
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    accommodation: Mapped[Accommodation] = relationship(back_populates="images")


class CustomRule(Base):
    __tablename__ = "custom_rules"
    custom_rule_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    accommodation_id: Mapped[int] = mapped_column(ForeignKey("accommodations.accommodation_id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    accommodation: Mapped[Accommodation] = relationship(back_populates="rules")


class DailyPrice(Base):
    __tablename__ = "daily_prices"
    accommodation_id: Mapped[int] = mapped_column(ForeignKey("accommodations.accommodation_id", ondelete="CASCADE"), primary_key=True)
    price_date: Mapped[date] = mapped_column(Date, primary_key=True)
    price: Mapped[float] = mapped_column(Numeric(12, 2))
    availability_status: Mapped[str] = mapped_column(String(20), default="available")
    accommodation: Mapped[Accommodation] = relationship(back_populates="daily_prices")
    __table_args__ = (CheckConstraint("price >= 0"), CheckConstraint("availability_status IN ('available','blocked')"))


class Reservation(Base):
    __tablename__ = "reservations"
    reservation_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.guest_id", ondelete="RESTRICT"), index=True)
    accommodation_id: Mapped[int] = mapped_column(ForeignKey("accommodations.accommodation_id", ondelete="RESTRICT"), index=True)
    check_in_date: Mapped[date] = mapped_column(Date)
    check_out_date: Mapped[date] = mapped_column(Date)
    guest_count: Mapped[int] = mapped_column(Integer)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    guest: Mapped[Guest] = relationship(back_populates="reservations")
    accommodation: Mapped[Accommodation] = relationship(back_populates="reservations")
    payments: Mapped[list["Payment"]] = relationship(back_populates="reservation", cascade="all, delete-orphan")
    __table_args__ = (CheckConstraint("check_out_date > check_in_date"), CheckConstraint("guest_count > 0"),
                      CheckConstraint("status IN ('pending','confirmed','cancelled','completed')"))


class Payment(Base):
    __tablename__ = "payments"
    payment_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reservation_id: Mapped[int] = mapped_column(ForeignKey("reservations.reservation_id", ondelete="CASCADE"), index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    method: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    tracking_code: Mapped[str | None] = mapped_column(String(100), unique=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime)
    reservation: Mapped[Reservation] = relationship(back_populates="payments")
    __table_args__ = (CheckConstraint("amount >= 0"), CheckConstraint("status IN ('pending','successful','failed','refunded')"))


class Rating(Base):
    __tablename__ = "ratings"
    rating_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.guest_id", ondelete="CASCADE"), index=True)
    accommodation_id: Mapped[int] = mapped_column(ForeignKey("accommodations.accommodation_id", ondelete="CASCADE"), index=True)
    score: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    guest: Mapped[Guest] = relationship(back_populates="ratings")
    accommodation: Mapped[Accommodation] = relationship(back_populates="ratings")
    __table_args__ = (UniqueConstraint("guest_id", "accommodation_id", name="uq_rating_guest_accommodation"), CheckConstraint("score BETWEEN 1 AND 5"))


class Favorite(Base):
    __tablename__ = "favorites"
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.guest_id", ondelete="CASCADE"), primary_key=True)
    accommodation_id: Mapped[int] = mapped_column(ForeignKey("accommodations.accommodation_id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
