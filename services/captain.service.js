const captainModel = require('../models/captain.model');

const createCaptain = async ({
    email, firstname, lastname, password, color, plate, capacity, vehicleType
}) => {
    if(!email || !firstname || !lastname || !password || !color || !plate || !capacity || !vehicleType) {
        throw new Error('All fields are required');
    }

    const existingCaptain = await captainModel.findOne({ email });
    if(existingCaptain) {
        throw new Error('Captain with this email already exists');
    }

    const newCaptain = new captainModel({
        email,
        fullname: { firstname, lastname },
        password,
        vehicle: { color, plate, capacity, vehicleType }
    });

    await newCaptain.save();
    return newCaptain;
};

module.exports = { createCaptain };