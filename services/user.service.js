const userModel = require("../models/User");

const createUser = async ({ firstname, lastname, email, password }) => {
  if (!email || !firstname || !password) {
    throw new Error("All fields are required!");
  }
  const user = await userModel.create({
    fullname: {
      firstname,
      lastname,
    },
    email,
    password,
  });
  return user;
};

module.exports = { createUser };
