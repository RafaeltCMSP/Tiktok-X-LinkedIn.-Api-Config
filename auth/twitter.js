
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const db = require('../database');

const router = express.Router();
const apiRouter = express.Router();

// --- CONFIGURATION ---
const TWITTER_CLIENT_ID = 'T3VlYWFXWmhMVkY1N0FNSzctbVQ6MTpjaQ';
const TWITTER_CLIENT_SECRET = 'aVshIh5nym9i9J-0rbNAt93OFmvDbgmKDhJQi5gZfYi4noE-XQ';
const BASE_URL = 'https://seu-app-github-dev.app.github.dev';
const REDIRECT_URI = `${BASE_URL}/auth/twitter/callback`;
const SCOPE = ['tweet.read', 'users.read', 'offline.access'].join(' ');

const TWITTER_API = {
  AUTH_URL: 'https://twitter.com/i/oauth2/authorize',
  TOKEN_URL: 'https://api.twitter.com/2/oauth2/token',
  ME_URL: 'https://api.twitter.com/2/users/me',
  USER_TWEETS_URL: (id) => `https://api.twitter.com/2/users/${id}/tweets`,
};

// --- HELPERS ---
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

async function twitterApiRequest(url, accessToken, params = {}) {
  const res = await axios.get(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
    params
  });
  return res.data;
}

// --- AUTH ROUTES ---
router.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const { codeVerifier, codeChallenge } = generatePKCE();
  req.session.twitter_state = state;
  req.session.twitter_code_verifier = codeVerifier;

  const authUrl = new URL(TWITTER_API.AUTH_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', TWITTER_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', SCOPE);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  res.redirect(authUrl.toString());
});

router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (state !== req.session.twitter_state) {
    return res.status(400).send('State mismatch. CSRF attack suspected.');
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);
    params.append('client_id', TWITTER_CLIENT_ID);
    params.append('code_verifier', req.session.twitter_code_verifier);

    const authHeader = `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')}`;
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': authHeader
    };
    
    const tokenRes = await axios.post(TWITTER_API.TOKEN_URL, params, { headers });
    const { access_token, refresh_token, expires_in, scope } = tokenRes.data;
    const expires_at = Date.now() + expires_in * 1000;
    
    req.session.twitter_token = { access_token, refresh_token, expires_at, scope };

    const meData = await twitterApiRequest(TWITTER_API.ME_URL, access_token, {
      'user.fields': 'created_at,description,profile_image_url,public_metrics,verified'
    });
    const user = meData.data;

    const metrics = user.public_metrics || {};
    db.run(`
      INSERT INTO twitter_users (user_id, username, name, description, avatar_url, followers_count, following_count, tweet_count, access_token, refresh_token, token_expires_at, scope, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        username=excluded.username, name=excluded.name, description=excluded.description, avatar_url=excluded.avatar_url, followers_count=excluded.followers_count, following_count=excluded.following_count, tweet_count=excluded.tweet_count, access_token=excluded.access_token, refresh_token=excluded.refresh_token, token_expires_at=excluded.token_expires_at, scope=excluded.scope, updated_at=CURRENT_TIMESTAMP
    `, [user.id, user.username, user.name, user.description, user.profile_image_url, metrics.followers_count, metrics.following_count, metrics.tweet_count, access_token, refresh_token, expires_at, scope]);

    req.session.twitter_user_id = user.id;
    res.redirect('/');
  } catch (err) {
    console.error('Error during Twitter callback:', err.response?.data || err.message);
    res.status(500).send('Failed to authenticate with Twitter.');
  }
});


// --- API ROUTES ---
const requireAuth = (req, res, next) => {
    if (!req.session.twitter_token) {
        return res.status(401).json({ error: 'Not authenticated with Twitter' });
    }
    // We should add refresh token logic here in a real app
    next();
};

apiRouter.get('/userinfo', requireAuth, async (req, res) => {
    try {
        const { access_token } = req.session.twitter_token;
        const meData = await twitterApiRequest(TWITTER_API.ME_URL, access_token, {
            'user.fields': 'created_at,description,profile_image_url,public_metrics,verified'
        });
        // Map to frontend user type
        const user = meData.data;
        const metrics = user.public_metrics || {};
        const frontendUser = {
            user_id: user.id,
            username: user.username,
            name: user.name,
            description: user.description,
            avatar_url: user.profile_image_url,
            followers_count: metrics.followers_count,
            following_count: metrics.following_count,
            tweet_count: metrics.tweet_count,
        };
        res.json({ data: frontendUser });
    } catch (err) {
        console.error('Failed to fetch Twitter user info:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

apiRouter.get('/tweets', requireAuth, async (req, res) => {
    try {
        const { access_token } = req.session.twitter_token;
        const userId = req.session.twitter_user_id;
        const tweetsData = await twitterApiRequest(TWITTER_API.USER_TWEETS_URL(userId), access_token, {
            'tweet.fields': 'created_at,public_metrics'
        });
        res.json(tweetsData);
    } catch (err) {
        console.error('Failed to fetch tweets:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to fetch tweets' });
    }
});

module.exports = { router, apiRouter };