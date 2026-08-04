const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// ----- MONGODB CONNECTION -----
// PASTE YOUR CONNECTION STRING HERE (replace <password> with your real password)
const MONGO_URI = 'mongodb+srv://admin:YOUR_PASSWORD_HERE@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, { dbName: 'chillbox' })
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ----- MONGODB SCHEMA & MODEL -----
const bookingSchema = new mongoose.Schema({
    id: String,
    name: String,
    phone: String,
    address: String,
    date: String,
    time: String,
    service: String,
    duration: String,
    notes: String,
    createdAt: String,
    status: { type: String, default: 'pending' }
});

const Booking = mongoose.model('Booking', bookingSchema);

// ----- API ROUTES -----

// 1. Get all bookings
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Create a new booking
app.post('/api/bookings', async (req, res) => {
    const { name, phone, address, date, time, service, duration, notes } = req.body;

    if (!name || !phone || !date || !time || !service) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        // Check for double-booking
        const conflict = await Booking.findOne({ date, time });
        if (conflict) {
            return res.status(409).json({ error: 'Time slot already booked.' });
        }

        const newBooking = new Booking({
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            name,
            phone,
            address: address || 'Not specified',
            date,
            time,
            service,
            duration: duration || '1 day',
            notes: notes || '',
            createdAt: new Date().toISOString(),
            status: 'pending'
        });

        await newBooking.save();
        console.log(`📩 NEW BOOKING: ${name} - ${service} on ${date} at ${time}`);
        res.status(201).json({ message: 'Booking created!', booking: newBooking });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Update status
app.put('/api/bookings/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const booking = await Booking.findOneAndUpdate(
            { id: id },
            { status: status },
            { new: true }
        );
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        res.json({ message: 'Status updated', booking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`❄️ ChillBox server running at http://localhost:3000`);
    console.log(`📦 Bookings saved to MongoDB Atlas!`);
});