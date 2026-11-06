import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app

@pytest.fixture()
def client():
    engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool)
    TestingSession=sessionmaker(bind=engine,autoflush=False,autocommit=False)
    Base.metadata.create_all(engine)
    def override_db():
        db=TestingSession()
        try: yield db
        finally: db.close()
    app.dependency_overrides[get_db]=override_db
    with TestClient(app) as c:
        db=TestingSession()
        from app.models import Admin
        from app.security import hash_password
        db.add(Admin(full_name="Test Admin",email="admin@test.com",password_hash=hash_password("TestPass123!")))
        db.commit(); db.close()
        yield c
    app.dependency_overrides.clear(); Base.metadata.drop_all(engine)

def admin_headers(client):
    response=client.post("/api/auth/admin/login",json={"email":"admin@test.com","password":"TestPass123!"})
    assert response.status_code==200
    return {"Authorization":f"Bearer {response.json()['access_token']}"}

def setup_catalog(client):
    headers=admin_headers(client)
    country=client.post("/api/countries",json={"name":"Iran"},headers=headers).json()
    city=client.post("/api/cities",json={"country_id":country["country_id"],"name":"Tehran"},headers=headers).json()
    guest=client.post("/api/guests",json={"first_name":"Sara","last_name":"Ahmadi","email":"sara@example.com","phone":"09120000000"}).json()
    amenity=client.post("/api/amenities",json={"name":"Wi-Fi","category":"Connectivity"},headers=headers).json()
    return headers,city,guest,amenity

def test_admin_auth_and_protected_catalog(client):
    assert client.post("/api/countries",json={"name":"Iran"}).status_code==401
    headers=admin_headers(client)
    assert client.post("/api/countries",json={"name":"Iran"},headers=headers).status_code==201

def test_accommodation_reservation_payment_rating_and_favorite_flow(client):
    headers,city,guest,amenity=setup_catalog(client)
    acc=client.post("/api/accommodations",headers=headers,json={"city_id":city["city_id"],"title":"Garden Suite","address":"Tehran","type":"suite","capacity":3,"amenity_ids":[amenity["amenity_id"]],"images":[{"image_url":"https://example.com/room.jpg"}],"rules":[{"title":"No smoking","description":"Smoking is not allowed"}]}).json()
    assert acc["amenities"][0]["name"]=="Wi-Fi"
    for day,price in [("2026-12-01",100),("2026-12-02",120)]:
        assert client.put(f"/api/accommodations/{acc['accommodation_id']}/prices",headers=headers,json={"price_date":day,"price":price}).status_code==200
    reservation=client.post("/api/reservations",json={"guest_id":guest["guest_id"],"accommodation_id":acc["accommodation_id"],"check_in_date":"2026-12-01","check_out_date":"2026-12-03","guest_count":2})
    assert reservation.status_code==201 and reservation.json()["total_amount"]==220
    assert client.post("/api/reservations",json={"guest_id":guest["guest_id"],"accommodation_id":acc["accommodation_id"],"check_in_date":"2026-12-02","check_out_date":"2026-12-04","guest_count":2}).status_code==409
    payment=client.post("/api/payments",json={"reservation_id":reservation.json()["reservation_id"],"method":"mock"})
    assert payment.status_code==201
    result=client.patch(f"/api/payments/{payment.json()['payment_id']}/simulate-result?successful=true")
    assert result.status_code==200 and result.json()["status"]=="successful"
    rating_data={"guest_id":guest["guest_id"],"accommodation_id":acc["accommodation_id"],"score":5,"comment":"Great"}
    assert client.post("/api/ratings",json=rating_data).status_code==201
    assert client.post("/api/ratings",json=rating_data).status_code==409
    fav=client.post(f"/api/guests/{guest['guest_id']}/favorites/{acc['accommodation_id']}")
    assert fav.status_code==201
    assert client.get(f"/api/accommodations/{acc['accommodation_id']}").json()["average_rating"]==5.0

def test_guest_validation_and_health(client):
    assert client.get("/health").json()["status"]=="ok"
    assert client.post("/api/guests",json={"first_name":"A","last_name":"B","email":"not-email","phone":"123456"}).status_code==422
