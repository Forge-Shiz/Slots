/**
 * Grease Burger Analytics Server
 * Simple Express server for tracking game analytics
 * Run with: node server.js
 * Port: 3777
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3777;
const DATA_FILE = path.join(__dirname, 'data', 'analytics.json');

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
    'https://greaseburger.fun',
    'https://www.greaseburger.fun',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

// Known scanner/bot User-Agents to reject
const BLOCKED_USER_AGENTS = [
    'sqlmap',
    'nikto',
    'nmap',
    'masscan',
    'zgrab',
    'censys',
    'shodan',
    'nessus',
    'openvas',
    'nuclei',
    'dirbuster',
    'gobuster',
    'ffuf',
    'wfuzz',
    'burp',
    'acunetix',
    'netsparker',
    'appscan',
    'webinspect',
    'arachni'
];

// Middleware: Block known scanners
app.use((req, res, next) => {
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    for (const blocked of BLOCKED_USER_AGENTS) {
        if (ua.includes(blocked)) {
            console.warn(`Blocked scanner: ${blocked} from ${req.ip}`);
            return res.status(403).json({ error: 'Forbidden' });
        }
    }
    next();
});

// Middleware: Limit request body size
app.use(express.json({ limit: '10kb' }));

// Middleware: Reject oversized requests early
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Request too large' });
    }
    next(err);
});

// CORS - restrict to allowed origins
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    // Don't expose server info in headers
    res.removeHeader('X-Powered-By');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Rate limiting: 10 requests per second per IP
const limiter = rateLimit({
    windowMs: 1000, // 1 second
    max: 10,
    message: { error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
    // Use X-Forwarded-For header from nginx
    keyGenerator: (req) => {
        return req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip;
    }
});
app.use(limiter);

// Helper: Read analytics data
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        // Don't log error details that could expose file paths
        return { visits: [], spins: [], freeSpins: [], bigWins: [] };
    }
}

// Helper: Write analytics data
function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        return false;
    }
}

// Helper: Sanitize string input - remove potential XSS/injection characters
function sanitize(str, maxLength = 500) {
    if (typeof str !== 'string') return '';
    return str
        .slice(0, maxLength)
        .replace(/[<>'"&\\]/g, '') // Remove HTML/SQL special chars
        .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}

// Helper: Validate number within range
function validateNumber(val, min = 0, max = 1000000) {
    const num = parseFloat(val);
    if (isNaN(num) || !isFinite(num) || num < min || num > max) return null;
    return num;
}

// Helper: Validate object has only expected keys
function validateKeys(obj, allowedKeys) {
    if (!obj || typeof obj !== 'object') return false;
    const keys = Object.keys(obj);
    return keys.every(key => allowedKeys.includes(key));
}

// Valid event types and their allowed data fields
const EVENT_SCHEMAS = {
    visit: ['sessionId', 'userAgent', 'screenSize', 'referrer'],
    spin: ['sessionId', 'bet', 'win', 'symbols'],
    freeSpins: ['sessionId', 'mode', 'totalWin', 'spinsCount'],
    bigWin: ['sessionId', 'tier', 'amount']
};

// POST /api/track - Track events
app.post('/track', (req, res) => {
    try {
        const { eventType, data } = req.body;

        // Validate request structure
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: 'Invalid request' });
        }

        // Only allow eventType and data fields in body
        if (!validateKeys(req.body, ['eventType', 'data'])) {
            return res.status(400).json({ error: 'Invalid request' });
        }

        if (!eventType || typeof eventType !== 'string') {
            return res.status(400).json({ error: 'Invalid event type' });
        }

        if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: 'Invalid data' });
        }

        // Validate eventType is known
        if (!EVENT_SCHEMAS[eventType]) {
            return res.status(400).json({ error: 'Unknown event type' });
        }

        // Validate data only contains allowed fields for this event type
        if (!validateKeys(data, EVENT_SCHEMAS[eventType])) {
            return res.status(400).json({ error: 'Invalid data fields' });
        }

        const analytics = readData();
        const timestamp = new Date().toISOString();

        switch (eventType) {
            case 'visit':
                if (!data.sessionId) {
                    return res.status(400).json({ error: 'Missing sessionId' });
                }
                analytics.visits.push({
                    timestamp,
                    sessionId: sanitize(data.sessionId, 50),
                    userAgent: sanitize(data.userAgent, 300),
                    screenSize: sanitize(data.screenSize, 20),
                    referrer: sanitize(data.referrer, 200)
                });
                // Keep only last 10000 visits
                if (analytics.visits.length > 10000) {
                    analytics.visits = analytics.visits.slice(-10000);
                }
                break;

            case 'spin':
                const bet = validateNumber(data.bet, 0, 10000);
                const win = validateNumber(data.win, 0, 10000000);
                if (bet === null || win === null) {
                    return res.status(400).json({ error: 'Invalid bet or win' });
                }
                analytics.spins.push({
                    timestamp,
                    sessionId: sanitize(data.sessionId, 50),
                    bet,
                    win,
                    symbols: Array.isArray(data.symbols)
                        ? data.symbols.slice(0, 18).map(s => sanitize(String(s), 20))
                        : []
                });
                // Keep only last 50000 spins
                if (analytics.spins.length > 50000) {
                    analytics.spins = analytics.spins.slice(-50000);
                }
                break;

            case 'freeSpins':
                const fsWin = validateNumber(data.totalWin, 0, 10000000);
                if (fsWin === null) {
                    return res.status(400).json({ error: 'Invalid totalWin' });
                }
                analytics.freeSpins.push({
                    timestamp,
                    sessionId: sanitize(data.sessionId, 50),
                    mode: sanitize(data.mode, 20),
                    totalWin: fsWin,
                    spinsCount: validateNumber(data.spinsCount, 0, 100) || 0
                });
                // Keep only last 5000 free spins
                if (analytics.freeSpins.length > 5000) {
                    analytics.freeSpins = analytics.freeSpins.slice(-5000);
                }
                break;

            case 'bigWin':
                const bigWinAmount = validateNumber(data.amount, 0, 10000000);
                if (bigWinAmount === null) {
                    return res.status(400).json({ error: 'Invalid amount' });
                }
                const validTiers = ['big', 'mega', 'epic'];
                const tier = validTiers.includes(data.tier) ? data.tier : 'big';
                analytics.bigWins.push({
                    timestamp,
                    sessionId: sanitize(data.sessionId, 50),
                    tier,
                    amount: bigWinAmount
                });
                // Keep only last 5000 big wins
                if (analytics.bigWins.length > 5000) {
                    analytics.bigWins = analytics.bigWins.slice(-5000);
                }
                break;
        }

        writeData(analytics);
        res.json({ success: true });

    } catch (err) {
        // Generic error - don't expose internals
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/stats - Aggregated statistics
app.get('/stats', (req, res) => {
    try {
        const analytics = readData();

        const uniqueSessions = new Set(analytics.visits.map(v => v.sessionId)).size;
        const totalVisits = analytics.visits.length;
        const totalSpins = analytics.spins.length;
        const totalWagered = analytics.spins.reduce((sum, s) => sum + s.bet, 0);
        const totalWon = analytics.spins.reduce((sum, s) => sum + s.win, 0);
        const houseEdge = totalWagered > 0 ? ((totalWagered - totalWon) / totalWagered * 100).toFixed(2) : 0;
        const avgBet = totalSpins > 0 ? (totalWagered / totalSpins).toFixed(2) : 0;

        // Symbol frequency
        const symbolCounts = {};
        analytics.spins.forEach(spin => {
            if (spin.symbols) {
                spin.symbols.forEach(sym => {
                    symbolCounts[sym] = (symbolCounts[sym] || 0) + 1;
                });
            }
        });
        const topSymbols = Object.entries(symbolCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        // Win tiers
        const bigWinCounts = { big: 0, mega: 0, epic: 0 };
        analytics.bigWins.forEach(w => {
            if (bigWinCounts[w.tier] !== undefined) {
                bigWinCounts[w.tier]++;
            }
        });

        // Free spins trigger rate
        const fsTriggerRate = totalSpins > 0 ? (analytics.freeSpins.length / totalSpins * 100).toFixed(2) : 0;

        // Spins per hour (last 24 hours)
        const now = Date.now();
        const last24h = analytics.spins.filter(s => new Date(s.timestamp).getTime() > now - 86400000);
        const spinsByHour = {};
        for (let i = 0; i < 24; i++) {
            spinsByHour[i] = 0;
        }
        last24h.forEach(spin => {
            const hour = new Date(spin.timestamp).getHours();
            spinsByHour[hour]++;
        });

        res.json({
            totalVisits,
            uniqueSessions,
            totalSpins,
            totalWagered: totalWagered.toFixed(2),
            totalWon: totalWon.toFixed(2),
            houseEdge,
            avgBet,
            topSymbols,
            bigWinCounts,
            fsTriggerRate,
            spinsByHour,
            lastUpdated: new Date().toISOString()
        });

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/sessions - Recent sessions
app.get('/sessions', (req, res) => {
    try {
        const analytics = readData();
        const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 200);

        // Group by session
        const sessionMap = {};

        analytics.visits.forEach(v => {
            if (!sessionMap[v.sessionId]) {
                sessionMap[v.sessionId] = {
                    sessionId: v.sessionId,
                    startTime: v.timestamp,
                    userAgent: v.userAgent,
                    screenSize: v.screenSize,
                    spins: 0,
                    wagered: 0,
                    won: 0
                };
            }
        });

        analytics.spins.forEach(s => {
            if (sessionMap[s.sessionId]) {
                sessionMap[s.sessionId].spins++;
                sessionMap[s.sessionId].wagered += s.bet;
                sessionMap[s.sessionId].won += s.win;
            }
        });

        const sessions = Object.values(sessionMap)
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, limit)
            .map(s => ({
                ...s,
                netResult: (s.won - s.wagered).toFixed(2),
                device: s.userAgent && s.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
            }));

        res.json(sessions);

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/spins - Recent spins with pagination
app.get('/spins', (req, res) => {
    try {
        const analytics = readData();
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 200);
        const offset = (page - 1) * limit;

        const recentSpins = analytics.spins
            .slice()
            .reverse()
            .slice(offset, offset + limit);

        res.json({
            spins: recentSpins,
            page,
            limit,
            total: analytics.spins.length,
            totalPages: Math.ceil(analytics.spins.length / limit)
        });

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/bigwins - Recent big wins
app.get('/bigwins', (req, res) => {
    try {
        const analytics = readData();
        const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 200);

        const recentBigWins = analytics.bigWins
            .slice()
            .reverse()
            .slice(0, limit);

        res.json(recentBigWins);

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Catch-all for undefined routes
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Global error handler - never expose stack traces
app.use((err, req, res, next) => {
    res.status(500).json({ error: 'Server error' });
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Grease Burger Analytics Server running on port ${PORT}`);
});
