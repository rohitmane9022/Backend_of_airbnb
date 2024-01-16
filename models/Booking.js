const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  place: { type: mongoose.Schema.Types.ObjectId, requied: true, ref: "Place" },
  user: { type: mongoose.Schema.Types.ObjectId, requied: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  name: { type: String, required: true },
  Phone: { type: String, required: true },
  price: Number,
  numberOfGuests: Number,
});

const Booking = mongoose.model("Booking", BookingSchema);

module.exports = Booking;
