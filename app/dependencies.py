from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from .database import get_db, settings
from .models import Admin

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/admin/login")

def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Admin:
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired admin token", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        subject = payload.get("sub")
        if not subject:
            raise unauthorized
    except JWTError:
        raise unauthorized
    admin = db.query(Admin).filter(Admin.email == subject).first()
    if not admin:
        raise unauthorized
    return admin
