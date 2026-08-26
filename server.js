const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const cors = require('cors');

const app = express();

// Set up dynamic environment variables for Render hosting
// .replace(/\/$/, '') prevents double-slash routing issues if trailing slashes are present in environment variables
const PORT = process.env.PORT || 3000;
const SERVER_URL = (process.env.SERVER_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME').replace(/\/$/, '');
const STEAM_API_KEY = process.env.STEAM_API_KEY || 'YOUR_STEAM_API_KEY_HERE';

// Enable CORS for your GitHub Pages frontend
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

// Express session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'crimenet_safehouse_secret_key',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize()); //
app.use(passport.session()); //

passport.serializeUser((user, done) => done(null, user)); //
passport.deserializeUser((obj, done) => done(null, obj)); //

// Configure Passport with Steam Strategy
passport.use(new SteamStrategy({
    returnURL: `${SERVER_URL}/auth/steam/return`, //
    realm: `${SERVER_URL}/`, //
    apiKey: STEAM_API_KEY //
  },
  (identifier, profile, done) => {
    return done(null, profile); //
  }
));

// Route 1: Trigger Steam OpenID login
app.get('/auth/steam', passport.authenticate('steam')); //

// Route 2: Steam redirects back here after authentication
app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }), //
  (req, res) => {
    const steamId = req.user.id; //
    const username = req.user.displayName; //
    const avatar = req.user._json.avatarfull; //

    // Redirect user back to your GitHub Pages frontend with user info
    res.redirect(`${FRONTEND_URL}/index.html?steamid=${steamId}&username=${encodeURIComponent(username)}&avatar=${encodeURIComponent(avatar)}`); //
  }
);

// Route 3: Auth status check
app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) { //
        res.json({ authenticated: true, user: req.user }); //
    } else {
        res.json({ authenticated: false }); //
    }
});

app.listen(PORT, () => console.log(`Crimenet Auth Server running on port ${PORT}`)); //