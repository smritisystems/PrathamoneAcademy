# API Standards & Conventions

**Protocol**: HTTP/1.1 & HTTP/2 over TLS  
**Payload Format**: JSON (`application/json`)  
**Prefix**: `/api/v1`  
**Authentication**: HTTP Bearer Header (`Authorization: Bearer <JWT>`)  

---

## 1. RESTful URL Hierarchy

| Action | HTTP Verb | Path Example | Response Code |
|---|:---:|---|:---:|
| **List Resource** | `GET` | `/api/v1/students/?page=1&page_size=20` | 200 OK |
| **Get Resource** | `GET` | `/api/v1/students/{id}` | 200 OK |
| **Create Resource** | `POST` | `/api/v1/students/` | 201 Created |
| **Update Resource** | `PUT` | `/api/v1/students/{id}` | 200 OK |
| **Delete Resource** | `DELETE` | `/api/v1/users/{id}` | 204 No Content |
| **Custom Action** | `POST` | `/api/v1/payments/{id}/reverse` | 200 OK |

---

## 2. Standardized Error Response Structure

All 4xx and 5xx errors return standard RFC-7807 compliant JSON:

```json
{
  "detail": "Descriptive, human-actionable error message"
}
```

For Pydantic validation errors (HTTP 422 Unprocessable Entity):
```json
{
  "detail": [
    {
      "loc": ["body", "amount"],
      "msg": "Input should be greater than 0",
      "type": "greater_than"
    }
  ]
}
```

---

## 3. Pagination Standard

Endpoints returning collections support cursor or page-based pagination:
```json
{
  "total": 125,
  "page": 1,
  "page_size": 20,
  "data": [ ... ]
}
```

Query Parameters:
- `page`: 1-based page index (default: 1)
- `page_size`: records per page (default: 20, max: 100)
- `search`: case-insensitive substring search

