const express = require('express');
const {updateUser, deleteUser, findUserByID} = require("../model/users");
const {getNotes, createNote, updateNote, deleteNote} = require("../model/notes");

const router = express.Router();

router.get('/me', async (req, res) => {
    const user_id = req.headers['x-user-id'];
    if (!user_id) {
        return res.status(401).send('No such user');
    }
    try {
        return res.status(200).json(await findUserByID(user_id));
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
})

router.patch('/me', async (req, res) => {
    const {username, email} = req.body;
    const user_id = req.headers['x-user-id'];
    if (!user_id) {
        return res.status(401).send('No such user');
    }
    try {
        const result = await updateUser(user_id, username, email);
        if (result === null) return res.status(400).json({error: "No fields to update"});
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
})

router.delete('/me', async (req, res) => {
    const user_id = req.headers['x-user-id'];
    if (!user_id) {
        return res.status(401).send('No such user');
    }
    try {
        await deleteUser(user_id);
        return res.status(204).send();
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
})

router.get("/me/notes", async (req, res) => {
    const user_id = req.headers['x-user-id'];
    if (!user_id) {
        return res.status(401).send('No such user');
    }
    try {
        return res.status(200).json(await getNotes(user_id));
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
})

router.post("/me/notes", async (req, res) => {
    const user_id = req.headers['x-user-id'];
    if (!user_id) {
        return res.status(401).send('No such user');
    }
    const { title, body } = req.body;
    if (!title || !body) {
        return res.status(400).json({ error: 'title and body are required' });
    }
    try {
        await createNote(user_id, title, body);
        return res.status(201).json({ message: "note created successfully" });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
})

router.patch("/me/notes/:noteId", async (req, res) => {
    const user_id = req.headers['x-user-id'];
    const note_id = req.params.noteId;
    const { title, body } = req.body;

    if (!user_id) {
        return res.status(401).send('No such user');
    }
    try {
        const result = await updateNote(user_id, note_id, title, body);
        if (result === null) return res.status(400).json({error: "No fields to update"});
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
})

router.delete("/me/notes/:noteId", async (req, res) => {
    const user_id = req.headers['x-user-id'];
    const note_id = req.params.noteId;

    if (!user_id) {
        return res.status(401).send('No such user');
    }
    try {
        await deleteNote(user_id, note_id);
        return res.status(204).send();
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
})

router.get('/:userId/stats', async (req, res) => {
    return res.status(200).json({ message: "not implemented yet" });
})

module.exports = router;