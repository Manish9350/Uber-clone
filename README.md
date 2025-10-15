# Users - Register Endpoint

This document describes the POST `/register` endpoint used to create a new user in the application. It lists the expected request shape, validation rules, example requests/responses, and important notes about the underlying model.

## Endpoint

- Method: POST
- Path: `/register` (as defined in `routes/user.routes.js`)
- Content-Type: `application/json`

> Note: The full route path depends on how this router is mounted in your main server (for example `/api/users/register` or `/register`). The code in `routes/user.routes.js` defines the relative path `/register`.

## Request body (JSON)

The endpoint expects a JSON body with the following structure:

```json
{
  "fullname": {
    "firstname": "string", // required, min length 3
    "lastname": "string" // optional, min length 3 when provided
  },
  "email": "user@example.com", // required, must be a valid email
  "password": "secret123" // required, min length 6
}
```

Example minimal payload:

```json
{
  "fullname": { "firstname": "John" },
  "email": "john@example.com",
  "password": "hunter2"
}
```

## Validation rules

Validation is implemented with `express-validator` inside `routes/user.routes.js`. The enforced rules are:

- `email` must be a valid email (`isEmail`).
- `fullname.firstname` must exist and be at least 3 characters long.
- `password` must be at least 6 characters long.

If validation fails, the endpoint should return an HTTP 400 response with details about which fields failed validation (the exact error shape depends on the controller implementation).

## Model-level constraints and behavior

See `models/User.js` for the Mongoose schema. Important constraints and behaviors:

- `fullname.firstname` and `fullname.lastname` are strings.
- `email` is required and unique in the database. Minimum length constraint is 5 characters (enforced at the schema level).
- `password` is required and stored hashed (password field is declared with `select: false` so it won't be returned by default).
- There are helper methods on the schema:
  - `comparePassword(password)` — compares a plain password to the hashed password.
  - `generateAuthToken()` — signs a JWT using `process.env.JWT_SECRET` (expires in 7 days by default).
  - `hashPassword(password)` — static method to hash a password (bcrypt with salt 10).

The `services/user.service.js` creates a user by calling `userModel.create(...)` with the `fullname`, `email`, and `password` fields. Ensure that any controller code hashes the password before saving, or uses the model's hash helper if appropriate.

## Example curl

Replace the host/port and base path as needed for your server.

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": { "firstname": "Alice", "lastname": "Cooper" },
    "email": "alice@example.com",
    "password": "mypassword"
  }'
```

## Possible responses

- 201 Created — user created successfully (body depends on controller; typically the created user without the password and/or an auth token).
- 400 Bad Request — validation errors (missing/invalid email, firstname < 3 chars, password < 6 chars, etc.).
- 409 Conflict — trying to register with an email that already exists (if controller checks for uniqueness and returns 409).
- 500 Internal Server Error — unexpected errors (DB issues, etc.).

## Notes and tips

- Ensure `process.env.JWT_SECRET` is set if your controller generates tokens.
- The `password` field in the schema uses `select: false`, so queries that need the password for comparison must include `.select('+password')`.
- Consider centralizing password hashing in a Mongoose pre-save hook or in the service layer to avoid saving plain passwords.
- If you change validation rules in `routes/user.routes.js`, update this README to keep documentation in sync.

## Files of interest

- `routes/user.routes.js` — defines the route and express-validator rules.
- `controller/user.controller.js` — controller that receives the request (open this file to see exact response shapes and status codes).
- `services/user.service.js` — user creation business logic.
- `models/User.js` — Mongoose schema and helper methods.

---

If you'd like, I can also add a short example test (supertest) that verifies the register validation and happy path. Tell me if you want that created under a `test/` folder.

## Login - POST /login

This section documents the login endpoint defined in `routes/user.routes.js`.

- Method: POST
- Path: `/login` (see `routes/user.routes.js`)
- Content-Type: `application/json`

### Request body (JSON)

The endpoint expects a JSON body with the following shape:

```json
{
  "email": "user@example.com", // required, must be a valid email
  "password": "secret123" // required, min length 6
}
```

Example:

```json
{
  "email": "john@example.com",
  "password": "hunter2"
}
```

### Validation rules

Validation is implemented with `express-validator` in `routes/user.routes.js`:

- `email` must be a valid email (`isEmail`).
- `password` must be at least 6 characters long.

If validation fails, the endpoint should return HTTP 400 with validation details.

### Typical behavior and model notes

- The controller should look up the user by email and use `.select('+password')` when fetching to compare the provided password with the hashed password stored in the DB (because `password` is declared with `select: false` in the schema).
- Password comparison should use the model's `comparePassword` method (which uses bcrypt).
- On successful authentication the controller commonly returns a JWT (generated by `generateAuthToken`) and/or the user data (without the password).

### Example curl

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "hunter2"
  }'
```

