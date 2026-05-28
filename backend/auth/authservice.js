const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmail } = require('../model/users');

const router = express.Router();

router.get('/validate', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.set('X-User-ID', decoded.userId);
        return res.status(200).json({ success: true });
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
})

router.post('/register', async (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
        return res.status(400).json({ error: 'Email, username, and password are required' });
    }
    try {
        const existing = await findUserByEmail(email);
        if (existing) {
            return res.status(409).json({error: 'User already exists'});
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await createUser(email, username, hashedPassword);
        return res.status(201).json({message: 'User created successfully'});
    }catch (error) {
        console.error(error);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.user_id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );
        return res.status(200).json({ token });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;