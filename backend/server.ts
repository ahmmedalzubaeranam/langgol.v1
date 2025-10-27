const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const cryptoModule = require('crypto');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

import { Request, Response } from 'express';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(bodyParser.json());

const uri = process.env.MONGO_URI;
if (!uri) {
    console.error("MONGO_URI not found in .env file");
    process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect to MongoDB and set up collections
let usersCollection;
let historyCollection;

async function connectToDatabase() {
    try {
        await client.connect();
        const db = client.db("langgol");
        usersCollection = db.collection('users');
        historyCollection = db.collection('history');
        console.log("Successfully connected to MongoDB!");

        // Initialize Admin User
        const adminUser = await usersCollection.findOne({ email: 'admin@langgol.app' });
        if (!adminUser) {
            const hashedPassword = await bcrypt.hash('adminpassword', 10);
            await usersCollection.insertOne({
                email: 'admin@langgol.app',
                password: hashedPassword,
                name: 'Admin User',
                phone: '01234567890',
                address: 'Admin HQ',
                securityQuestion: 'What is the secret word?',
                securityAnswer: 'admin',
                isVerified: true,
                isAdmin: true,
            });
            console.log("Admin user created");
        }
    } catch (error) {
        console.error("Failed to connect to MongoDB", error);
        process.exit(1);
    }
}

connectToDatabase();

// Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- Routes ---

// Signup
app.post('/signup', async (req: Request, res: Response) => {
    const { email, password, name, phone, address, securityQuestion, securityAnswer } = req.body;
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = cryptoModule.randomBytes(3).toString('hex').toUpperCase(); // 6-character code

    const newUser = {
        email,
        password: hashedPassword,
        name,
        phone,
        address,
        securityQuestion,
        securityAnswer,
        isVerified: false,
        isAdmin: false,
        verificationCode,
    };
    await usersCollection.insertOne(newUser);

    // Send verification email
    const mailOptions = {
        from: `"Langgol" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify your Langgol account',
        text: `Your verification code is: ${verificationCode}`,
        html: `<b>Your verification code is: ${verificationCode}</b>`
    };

    transporter.sendMail(mailOptions, (error: any, info: any) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ error: 'Failed to send verification email' });
        }
        console.log('Message sent: %s', info.messageId);
        res.status(201).json({ success: true, message: 'User created. Please check your email for the verification code.' });
    });
});

// Verify Account
app.post('/verify', async (req: Request, res: Response) => {
    const { email, code } = req.body;
    const user = await usersCollection.findOne({ email });
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (user.verificationCode === code) {
        await usersCollection.updateOne({ email }, { $set: { isVerified: true }, $unset: { verificationCode: "" } });
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, error: 'Invalid verification code' });
    }
});

// Login
app.post('/login', async (req: Request, res: Response) => {
    const { email, pass } = req.body;
    const user = await usersCollection.findOne({ email });
    if (!user) {
        return res.status(401).json({ success: false, reason: 'credentials' });
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
        return res.status(401).json({ success: false, reason: 'credentials' });
    }
    if (!user.isVerified) {
        return res.status(401).json({ success: false, reason: 'unverified' });
    }
    const { password, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
});

// Request Password Reset
app.post('/request-password-reset', async (req: Request, res: Response) => {
    const { email } = req.body;
    const user = await usersCollection.findOne({ email });
    if (user) {
        res.json({ question: user.securityQuestion });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Complete Password Reset
app.post('/complete-password-reset', async (req: Request, res: Response) => {
    const { email, answer, newPass } = req.body;
    const user = await usersCollection.findOne({ email });
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (user.securityAnswer.toLowerCase() === answer.toLowerCase()) {
        const hashedPassword = await bcrypt.hash(newPass, 10);
        await usersCollection.updateOne({ email }, { $set: { password: hashedPassword } });
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, error: 'Incorrect answer' });
    }
});

app.put('/users/:email', async (req: Request, res: Response) => {
    const { email } = req.params;
    const { name, phone, address } = req.body;
    const result = await usersCollection.updateOne({ email }, { $set: { name, phone, address } });
    if (result.modifiedCount === 0) {
        return res.status(404).json({ error: 'User not found or data is the same' });
    }
    const updatedUser = await usersCollection.findOne({ email });
    res.json({ success: true, user: updatedUser });
});

// Get All Users (Admin only)
app.get('/users', async (req: Request, res: Response) => {
    const users = await usersCollection.find({ isAdmin: false }).toArray();
    res.json(users);
});

app.post('/history', async (req: Request, res: Response) => {
    const { email, history } = req.body;
    await historyCollection.updateOne({ email }, { $set: { history } }, { upsert: true });
    res.json({ success: true });
});

app.get('/history/:email', async (req: Request, res: Response) => {
    const { email } = req.params;
    const result = await historyCollection.findOne({ email });
    if (result) {
        res.json(result.history);
    } else {
        res.json(null);
    }
});

if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}

module.exports = app;