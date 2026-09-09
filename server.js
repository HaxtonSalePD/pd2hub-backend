const express = require('express');
const cors = require('cors');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;

const app = express();
const PORT = process.env.PORT || 3000;

// Set your live URLs
const DOMAIN = process.env.DOMAIN || 'https://pd2hub-backend.onrender.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://your-frontend-domain.com'; // Update with your actual frontend URL (e.g., GitHub Pages or Vercel link)

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for frontend communication
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST']
}));

// Initialize Passport
app.use(passport.initialize());

// Configure Steam OpenID Strategy
passport.use(new SteamStrategy({
    returnURL: `${DOMAIN}/auth/steam/return`,
    realm: `${DOMAIN}/`,
    apiKey: process.env.STEAM_API_KEY || 'YOUR_STEAM_API_KEY_HERE'
  },
  (identifier, profile, done) => {
    // Return profile upon successful authentication
    return done(null, profile);
  }
));

// --- ROUTES ---

// Healthcheck Route
app.get('/', (req, res) => {
    res.send('PD2Hub Backend is running.');
});

// Initiates Steam Authentication
app.get('/auth/steam', passport.authenticate('steam', { failureRedirect: '/' }));

// Steam Authentication Return Callback
app.get('/auth/steam/return',
    passport.authenticate('steam', { failureRedirect: '/', session: false }),
    (req, res) => {
        const steamId = req.user.id;
        const username = req.user.displayName;
        const avatar = req.user.photos?.[2]?.value || req.user.photos?.[0]?.value || '';

        // Redirect back to your frontend giveaway page with query params
        const redirectUrl = `${FRONTEND_URL}/giveaway.html?steamid=${encodeURIComponent(steamId)}&username=${encodeURIComponent(username)}&avatar=${encodeURIComponent(avatar)}`;
        res.redirect(redirectUrl);
    }
);

// In-Memory Storage for Giveaway Entries (Replace with MongoDB/PostgreSQL for production persistence)
const giveawayEntries = [];

// Handle Giveaway Submissions
app.post('/api/giveaway/enter', (req, res) => {
    const { steamId, username, tradeLink } = req.body;

    if (!steamId || !username || !tradeLink) {
        return res.status(400).json({ error: 'Steam login and Trade URL are required.' });
    }

    // Validate Steam Trade Link URL format
    const tradeLinkRegex = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[\w-]+$/;
    if (!tradeLinkRegex.test(tradeLink)) {
        return res.status(400).json({ error: 'Invalid Steam Trade URL format.' });
    }

    // Check for duplicate entries
    const existingEntry = giveawayEntries.find(entry => entry.steamId === steamId);
    if (existingEntry) {
        return res.status(400).json({ error: 'You have already entered this giveaway!' });
    }

    // Save entry
    const entry = { steamId, username, tradeLink, enteredAt: new Date() };
    giveawayEntries.push(entry);

    res.status(200).json({ 
        message: 'Giveaway entry received successfully! Good luck.',
        totalEntries: giveawayEntries.length 
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});