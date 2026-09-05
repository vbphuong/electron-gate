from typing import Annotated, Optional
from sqlalchemy.orm import Session 
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import jwt, JWTError
from dotenv import load_dotenv
from supabase import create_client, Client
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
import os 
from api.database import SessionLocal

load_dotenv()

SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
ALGORITHM = os.getenv("AUTH_ALGORITHM")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def create_supabase_client() -> Client:
    client = create_client(
        supabase_key=SUPABASE_SERVICE_ROLE_KEY,
        supabase_url=SUPABASE_URL
    )
    return client

supabase_dependency = Annotated[Client, Depends(create_supabase_client)]

def get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0
    )

llm_dependency = Annotated[ChatOpenAI, Depends(get_llm)]

def get_embedding() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(model="text-embedding-3-small")

embedding_dependency = Annotated[OpenAIEmbeddings, Depends(get_embedding)]
 
def get_db():
    db = SessionLocal()
    try:
        yield db 
    finally: 
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_bearer = OAuth2PasswordBearer(tokenUrl="/auth/token")

async def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("id")
        role: str = payload.get("role")
        if username is None or user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user")
        return {'username': username, 'id': user_id, 'role': role}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user")

user_dependency = Annotated[dict, Depends(get_current_user)]

oauth2_bearer_optional = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)

async def get_optional_user(token: Annotated[Optional[str], Depends(oauth2_bearer_optional)] = None) -> Optional[dict]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("id")
        role: str = payload.get("role")
        if username is None or user_id is None:
            return None
        return {'username': username, 'id': user_id, 'role': role}
    except JWTError:
        return None

optional_user_dependency = Annotated[Optional[dict], Depends(get_optional_user)]


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def require_admin_or_staff(
    current_user: dict = Depends(get_current_user),
) -> dict:
    if current_user.get("role") not in ("Admin", "Staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Staff access required",
        )
    return current_user