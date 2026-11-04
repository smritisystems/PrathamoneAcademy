# User Management Developer Manual

**Backend Files**: `backend/app/api/v1/endpoints/users.py`, `backend/app/models/user.py`, `backend/app/core/security.py`  
**Frontend Files**: `frontend/src/pages/Users.tsx`, `frontend/src/api/endpoints.ts`  

---

## 1. Endpoints

- `GET /api/v1/users/me`: Returns profile of authenticated user.
- `GET /api/v1/users/`: Returns list of all user accounts.
- `POST /api/v1/users/`: Creates new user account with hashed password.
- `PUT /api/v1/users/{id}`: Updates user profile or role.
- `DELETE /api/v1/users/{id}`: Soft deactivates or removes user account.

---

## 2. Password Hashing
Password hashing is implemented using `passlib.context.CryptContext` with bcrypt:
```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

