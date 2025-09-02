
const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const db = require('../database');

const router = express.Router();
const apiRouter = express.Router();

// --- CONFIGURATION ---
const LINKEDIN_CLIENT_ID = '78jbo1yvmlx7oi';
const LINKEDIN_CLIENT_SECRET = 'WPL_AP1.HGH1QkXop1S1h7Jq.Z0Sk6Q==';
const BASE_URL = 'https://seu-app-github-dev.app.github.dev';
const REDIRECT_URI = `${BASE_URL}/auth/linkedin/callback`;
const SCOPES = 'openid profile email';

const LINKEDIN_API = {
  AUTH_URL: 'https://www.linkedin.com/oauth/v2/authorization',
  TOKEN_URL: 'https://www.linkedin.com/oauth/v2/accessToken',
  USERINFO_URL: 'https://api.linkedin.com/v2/userinfo',
  JWKS_URI: 'https://www.linkedin.com/oauth/openid/jwks'
};

const jwks = jwksClient({
  jwksUri: LINKEDIN_API.JWKS_URI,
  cache: true,
  rateLimit: true
});

// --- HELPERS ---
function getKey(header, callback) {
  jwks.getSigningKey(header.kid, function(err, key) {
    if (err) return callback(err);
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// --- AUTH ROUTES ---
router.get('/login', (req, res) => {
  const state = Math.random().toString(36).substring(2, 15);
  req.session.linkedin_oauth_state = state;
  const authUrl = LINKEDIN_API.AUTH_URL + '?' + querystring.stringify({
    response_type: 'code',
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state: state
  });
  res.redirect(authUrl);
});

router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  if (error) {
    return res.status(400).send(`Error from LinkedIn: ${error_description}`);
  }
  if (state !== req.session.linkedin_oauth_state) {
    return res.status(400).send('State mismatch. CSRF attack suspected.');
  }

  try {
    const tokenRes = await axios.post(LINKEDIN_API.TOKEN_URL, querystring.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    
    const { access_token, id_token, expires_in } = tokenRes.data;
    req.session.linkedin_token = { access_token, id_token, expires_at: Date.now() + expires_in * 1000 };

    const userinfoRes = await axios.get(LINKEDIN_API.USERINFO_URL, {
        headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const userinfo = userinfoRes.data;

    // Save/update user in DB
    const { sub, name, given_name, family_name, picture, email, email_verified, locale } = userinfo;
    db.run(`
        INSERT INTO linkedin_users (linkedin_sub, name, given_name, family_name, picture, email, email_verified, locale, access_token, id_token, token_expires_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(linkedin_sub) DO UPDATE SET
            name=excluded.name, picture=excluded.picture, email=excluded.email, access_token=excluded.access_token, id_token=excluded.id_token, token_expires_at=excluded.token_expires_at, updated_at=CURRENT_TIMESTAMP
    `, [sub, name, given_name, family_name, picture, email, email_verified, locale, access_token, id_token, req.session.linkedin_token.expires_at]);

    res.redirect('/');
  } catch (err) {
    console.error('Error during LinkedIn callback:', err.response?.data || err.message);
    res.status(500).send('Failed to authenticate with LinkedIn.');
  }
});

// --- API ROUTES ---
const requireAuth = (req, res, next) => {
    if (!req.session.linkedin_token) {
        return res.status(401).json({ error: 'Not authenticated with LinkedIn' });
    }
    next();
};

apiRouter.get('/userinfo', requireAuth, async (req, res) => {
    try {
        const { access_token } = req.session.linkedin_token;
        const userinfoRes = await axios.get(LINKEDIN_API.USERINFO_URL, {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });
        res.json({ data: userinfoRes.data });
    } catch (err) {
        console.error('Failed to fetch LinkedIn user info:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

module.exports = { router, apiRouter };