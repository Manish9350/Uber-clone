const express = require("express");
const cookieParser = require("cookie-parser");

const db = require("./db/db");
const userRoutes = require("./routes/user.routes");

db();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/users", userRoutes);

module.exports = app;
