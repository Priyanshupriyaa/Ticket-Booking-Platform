const express = require("express");
const router = express.Router();
const Ticket = require("./schema"); // Import the Ticket schema
const cors = require("cors");
const redisClient = require("./redisClient");

// Middleware setup
router.use(express.json()); // Parse incoming JSON data
router.use(cors()); // Enable Cross-Origin Resource Sharing (CORS)

// Endpoint for creating a new booking and adding it to the database.
router.post("/booking", async (req, res) => {
  const { movie, slot, seats } = req.body;

  try {
    // Create a new Ticket instance using the provided data
    const myData = new Ticket({ movie, slot, seats });

    // Save the Ticket instance to the database
    const saved = await myData.save();

    // Update Redis cache with the new booking data
    await redisClient.set('lastBooking', JSON.stringify(myData));

    // Respond with success message and the saved data
    res.status(200).json({ data: myData, message: "Booking successful!" });
  } catch (error) {
    // Handle errors and respond with an error message
    res.status(500).json({
      data: null,
      message: "Something went wrong! Please try again.",
    });
  }
});

// Endpoint for getting the last booking details from the database and sending it to the frontend.
router.get("/booking", async (req, res) => {
  try {
    // Check Redis cache for last booking data
    const cachedData = await redisClient.get('lastBooking');

    if (cachedData) {
      // Return cached data if available
      res.status(200).json({ data: JSON.parse(cachedData), message: "Data from cache" });
    } else {
      // Retrieve the last booking by sorting in descending order and limiting to 1 result
      const myData = await Ticket.find().sort({ _id: -1 }).limit(1);

      if (myData.length === 0) {
        // No booking found, respond with appropriate message
        res.status(200).json({ data: null, message: "No previous booking found!" });
      } else {
        // Cache the retrieved data in Redis
        await redisClient.set('lastBooking', JSON.stringify(myData[0]));

        // Respond with the last booking details
        res.status(200).json({ data: myData[0] });
      }
    }
  } catch (error) {
    // Handle errors and respond with an error message
    res.status(500).json({
      data: null,
      message: "Something went wrong! Please try again.",
    });
  }
});

module.exports = router;
