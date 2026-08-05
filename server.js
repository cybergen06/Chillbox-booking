const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// ----- MONGODB CONNECTION -----
const MONGO_URI ='mongodb+srv://nthavela202_db_user:<>@cluster0.mkgprc7.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI, { dbName: 'chillbox' })
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ----- EMAIL CONFIGURATION -----
// Replace these with your Gmail details
const EMAIL_USER = 'nthavela202@gmail.com';
const EMAIL_PASS = 'ymgjqddpiifrcdjs'; // NOT your regular Gmail password!

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

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

// 2. Create a new booking (with email notification!)
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

        // ----- SEND EMAIL NOTIFICATION -----
        const emailHtml = `
            <h2>❄️ New ChillBox Booking!</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Address:</strong> ${address}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p><strong>Service:</strong> ${service}</p>
            <p><strong>Duration:</strong> ${duration}</p>
            <p><strong>Notes:</strong> ${notes || 'None'}</p>
            <hr>
            <p>Log in to your admin dashboard to confirm this booking.</p>
        `;

        await transporter.sendMail({
            from: `"ChillBox Bookings" <${EMAIL_USER}>`,
            to: EMAIL_USER, // Send to yourself (or add multiple: 'you@gmail.com, partner@gmail.com')
            subject: `❄️ New Booking: ${name} - ${service}`,
            html: emailHtml
        });

        console.log('📧 Email notification sent!');

        res.status(201).json({ message: 'Booking created!', booking: newBooking });

    } catch (err) {
        console.error('Error:', err);
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
// 4. Delete a booking
app.delete('/api/bookings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const booking = await Booking.findOneAndDelete({ id: id });
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        res.json({ message: 'Booking deleted!', booking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.listen(PORT, () => {
    console.log(`❄️ ChillBox server running at http://localhost:${PORT}`);
    console.log(`📦 Bookings saved to MongoDB Atlas!`);
    console.log(`📧 Email notifications enabled!`);
});