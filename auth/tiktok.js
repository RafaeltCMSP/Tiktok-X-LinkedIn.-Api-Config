
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const db = require('../database');

const router = express.Router();
const apiRouter = express.Router();

// --- CONFIGURATION ---
const { TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, BASE_URL } = process.env;
const REDIRECT_URI = `${BASE_URL}/auth/tiktok/callback`;
const SCOPE = 'user.info.basic,video.list';

const TIKTOK_API = {
    AUTH_URL: 'https://www.tiktok.com/v2/auth/authorize/',
    TOKEN_URL: 'https://open.tiktokapis.com/v2/oauth/token/',
    USER_INFO_URL: 'https://open.tiktokapis.com/v2/user/info/',
    VIDEO_LIST_URL: 'https://open.tiktokapis.com/v2/video/list/'
};

// --- HELPERS ---
function generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
}

// --- AUTH ROUTES ---
router.get('/login', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    const { codeVerifier, codeChallenge } = generatePKCE();
    req.session.tiktok_state = state;
    req.session.tiktok_code_verifier = codeVerifier;
    
    const authUrl = new URL(TIKTOK_API.AUTH_URL);
    authUrl.searchParams.set('client_key', TIKTOK_CLIENT_KEY);
    authUrl.searchParams.set('scope', SCOPE);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    res.redirect(authUrl.toString());
});

router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;
    if (error) return res.status(400).send(`Error from TikTok: ${error}`);
    if (state !== req.session.tiktok_state) return res.status(400).send('State mismatch');

    try {
        const tokenRes = await axios.post(TIKTOK_API.TOKEN_URL, new URLSearchParams({
            client_key: TIKTOK_CLIENT_KEY,
            client_secret: TIKTOK_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
            code_verifier: req.session.tiktok_code_verifier
        }));

        const { access_token, refresh_token, expires_in, scope, open_id } = tokenRes.data;
        const expires_at = Date.now() + expires_in * 1000;
        req.session.tiktok_token = { access_token, refresh_token, expires_at, scope, open_id };

        // Fetch user info to store in DB
        const userInfoRes = await axios.get(`${TIKTOK_API.USER_INFO_URL}?fields=open_id,union_id,avatar_url,display_name`, {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });
        const { user } = userInfoRes.data.data;

        db.run(`
            INSERT INTO tiktok_users (open_id, union_id, display_name, avatar_url, access_token, refresh_token, token_expires_at, scope, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(open_id) DO UPDATE SET
            union_id=excluded.union_id, display_name=excluded.display_name, avatar_url=excluded.avatar_url, access_token=excluded.access_token, refresh_token=excluded.refresh_token, token_expires_at=excluded.token_expires_at, scope=excluded.scope, updated_at=CURRENT_TIMESTAMP
        `, [user.open_id, user.union_id, user.display_name, user.avatar_url, access_token, refresh_token, expires_at, scope]);
        
        res.redirect('/');
    } catch (err) {
        console.error('Error during TikTok callback:', err.response?.data || err.message);
        res.status(500).send('Failed to authenticate with TikTok.');
    }
});


// --- API ROUTES ---
const requireAuth = (req, res, next) => {
    if (!req.session.tiktok_token) {
        return res.status(401).json({ error: 'Not authenticated with TikTok' });
    }
    // Refresh token logic should be added here for a production app
    next();
};

apiRouter.get('/userinfo', requireAuth, async (req, res) => {
    try {
        const { access_token } = req.session.tiktok_token;
        const userInfoRes = await axios.get(`${TIKTOK_API.USER_INFO_URL}?fields=open_id,union_id,avatar_url,display_name`, {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });
        res.json(userInfoRes.data);
    } catch (err) {
        console.error('Failed to fetch TikTok user info:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

apiRouter.get('/videos', requireAuth, async (req, res) => {
    try {
        const { access_token } = req.session.tiktok_token;
        const videoListRes = await axios.post(TIKTOK_API.VIDEO_LIST_URL, 
            { max_count: 20 },
            {
                headers: { 
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
            }
        );
        res.json(videoListRes.data);
    } catch (err) {
        console.error('Failed to fetch TikTok videos:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});


module.exports = { router, apiRouter };