### Possible responses

- 200 OK — login successful (body typically includes an auth token and user info without password).
- 400 Bad Request — validation errors.
- 401 Unauthorized — invalid credentials (email not found or password mismatch).
- 500 Internal Server Error — unexpected errors.

### Security notes

- Ensure `process.env.JWT_SECRET` is set and kept secret.
- Avoid returning the hashed password in responses. Use Mongoose projections or `toJSON` transforms to remove sensitive fields.
- Consider rate-limiting login attempts and adding account lockout or captcha for too many failed logins.

## GET /users/profile

Protected endpoint that returns the authenticated user's profile. The route is defined in `routes/user.routes.js` and uses the `authUser` middleware.

Behavior:

- The `authUser` middleware reads the token from the `token` cookie (`req.cookies.token`) or the `Authorization` header (`Bearer <token>`).
- It checks whether the token is blacklisted (see `models/blacklistToken.model.js`) and verifies the token using `JWT_SECRET`.
- If the token is valid and the user exists, the middleware attaches the user document to `req.user` and the controller returns the user profile.

Example request (cookie):

```bash
curl -X GET http://localhost:3000/users/profile \
  -H "Cookie: token=<your-token-here>"
```

Example request (bearer token):

```bash
curl -X GET http://localhost:3000/users/profile \
  -H "Authorization: Bearer <your-token-here>"
```

Responses:

- 200 OK — `{ user }` (user object without password).
- 401 Unauthorized — missing, invalid, or blacklisted token.
- 404 Not Found — user referenced by token not found in DB.

## GET /users/logout

Logs the user out by clearing the auth cookie and blacklisting the token on the server.

Behavior:

- The route expects the user to be authenticated (uses `authUser`). The controller reads the token from the cookie or `Authorization` header.
- It clears the `token` cookie with `res.clearCookie('token')` and records the token in the `BlacklistToken` collection so it cannot be used again. Blacklisted tokens are set to expire automatically after 1 day (see schema `expires: "1d"`).

Example request (cookie):

```bash
curl -X GET http://localhost:3000/users/logout \
  -H "Cookie: token=<your-token-here>"
```

Responses:

- 200 OK — `{ message: "Logged out successfully" }` on successful logout.
- 401 Unauthorized — missing or invalid token.
- 500 Internal Server Error — if blacklisting fails or other server errors occur.

Security notes:

- Clearing the cookie on logout prevents the browser from automatically sending the token, but server-side blacklisting ensures tokens can't be reused if stolen.
- Keep `JWT_SECRET` safe and consider shorter token lifetimes if security requirements demand it.

## Captains - Auth endpoints

The Captains router exposes login, profile and logout endpoints under the `/captains` mount point. The controller and routes follow the same patterns as user authentication but use the captain model and a separate JWT secret key (`JWT_SECRET_KEY`) when creating tokens.

### POST /captains/login

Authenticate a captain and receive a JWT. Validation is defined in `routes/captain.routes.js` (email & password checks).

Request body:

```json
{
  "email": "captain@example.com",
  "password": "secret123"
}
```

Behavior:

- The controller fetches the captain with `.select('+password')` and compares the provided password using `captain.comparePassword`.
- On success, the controller generates a JWT via `captain.generateAuthToken()` (signed with `JWT_SECRET_KEY`) and sets an httpOnly cookie named `token`.
- Response contains `{ captain, token }` (note: current controllers return the full captain document — consider removing the password field before responding).

Example curl:

```bash
curl -X POST http://localhost:3000/captains/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ravi@example.com","password":"driverpass"}'
```

Responses:

- 200 OK — login successful (cookie set, body `{ captain, token }`).
- 400 Bad Request — validation errors or invalid credentials.
- 500 Internal Server Error — unexpected errors.

