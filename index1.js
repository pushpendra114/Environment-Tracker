import express from 'express';
import path from 'path';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import { connectToDatabase, executeQuery } from './db.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import session from 'express-session';

dotenv.config({ path: './secrete.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;
const publicDir = path.join(__dirname);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

// Configure session middleware
app.use(session({
  secret: 'your-secret-key', // Replace with a strong secret key
  resave: false, // Prevents resaving session if unmodified
  saveUninitialized: false, // Do not save uninitialized sessions
  cookie: { 
    secure: false, // Set to true if using HTTPS
    httpOnly: true, // Prevents client-side access to the cookie
    maxAge: 24 * 60 * 60 * 1000 // 1 day expiration
  }
}));

const userDetails = {
  email: null,
  name: null,
  role: null,
  password: null,
  storedOtp: null,
};


app.post('/email-verify', async (req, res) => {
  const { email } = req.body;
  try {
    const db = await connectToDatabase();
    const existingUser = await executeQuery(db, `SELECT email FROM Register WHERE email = ?`, [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.json({ message: "Email is available" });
  } catch (error) {
    console.error("Email check failed:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Send OTP
app.post('/send-otp', async (req, res) => {
  const { email, name, role, password } = req.body;
  userDetails.email = email;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log("Generated OTP:", otp);
  userDetails.storedOtp = otp;

  const hashedPassword = await bcrypt.hash(password, 10);
  userDetails.name = name;
  userDetails.role = role;
  userDetails.password = hashedPassword;
  console.log("User details:", userDetails);
  const transporter = nodemailer.createTransport({
    service: "gmail",
    port: 587,
    secure: true,
    auth: {
      user: 'ssb2fauji@gmail.com',
      pass: 'frts pvdo foxg czcx',
    },
  });

  const mailOptions = {
    from: 'ssb2fauji@gmail.com',
    to: email,
    subject: "Environment Tracker OTP Verification",
    html: `<p>Hello ${role} ${name},<br>Your OTP code is: <strong>${otp}</strong><br>Role: ${role}<br>LOVE FROM ENVIRONMENT TRACKER TEAM ❤️</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Failed to send OTP:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});


// Verify OTP and register user
app.post('/verify-otp', async (req, res) => {
  
  const { otp } = req.body;
  try {
    
    if (otp === userDetails.storedOtp) {
      console.log('Otp verified');
      const { role, email, name, password } = userDetails;
    
      const db = await connectToDatabase();
      await executeQuery(db, `INSERT INTO Register (role, name, email, password) VALUES (?, ?, ?, ?)`, [role, name, email, password]);

      res.json({ message: "OTP verified and user registered" });
    } else {
      res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Registration failed" });
  }
});


// Login
app.post('/login-request', async (req, res) => {
  const { email, password } = req.body;
  try {
    const db = await connectToDatabase();
    const results = await executeQuery(db, `SELECT password FROM Register WHERE email = ?`, [email]);
    if (results.length > 0) {
      const match = await bcrypt.compare(password, results[0].password);
      if (match) {
        req.session.user = { email }; // Store user email in session
        console.log("Session set:", req.session.user); // Debugging log
        return res.json({ message: "Correct" });
      }
    }
    res.status(400).json({ message: "Incorrect" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Example: Access session data
app.get('/dashboard', (req, res) => {
  if (req.session && req.session.user) { // Ensure session exists
    console.log("Session data:", req.session.user); // Debugging log
    const userEmail = req.session.user.email;
    const userName = userEmail.split('@')[0];
    const userInitial = userName.charAt(0).toUpperCase();
    res.json({ 
      loggedIn: true, 
      message: `Welcome, ${userEmail}`, 
      userInitial 
    });
  } else {
    console.error("Unauthorized access attempt to /dashboard"); // Log unauthorized access
    res.status(401).json({ loggedIn: false, message: "Unauthorized. Please log in first." });
  }
});



app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Logout failed');
    }
    res.clearCookie('connect.sid'); // Remove session cookie
    res.json({ message: "Logged out successfully" });
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

