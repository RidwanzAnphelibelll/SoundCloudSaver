#!/usr/bin/env node

const axios = require('axios');
const express = require('express');
const sc = require('../lib/soundcloud');

const router = express.Router();

const errorRes = (res, msg, status = 200) => res.status(status).json({ success: false, message: msg });

const successRes = (res, data) => res.json({ success: true, data });

router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || !q.trim()) return errorRes(res, 'Query wajib diisi.');
        const results = await sc.soundcloudSearch(q.trim());
        const tracks = results.filter(t => t.kind === 'track');
        successRes(res, tracks);
    } catch (e) {
        errorRes(res, e.message);
    }
});

router.get('/info', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return errorRes(res, 'url wajib diisi.');
        const info = await sc.soundcloudGetInfo(url.trim());
        successRes(res, info);
    } catch (e) {
        errorRes(res, e.message);
    }
});

router.get('/download', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return errorRes(res, 'url wajib diisi.');
        if (!/soundcloud\.com\/.+/.test(url)) return errorRes(res, 'URL SoundCloud tidak valid!');
        const result = await sc.soundcloudGetDownloadUrl(url.trim());
        successRes(res, result);
    } catch (e) {
        errorRes(res, e.message);
    }
});

router.get('/dlproxy', async (req, res) => {
    try {
        const { url, filename } = req.query;
        if (!url) return res.status(400).end();
        const decoded = decodeURIComponent(url);
        const response = await axios.get(decoded, {
            headers: sc.makeHeaders(),
            responseType: 'stream',
            timeout: 30000,
            maxRedirects: 5,
        });
        const ct = response.headers['content-type'];
        const cl = response.headers['content-length'];
        const finalFilename = filename || `SoundCloud-${Date.now()}.mp3`;
        res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
        res.setHeader('Content-Type', ct);
        if (cl) res.setHeader('Content-Length', cl);
        else res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Disposition, Content-Type');
        response.data.pipe(res);
    } catch (e) {
        res.status(404).end();
    }
});

module.exports = router;
