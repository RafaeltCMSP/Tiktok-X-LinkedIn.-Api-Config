
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

// Import routes
const linkedinAuth = require('./auth/linkedin');
const twitterAuth = require('./auth/twitter');
const tiktokAuth = require('./auth/tiktok');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'a_very_secret_key_change_me',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// API Routes
app.use('/auth/linkedin', linkedinAuth.router);
app.use('/auth/twitter', twitterAuth.router);
app.use('/auth/tiktok', tiktokAuth.router);

app.use('/api/data/linkedin', linkedinAuth.apiRouter);
app.use('/api/data/twitter', twitterAuth.apiRouter);
app.use('/api/data/tiktok', tiktokAuth.apiRouter);

// Centralized Auth Status Endpoint
app.get('/api/auth/status', (req, res) => {
    res.json({
        linkedIn: !!req.session.linkedin_token,
        twitter: !!req.session.twitter_token,
        tikTok: !!req.session.tiktok_token,
    });
});

// Centralized Logout
app.get('/auth/logout/:platform', (req, res) => {
    const { platform } = req.params;
    const sessionKey = `${platform}_token`;
    if (req.session[sessionKey]) {
        req.session[sessionKey] = null;
        // Optionally, you can add token revocation logic here if the API supports it
        console.log(`Logged out from ${platform}`);
    }
    // For simplicity, we just clear the session token and redirect/send success
    // In a real app, you might also call the platform's revoke endpoint
    res.status(200).json({ message: `Successfully logged out from ${platform}.` });
});


// Serve static files from the React app
// In a real deployment, you would build the React app and serve the 'dist' or 'build' folder
// For this environment, we serve the public files directly.
app.use(express.static(path.join(__dirname)));

// The "catchall" handler: for any request that doesn't match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 Social Hub Backend Server');
  console.log('='.repeat(60));
  console.log(`📍 Server running on: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
  console.log('Ensure your .env file is configured with the correct BASE_URL and API credentials.');
  console.log('='.repeat(60));
});
