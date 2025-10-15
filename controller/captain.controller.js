const captainModel = require("../models/captain.model");
const captainService = require("../services/captain.service");
const { validationResult } = require("express-validator");
const blacklistedTokenModel = require("../models/blacklistToken.model");

const registerCaptain = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, fullname, password, vehicle } = req.body;
  const existingCaptain = await captainModel.findOne({ email });
  if (existingCaptain) {
    return res.status(400).json({ message: "Email already in use" });
  }
  const hashedPassword = await captainModel.hashPassword(password);
  const captain = await captainService.createCaptain({
    email,
    firstname: fullname.firstname,
    lastname: fullname.lastname,
    password: hashedPassword,
    color: vehicle.color,
    plate: vehicle.plate,
    capacity: vehicle.capacity,
    vehicleType: vehicle.vehicleType,
  });
  const token = captain.generateAuthToken();
  res.status(201).json({ captain, token });
};

const loginCaptain = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;
  const captain = await captainModel.findOne({ email }).select("+password");
  if (!captain) {
    return res.status(400).json({ message: "Invalid email or password" });
  }
  const isPasswordValid = await captain.comparePassword(
    password,
    captain.password
  );
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid email or password" });
  }
  const token = captain.generateAuthToken();
  res.cookie("token", token, { httpOnly: true });
  res.status(200).json({ captain, token });
};

const getCaptainProfile = async (req, res, next) => {
  const captain = req.captain;
  if (!captain) {
    return res.status(404).json({ message: "Captain not found" });
  }
  res.status(200).json({ captain });
};

const logoutCaptain = async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  await blacklistedTokenModel.create({ token });
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
};

module.exports = {
  registerCaptain,
  loginCaptain,
  getCaptainProfile,
  logoutCaptain,  
};
