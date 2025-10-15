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
