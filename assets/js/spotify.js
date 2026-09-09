const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
require("dotenv").config();
const qs = require("qs");

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGIN = "https://akakadir.art";
const SPOTIFY_PLAYER_URL =
    "https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode";
const SPOTIFY_TOKEN_URL =
    "https://accounts.spotify.com/api/token";

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
    helmet({
        contentSecurityPolicy: false,
    })
);

app.use(
    cors({
        origin: ALLOWED_ORIGIN,
        methods: ["GET"],
        allowedHeaders: ["Content-Type"],
    })
);

app.use((req, res, next) => {
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    if (!origin && !referer) {
        return res
            .status(403)
            .json({ error: "403: erişim isteği reddedildi" });
    }

    if (origin === ALLOWED_ORIGIN) {
        return next();
    }

    if (referer) {
        try {
            const refererOrigin = new URL(referer).origin;

            if (refererOrigin === ALLOWED_ORIGIN) {
                return next();
            }
        } catch {}
    }

    return res
        .status(403)
        .json({ error: "403 - erişim isteği reddedildi" });
});

const nowPlayingLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        error: "çok fazla istek gönderildi."
    },
    handler: (req, res) => {
        res.status(429).json({
            error: "çok fazla istek gönderildi."
        });
    }
});

let cachedAccessToken = null;
let tokenExpiresAt = 0;
let tokenRequestPromise = null;

async function getAccessToken() {
    if (
        cachedAccessToken &&
        Date.now() < tokenExpiresAt
    ) {
        return cachedAccessToken;
    }

    if (tokenRequestPromise) {
        return tokenRequestPromise;
    }

    tokenRequestPromise = (async () => {
        try {
            const response = await axios.post(
                SPOTIFY_TOKEN_URL,
                qs.stringify({
                    grant_type: "refresh_token",
                    refresh_token:
                        process.env.SPOTIFY_REFRESH_TOKEN,
                    client_id:
                        process.env.SPOTIFY_CLIENT_ID,
                    client_secret:
                        process.env.SPOTIFY_CLIENT_SECRET,
                }),
                {
                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded",
                    },
                    timeout: 10000,
                }
            );

            cachedAccessToken =
                response.data.access_token;

            const expiresIn =
                Number(response.data.expires_in) || 3600;

            tokenExpiresAt =
                Date.now() +
                Math.max(expiresIn - 60, 60) * 1000;

            return cachedAccessToken;
        } finally {
            tokenRequestPromise = null;
        }
    })();

    return tokenRequestPromise;
}

function invalidateAccessToken() {
    cachedAccessToken = null;
    tokenExpiresAt = 0;
}

let cachedNowPlaying = null;
let cachedNowPlayingAt = 0;

const RESPONSE_CACHE_MS = 750;

function getCachedResponse() {
    if (
        cachedNowPlaying &&
        Date.now() - cachedNowPlayingAt < RESPONSE_CACHE_MS
    ) {
        return cachedNowPlaying;
    }

    return null;
}

function setCachedResponse(data) {
    cachedNowPlaying = data;
    cachedNowPlayingAt = Date.now();
}

function formatTime(ms) {
    const safeMs = Number(ms) || 0;
    const minutes = Math.floor(safeMs / 60000);
    const seconds = Math.floor(
        (safeMs % 60000) / 1000
    )
        .toString()
        .padStart(2, "0");

    return `${minutes}:${seconds}`;
}

app.get(
    "/api/now-playing",
    nowPlayingLimiter,
    async (req, res) => {
        const cachedResponse = getCachedResponse();

        if (cachedResponse) {
            return res.json(cachedResponse);
        }

        try {
            let accessToken = await getAccessToken();
            let response;

            try {
                response = await axios.get(
                    SPOTIFY_PLAYER_URL,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`,
                        },
                        timeout: 10000,
                    }
                );
            } catch (error) {
                if (
                    error.response?.status === 401
                ) {
                    invalidateAccessToken();

                    accessToken =
                        await getAccessToken();

                    response = await axios.get(
                        SPOTIFY_PLAYER_URL,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${accessToken}`,
                            },
                            timeout: 10000,
                        }
                    );
                } else {
                    throw error;
                }
            }

            if (
                response.status === 204 ||
                !response.data ||
                !response.data.item
            ) {
                const result = {
                    error:
                        "galiba uyuyorum ya, veya öyle bir şey."
                };

                setCachedResponse(result);

                return res.json(result);
            }

            const item = response.data.item;
            const progress = formatTime(
                response.data.progress_ms
            );
            const duration = formatTime(
                item.duration_ms
            );
            const trackLink =
                item.external_urls?.spotify;

            let result;

            if (item.type === "episode") {
                result = {
                    type: "podcast",
                    name: item.name,
                    artists:
                        item.show?.publisher ||
                        item.show?.name,
                    album: item.show?.name,
                    albumArt:
                        item.images?.[0]?.url ||
                        item.show?.images?.[0]?.url,
                    progress,
                    duration,
                    trackLink,
                };
            } else {
                result = {
                    type: "track",
                    name: item.name,
                    artists:
                        item.artists
                            ?.map(
                                artist =>
                                    artist.name
                            )
                            .join(", ") || "",
                    album: item.album?.name,
                    albumArt:
                        item.album?.images?.[0]?.url,
                    progress,
                    duration,
                    trackLink,
                };
            }

            setCachedResponse(result);

            return res.json(result);
        } catch (error) {
            console.error(
                "SPOTIFY ERROR:",
                JSON.stringify(
                    {
                        status:
                            error.response?.status ||
                            null,
                        data:
                            error.response?.data ||
                            null,
                        message:
                            error.message,
                        url:
                            error.config?.url ||
                            null,
                        retryAfter:
                            error.response?.headers?.[
                                "retry-after"
                            ] || null,
                    },
                    null,
                    2
                )
            );

            return res.status(500).json({
                error:
                    "spotify verilerime erişemedim."
            });
        }
    }
);

app.use((req, res) => {
    res.status(404).json({
        error: "404 - endpoint bulunamadı"
    });
});

app.listen(PORT, () => {
    console.log(
        `Server is running on port ${PORT}`
    );
});
