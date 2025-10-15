const express = require("express");

const db = require("./db/db");
const userRoutes = require("./routes/user.routes");

db();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", () => {
  res.send("hello world");
});

app.use("/users", userRoutes);

module.exports = app;
