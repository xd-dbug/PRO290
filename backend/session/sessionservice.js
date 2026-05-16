const express = require('express');
const service = require('./session.service');

const router = express.Router();

router.post('/', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
        const result = await service.startSession(userId);
        return res.status(201).json(result);
    } catch (err) {
        return res.status(500).json({ error: 'internal server error' });
    }
});

router.post('/:id/end', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
        const result = await service.endSession(userId, req.params.id);
        if (result.status === 404) return res.status(404).json({ error: 'session not found' });
        if (result.status === 403) return res.status(403).json({ error: 'forbidden' });
        if (result.status === 409) return res.status(409).json({ error: 'session already ended' });
        if (result.status === 422) return res.status(422).json({ error: result.error, reason: result.reason });
        const { status, ...body } = result;
        return res.status(200).json(body);
    } catch (err) {
        return res.status(500).json({ error: 'internal server error' });
    }
});

router.post('/:id/heartbeat', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
        const result = await service.heartbeat(userId, req.params.id);
        if (result.status === 404) return res.status(404).json({ error: 'session not found' });
        if (result.status === 403) return res.status(403).json({ error: 'forbidden' });
        if (result.status === 422) return res.status(422).json({ error: 'session not active' });
        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'internal server error' });
    }
});

module.exports = router;