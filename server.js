const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Path to our "database"
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

// Helper to read/write bookings
function readBookings() {
    if (!fs.existsSync(BOOKINGS_FILE)) return [];
    const data = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
    return JSON.parse(data);
}

function writeBookings(bookings) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

// ----- API ROUTES -----

// 1. Get all bookings (for the dashboard)
app.get('/api/bookings', (req, res) => {
    const bookings = readBookings();
    res.json(bookings);
});

// 2. Create a new booking
app.post('/api/bookings', (req, res) => {
    const { name, phone, address, date, time, service, duration, notes } = req.body;

    // Basic validation
    if (!name || !phone || !date || !time || !service) {
        return res.status(400).json({ error: 'Missing required fields (name, phone, date, time, service).' });
    }

    const bookings = readBookings();

    // Check for double-booking (simple: same date & time)
    const conflict = bookings.find(b => b.date === date && b.time === time);
    if (conflict) {
        return res.status(409).json({ error: 'This time slot is already booked. Please choose another.' });
    }

    const newBooking = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
        name,
        phone,
        address: address || 'Not specified',
        date,
        time,
        service,
        duration: duration || '1 day',
        notes: notes || '',
        createdAt: new Date().toISOString(),
        status: 'pending', // pending | confirmed | completed
    };

    bookings.push(newBooking);
    writeBookings(bookings);

    // (Optional) Simulate email notification - in production, use Nodemailer or a webhook.
    console.log(`📩 NEW BOOKING: ${name} - ${service} on ${date} at ${time}`);

    res.status(201).json({ message: 'Booking created!', booking: newBooking });
});

// 3. (Optional) Update status – for you to mark as "confirmed" later
app.put('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const bookings = readBookings();
    const index = bookings.findIndex(b => b.id === id);
    if (index === -1) return res.status(404).json({ error: 'Booking not found' });
    bookings[index].status = status;
    writeBookings(bookings);
    res.json({ message: 'Status updated', booking: bookings[index] });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`❄️ ChillBox server running at http://localhost:${PORT}`);
    console.log(`📦 Bookings saved to ${BOOKINGS_FILE}`);
});