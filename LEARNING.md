# BookSum — Learning Notes

## Authentication

### JWT (JSON Web Token)
A self-contained string that encodes information and a signature. Three parts separated by dots:

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiIsImV4cCI6MTcxMH0.abc123signature
│                      │                                   │
Header                 Payload                              Signature
(algorithm: HS256)     (sub: "42", exp: 1710...)           (HMAC of header+payload
                                                            using JWT_SECRET)
```

- **Header** — signing algorithm (HS256 in this project)
- **Payload** — the data (`{"sub": user_id, "exp": expiry_time}`)
- **Signature** — cryptographic hash of header+payload using a secret key

The server can verify the token hasn't been tampered with by re-computing the signature. No server-side session storage needed — the token itself proves who the user is.

### Bearer Token
"Bearer" is the authentication scheme used in the HTTP `Authorization` header. It means "whoever bears (carries) this token is authorized":

```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWI...
```

### Auth Flow in BookSum
1. User logs in → server creates a JWT with their `user_id` baked in, returns it
2. Frontend stores the token and attaches `Authorization: Bearer <jwt>` to every request
3. Server receives request → `get_current_user` extracts the JWT from the Bearer header → `decode_token` verifies the signature and checks expiry → returns the user

### Token-Based vs Session-Based Auth
- **Token-based (BookSum)** — JWT is the session. Contains the user ID and is cryptographically signed. Server is stateless — no session store needed.
- **Session-based (traditional)** — Server stores a session ID in a cookie, looks it up in a server-side store (like Redis). Requires server-side state.

### Password Storage
Passwords are never stored in plain text. BookSum uses bcrypt hashing via passlib:
- `hash_password()` — hashes on registration
- `verify_password()` — verifies on login by comparing the hash

### Auth Dependencies (FastAPI)
- `get_current_user` — extracts Bearer token, decodes JWT, looks up user. Returns 401 if not logged in. Used on protected routes (create playlist, delete playlist).
- `get_optional_user` — same but returns `None` instead of 401. Used for routes that work for both logged-in and anonymous users (viewing public playlists).

---

## Architecture

### Stateless REST API
BookSum uses a stateless REST API architecture with JWT-based authentication. The server stores no session — every request carries the JWT, so any server instance could handle any request.

### Monolithic vs Microservices

**Monolithic (what BookSum uses)** — everything runs in one process. All features (auth, books, playlists, similarity) share the same codebase, database, and runtime.

```
┌─────────────────────────────┐
│         FastAPI App         │
│  ┌─────┐ ┌─────┐ ┌───────┐ │
│  │Auth │ │Books│ │Playlst│ │ ──► SQLite
│  └─────┘ └─────┘ └───────┘ │
└─────────────────────────────┘
```

**Microservices** — each feature is a separate service with its own process, database, and deployment. They communicate over HTTP/gRPC/message queues.

```
┌──────────┐   ┌──────────┐   ┌──────────┐
│Auth Svc  │   │Books Svc │   │Playlist  │
│          │   │          │   │  Svc     │
│  ► DB1   │   │  ► DB2   │   │  ► DB3   │
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │
     └──────── API Gateway ────────┘
```

### Comparison

| | Monolithic | Microservices |
|---|---|---|
| **Simplicity** | Simple to develop, test, deploy | Complex — many moving parts |
| **Deployment** | Deploy everything at once | Deploy services independently |
| **Scaling** | Scale the whole app, even if only one part is busy | Scale individual services (e.g., scale similarity search without scaling auth) |
| **Tech flexibility** | One language/framework for everything | Each service can use different tech (Python for ML, Go for auth, etc.) |
| **Data sharing** | Easy — everything shares one DB | Hard — services own their data, need APIs to share |
| **Debugging** | One set of logs, easy to trace | Distributed tracing across services, harder to debug |
| **Team scaling** | Gets messy with many developers touching same codebase | Teams own individual services independently |
| **Failure isolation** | One bug can crash everything | One service failing doesn't take down others |
| **Latency** | Function calls (nanoseconds) | Network calls between services (milliseconds) |
| **Infrastructure** | One server, simple ops | Needs container orchestration (Kubernetes), service discovery, load balancers |

### When to Use Which

**Monolithic** is the right choice when:
- Small team (1–5 devs)
- Early-stage project where requirements are still changing
- Simple enough to fit in one developer's head

**Microservices** make sense when:
- Large teams (10+ devs) that need to work independently
- Different parts have very different scaling needs (e.g., Netflix — streaming vs recommendations vs billing)
- You need different tech stacks for different parts
- You've outgrown a monolith and have the ops maturity to handle the complexity

**Common advice**: start monolithic, split into microservices only when you have a concrete reason to. Most projects never need microservices.