### GET /captains/profile

Protected endpoint that returns the authenticated captain's profile. The route uses an `authCaptain` middleware that:

- reads the token from the `token` cookie or the `Authorization` header (`Bearer <token>`),
- checks the token against the `BlacklistToken` collection, and
- verifies the token and loads the captain document into `req.captain`.

Example request (cookie):

```bash
curl -X GET http://localhost:3000/captains/profile \
  -H "Cookie: token=<your-token-here>"
```

Responses:

- 200 OK — `{ captain }` (captain object without the password if the controller removes it).
- 401 Unauthorized — missing/invalid/blacklisted token.
- 404 Not Found — captain referenced by token not found.

### GET /captains/logout

Logs the captain out by blacklisting the token and clearing the cookie.

Behavior:

- The controller reads the token from the cookie or `Authorization` header and stores it in the `BlacklistToken` collection (so it cannot be used again).
- The cookie `token` is cleared with `res.clearCookie('token')`.

Example request (cookie):

```bash
curl -X GET http://localhost:3000/captains/logout \
  -H "Cookie: token=<your-token-here>"
```

Responses:

- 200 OK — `{ message: "Logged out successfully" }`.
- 401 Unauthorized — missing or invalid token.
- 500 Internal Server Error — if blacklisting fails or other server errors occur.

Security notes:

- Ensure `process.env.JWT_SECRET_KEY` is set and kept secret for captain tokens.
- Keep the same recommendations as users: avoid returning password fields in API responses and consider rate-limiting authentication endpoints.

## Captains - POST /captains/register

Register a new captain (driver). The captains router is mounted at `/captains` in `app.js`, so the full path for registration is `/captains/register`.

### Method & headers

- Method: POST
- Path: `/captains/register`
- Content-Type: `application/json`

### Request body (JSON)

```json
{
  "fullname": { "firstname": "string", "lastname": "string" },
  "email": "captain@example.com",
  "password": "secret123",
  "vehicle": {
    "color": "red",
    "plate": "ABC123",
    "capacity": 4,
    "vehicleType": "car" // one of: bike, car, auto
  }
}
```

### Validation rules (from `routes/captain.routes.js`)

- `email` must be a valid email.
- `fullname.firstname` — min length 3.
- `fullname.lastname` — min length 3.
- `password` — min length 6.
- `vehicle.color` — min length 3.
- `vehicle.plate` — min length 3.
- `vehicle.capacity` — numeric.
- `vehicle.vehicleType` — must be one of `bike`, `car`, or `auto`.

If validation fails, the controller returns HTTP 400 and `{ errors: [...] }`.

### Model-level notes (`models/captain.model.js`)

- The captain schema requires `fullname`, `email`, `password`, and `vehicle` (with `color`, `plate`, `capacity`, `vehicleType`).
- `email` and `vehicle.plate` are unique.
- Passwords are hashed by the controller/service using `captainModel.hashPassword` (bcrypt with salt rounds 10).
- `generateAuthToken()` creates a JWT signed with `process.env.JWT_SECRET_KEY` and expires in 1 day.

Important: unlike the `User` model, the `Captain` schema does not set `password.select = false` — that means responses may include the hashed password unless the controller or response explicitly omits it. It's recommended to remove the password from responses before sending (e.g., use a transform, projection, or delete `captain.password` in the controller response).

### Example curl

```bash
curl -X POST http://localhost:3000/captains/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": { "firstname": "Ravi", "lastname": "Kumar" },
    "email": "ravi@example.com",
    "password": "driverpass",
    "vehicle": { "color": "blue", "plate": "DLX-1234", "capacity": 4, "vehicleType": "car" }
  }'
```

### Possible responses

- 201 Created — `{ captain, token }` on success (the current controller returns the full `captain` document and a JWT token).
- 400 Bad Request — validation errors or email already in use.
- 500 Internal Server Error — unexpected errors.

### Security & recommendations

- Do not return the password field in API responses. Add `select: false` to the password field in the schema or remove the field in the controller before sending the response.
- Ensure `process.env.JWT_SECRET_KEY` is set and secure.
- Consider rate-limiting the registration endpoint and validating `vehicle.plate` format if local regulations apply.
