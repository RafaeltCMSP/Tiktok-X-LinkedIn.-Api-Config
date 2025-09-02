
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_FILE = path.join(__dirname, 'social_hub.db');
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

db.serialize(() => {
    console.log('Initializing database schema...');
    
    // LinkedIn Users Table
    db.run(`CREATE TABLE IF NOT EXISTS linkedin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        linkedin_sub TEXT UNIQUE,
        name TEXT,
        given_name TEXT,
        family_name TEXT,
        picture TEXT,
        email TEXT,
        email_verified BOOLEAN,
        locale TEXT,
        access_token TEXT,
        id_token TEXT,
        token_expires_at INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Twitter Users Table
    db.run(`CREATE TABLE IF NOT EXISTS twitter_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE,
        username TEXT,
        name TEXT,
        description TEXT,
        avatar_url TEXT,
        followers_count INTEGER,
        following_count INTEGER,
        tweet_count INTEGER,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at INTEGER,
        scope TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // TikTok Users Table
    db.run(`CREATE TABLE IF NOT EXISTS tiktok_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        open_id TEXT UNIQUE,
        union_id TEXT,
        display_name TEXT,
        avatar_url TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at INTEGER,
        scope TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log('Database schema initialized.');
});

module.exports = db;
