// =============================================================================
// Refreshes content-diet.json with fresh phrases about what Heyun is reading
// (via Goodreads RSS) and listening to (via Spotify recently-played), each
// summarized into a 5-10 word phrase by Claude Haiku.
//
// Run by .github/workflows/content-diet.yml on a monthly cron. Safe to run
// locally too — just set the same env vars.
//
// One-time Spotify OAuth flow to get SPOTIFY_REFRESH_TOKEN:
//   1. Create a Spotify app at https://developer.spotify.com/dashboard
//      Redirect URI: http://localhost:8888/callback (or anything you control)
//   2. In a browser, visit:
//        https://accounts.spotify.com/authorize
//          ?client_id=YOUR_CLIENT_ID
//          &response_type=code
//          &redirect_uri=http://localhost:8888/callback
//          &scope=user-read-recently-played
//   3. Approve. Spotify redirects to your redirect URI with ?code=... in the URL.
//      Copy that code.
//   4. Exchange the code for a refresh_token by POSTing to
//      https://accounts.spotify.com/api/token with:
//        grant_type=authorization_code, code=..., redirect_uri=...,
//        client_id=..., client_secret=...
//      The response contains a "refresh_token" — that's what goes in
//      GitHub Secrets. It doesn't expire (unless you revoke access).
// =============================================================================

const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'content-diet.json');

async function main() {
    const [reading, listening] = await Promise.all([
        fetchGoodreadsTitles().catch(err => {
            console.error('Goodreads fetch failed:', err.message);
            return [];
        }),
        fetchSpotifyRecent().catch(err => {
            console.error('Spotify fetch failed:', err.message);
            return [];
        })
    ]);

    const phrases = await summarize({ reading, listening });

    const existing = readExisting();
    const next = {
        updated: new Date().toISOString().slice(0, 10),
        reading: phrases.reading || existing.reading || '',
        listening: phrases.listening || existing.listening || ''
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(next, null, 2) + '\n');
    console.log('Wrote', OUTPUT_PATH, next);
}

function readExisting() {
    try {
        return JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    } catch {
        return {};
    }
}

// -----------------------------------------------------------------------------
// Goodreads: pull the user's RSS feed for a shelf, extract book titles + authors
// -----------------------------------------------------------------------------
async function fetchGoodreadsTitles() {
    const userId = process.env.GOODREADS_USER_ID;
    const shelf = process.env.GOODREADS_SHELF || 'currently-reading';
    if (!userId) throw new Error('GOODREADS_USER_ID not set');

    const url = `https://www.goodreads.com/review/list_rss/${userId}?shelf=${encodeURIComponent(shelf)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Goodreads RSS ${res.status}`);
    const xml = await res.text();

    // Extract each <item>...<title>...</title>...<author_name>...</author_name>
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRegex.exec(xml)) !== null) {
        const block = m[1];
        const title = extractTag(block, 'title');
        const author = extractTag(block, 'author_name');
        if (title) items.push({ title, author });
        if (items.length >= 10) break;
    }
    return items;
}

function extractTag(xml, tag) {
    const re = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`);
    const m = xml.match(re);
    return m ? m[1].trim() : '';
}

// -----------------------------------------------------------------------------
// Spotify: refresh access token, pull last 50 plays, enrich artists with genres
// -----------------------------------------------------------------------------
async function fetchSpotifyRecent() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Spotify env vars not set');
    }

    // Exchange refresh_token for a fresh access_token
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        })
    });
    if (!tokenRes.ok) throw new Error(`Spotify token ${tokenRes.status}`);
    const { access_token } = await tokenRes.json();

    // Recently played tracks (up to 50)
    const playedRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
        headers: { 'Authorization': `Bearer ${access_token}` }
    });
    if (!playedRes.ok) throw new Error(`Spotify recently-played ${playedRes.status}`);
    const played = await playedRes.json();

    const tracks = (played.items || []).map(item => ({
        name: item.track?.name,
        artists: (item.track?.artists || []).map(a => ({ id: a.id, name: a.name }))
    }));

    // Enrich with artist genres (batch up to 50 IDs)
    const uniqArtistIds = Array.from(new Set(tracks.flatMap(t => t.artists.map(a => a.id).filter(Boolean))));
    let genreMap = {};
    if (uniqArtistIds.length) {
        const artRes = await fetch(`https://api.spotify.com/v1/artists?ids=${uniqArtistIds.slice(0, 50).join(',')}`, {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });
        if (artRes.ok) {
            const artistData = await artRes.json();
            (artistData.artists || []).forEach(a => {
                genreMap[a.id] = a.genres || [];
            });
        }
    }

    return tracks.slice(0, 30).map(t => ({
        name: t.name,
        artist: t.artists[0]?.name,
        genres: t.artists.flatMap(a => genreMap[a.id] || [])
    }));
}

// -----------------------------------------------------------------------------
// Claude Haiku: turn the two data blobs into two short phrases in Heyun's voice
// -----------------------------------------------------------------------------
async function summarize({ reading, listening }) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

    const readingText = reading.length
        ? reading.map(b => `- "${b.title}" by ${b.author}`).join('\n')
        : '(none)';

    const listeningText = listening.length
        ? listening.map(t => {
            const genres = t.genres.length ? ` [${t.genres.slice(0, 3).join(', ')}]` : '';
            return `- "${t.name}" by ${t.artist}${genres}`;
        }).join('\n')
        : '(none)';

    const prompt = `Below are books Heyun has been reading recently and songs she has been listening to recently. Write two very short phrases (5 to 10 words each) that capture the vibe of each — genre, mood, energy. Write in her voice: dry, declarative, specific, no fluff. No adjectives that could describe anything.

BOOKS:
${readingText}

SONGS:
${listeningText}

Respond with ONLY a JSON object in this exact shape, no prose before or after:
{"reading": "phrase here", "listening": "phrase here"}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            messages: [{ role: 'user', content: prompt }]
        })
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Anthropic ${res.status}: ${errText}`);
    }
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in Claude response: ' + text);
    return JSON.parse(match[0]);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
