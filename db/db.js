const mongoose = require("mongoose");

const uri = process.env.URI;

const db = () => {
  mongoose
    .connect(uri)
    .then(() => {
      console.log("mongoose connected...");
    })
    .catch((err) => {
      console.log("Database connection error", err);
    });
};
module.exports = db;
