#!/usr/bin/env node

const axios = require('axios');

const CLIENT_ID = 'Pb72ranhoyt6gw7hM7TkzUItXlMWSNSo';
const API = 'https://api-v2.soundcloud.com';

const makeHeaders = () => ({
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
    'accept-language': 'en-GB, en;q=0.9',
    'accept-encoding': 'gzip',
});

const extractPermalink = (input) => {
    if (!input) return null;
    const m = input.match(/soundcloud\.com\/([^?#]+)/);
    return m ? `https://soundcloud.com/${m[1]}` : null;
};

const soundcloudSearch = async (query) => {
    const { data } = await axios.get(`${API}/search`, {
        params: { q: query, client_id: CLIENT_ID, limit: 50, offset: 0 },
        headers: makeHeaders(),
    });
    
    return (data.collection || []).map(t => ({
        id: t.id,
        title: t.title,
        user: t.user?.username || null,
        duration: t.duration,
        playback_count: t.playback_count,
        likes_count: t.likes_count,
        genre: t.genre || null,
        artwork_url: t.artwork_url || null,
        url: t.permalink_url,
        kind: t.kind,
    }));
};

const soundcloudGetInfo = async (input) => {
    const url = extractPermalink(input) || input;
    const { data } = await axios.get(`${API}/resolve`, {
        params: { url, client_id: CLIENT_ID },
        headers: makeHeaders(),
    });
    
    return {
        id: data.id,
        title: data.title,
        description: data.description || null,
        user: data.user?.username || null,
        user_url: data.user?.permalink_url || null,
        duration: data.duration,
        genre: data.genre || null,
        likes_count: data.likes_count,
        playback_count: data.playback_count,
        artwork_url: data.artwork_url || null,
        waveform_url: data.waveform_url || null,
        created_at: data.created_at,
        url: data.permalink_url,
        streamable: data.streamable,
    };
};

const soundcloudGetDownloadUrl = async (input) => {
    const url = extractPermalink(input) || input;
    const { data } = await axios.get(`${API}/resolve`, {
        params: { url, client_id: CLIENT_ID },
        headers: makeHeaders(),
    });

    if (!data.streamable) throw new Error('Track tidak bisa distream!');

    const trackAuth = data.track_authorization;
    const transcodings = data.media?.transcodings || [];

    const progressive = transcodings.find(t => t.format.protocol === 'progressive');
    const hls = transcodings.find(t => t.format.protocol === 'hls' && t.format.mime_type === 'audio/mpeg');
    const hlsAac = transcodings.find(t => t.format.protocol === 'hls' && t.preset === 'aac_96k');

    const resolveUrl = async (transcoding) => {
        if (!transcoding) return null;
        const { data: stream } = await axios.get(transcoding.url, {
            params: { client_id: CLIENT_ID, track_authorization: trackAuth },
            headers: makeHeaders(),
        });
        
        return stream.url || null;
    };

    const [progressiveUrl, hlsUrl, hlsAacUrl] = await Promise.all([
        resolveUrl(progressive),
        resolveUrl(hls),
        resolveUrl(hlsAac),
    ]);

    return {
        id: data.id,
        title: data.title,
        artwork_url: data.artwork_url || null,
        user: data.user?.username || null,
        duration: data.duration,
        bestProgressive: progressiveUrl,
        bestHls: hlsUrl,
        bestHlsAac: hlsAacUrl,
        formats: transcodings.map(t => ({
            preset: t.preset,
            protocol: t.format.protocol,
            mimeType: t.format.mime_type,
            quality: t.quality,
        })),
    };
};

module.exports = {
    extractPermalink,
    soundcloudSearch,
    soundcloudGetInfo,
    soundcloudGetDownloadUrl,
    CLIENT_ID,
    makeHeaders,
};
