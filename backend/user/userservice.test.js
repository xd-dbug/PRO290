const request = require('supertest');
const express = require('express');

jest.mock('../model/users');
jest.mock('../model/notes');

const { findUserByID, updateUser, deleteUser } = require('../model/users');
const { getNotes, createNote, updateNote, deleteNote } = require('../model/notes');
const userRouter = require('./userservice');

const app = express();
app.use(express.json());
app.use('/users', userRouter);

beforeEach(() => {
    jest.clearAllMocks();
});

// ─── GET /users/me ───────────────────────────────────────────────────────────

describe('GET /users/me', () => {
    test('returns 200 with user data when x-user-id is present', async () => {
        findUserByID.mockResolvedValue({ user_id: 'abc-123', email: 'test@test.com', username: 'testuser' });

        const res = await request(app)
            .get('/users/me')
            .set('x-user-id', 'abc-123');

        expect(res.status).toBe(200);
        expect(res.body.user_id).toBe('abc-123');
        expect(res.body.password_hash).toBeUndefined();
    });

    test('returns 401 when x-user-id header is missing', async () => {
        const res = await request(app).get('/users/me');
        expect(res.status).toBe(401);
        expect(findUserByID).not.toHaveBeenCalled();
    });

    test('returns 500 when DB throws', async () => {
        findUserByID.mockRejectedValue(new Error('DB error'));

        const res = await request(app)
            .get('/users/me')
            .set('x-user-id', 'abc-123');

        expect(res.status).toBe(500);
    });
});

// ─── PATCH /users/me ─────────────────────────────────────────────────────────

describe('PATCH /users/me', () => {
    test('returns 200 when username is updated', async () => {
        updateUser.mockResolvedValue({ affectedRows: 1 });

        const res = await request(app)
            .patch('/users/me')
            .set('x-user-id', 'abc-123')
            .send({ username: 'newname' });

        expect(res.status).toBe(200);
        expect(updateUser).toHaveBeenCalledWith('abc-123', 'newname', undefined);
    });

    test('returns 400 when no fields are provided', async () => {
        updateUser.mockResolvedValue(null);

        const res = await request(app)
            .patch('/users/me')
            .set('x-user-id', 'abc-123')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('No fields to update');
    });

    test('returns 401 when x-user-id header is missing', async () => {
        const res = await request(app).patch('/users/me').send({ username: 'newname' });
        expect(res.status).toBe(401);
        expect(updateUser).not.toHaveBeenCalled();
    });
});

// ─── DELETE /users/me ────────────────────────────────────────────────────────

describe('DELETE /users/me', () => {
    test('returns 204 on successful delete', async () => {
        deleteUser.mockResolvedValue();

        const res = await request(app)
            .delete('/users/me')
            .set('x-user-id', 'abc-123');

        expect(res.status).toBe(204);
        expect(deleteUser).toHaveBeenCalledWith('abc-123');
    });

    test('returns 401 when x-user-id header is missing', async () => {
        const res = await request(app).delete('/users/me');
        expect(res.status).toBe(401);
        expect(deleteUser).not.toHaveBeenCalled();
    });
});

// ─── GET /users/:userId/stats ────────────────────────────────────────────────

describe('GET /users/:userId/stats', () => {
    test('returns 200 with placeholder message', async () => {
        const res = await request(app)
            .get('/users/abc-123/stats')
            .set('x-user-id', 'abc-123');

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('not implemented yet');
    });
});

// ─── GET /users/me/notes ─────────────────────────────────────────────────────

describe('GET /users/me/notes', () => {
    test('returns 200 with notes array', async () => {
        getNotes.mockResolvedValue([{ note_id: 1, title: 'Test', body: 'Body' }]);

        const res = await request(app)
            .get('/users/me/notes')
            .set('x-user-id', 'abc-123');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(getNotes).toHaveBeenCalledWith('abc-123');
    });

    test('returns 401 when x-user-id header is missing', async () => {
        const res = await request(app).get('/users/me/notes');
        expect(res.status).toBe(401);
        expect(getNotes).not.toHaveBeenCalled();
    });
});

// ─── POST /users/me/notes ────────────────────────────────────────────────────

describe('POST /users/me/notes', () => {
    test('returns 201 when note is created', async () => {
        createNote.mockResolvedValue({ insertId: 1 });

        const res = await request(app)
            .post('/users/me/notes')
            .set('x-user-id', 'abc-123')
            .send({ title: 'My Note', body: 'Some content' });

        expect(res.status).toBe(201);
        expect(createNote).toHaveBeenCalledWith('abc-123', 'My Note', 'Some content');
    });

    test('returns 400 when title is missing', async () => {
        const res = await request(app)
            .post('/users/me/notes')
            .set('x-user-id', 'abc-123')
            .send({ body: 'Some content' });

        expect(res.status).toBe(400);
        expect(createNote).not.toHaveBeenCalled();
    });

    test('returns 400 when body is missing', async () => {
        const res = await request(app)
            .post('/users/me/notes')
            .set('x-user-id', 'abc-123')
            .send({ title: 'My Note' });

        expect(res.status).toBe(400);
        expect(createNote).not.toHaveBeenCalled();
    });

    test('returns 401 when x-user-id header is missing', async () => {
        const res = await request(app)
            .post('/users/me/notes')
            .send({ title: 'My Note', body: 'Some content' });

        expect(res.status).toBe(401);
        expect(createNote).not.toHaveBeenCalled();
    });
});

// ─── PATCH /users/me/notes/:noteId ───────────────────────────────────────────

describe('PATCH /users/me/notes/:noteId', () => {
    test('returns 200 when note is updated', async () => {
        updateNote.mockResolvedValue({ affectedRows: 1 });

        const res = await request(app)
            .patch('/users/me/notes/1')
            .set('x-user-id', 'abc-123')
            .send({ title: 'Updated title' });

        expect(res.status).toBe(200);
        expect(updateNote).toHaveBeenCalledWith('abc-123', '1', 'Updated title', undefined);
    });

    test('returns 400 when no fields are provided', async () => {
        updateNote.mockResolvedValue(null);

        const res = await request(app)
            .patch('/users/me/notes/1')
            .set('x-user-id', 'abc-123')
            .send({});

        expect(res.status).toBe(400);
    });

    test('returns 401 when x-user-id header is missing', async () => {
        const res = await request(app)
            .patch('/users/me/notes/1')
            .send({ title: 'Updated title' });

        expect(res.status).toBe(401);
        expect(updateNote).not.toHaveBeenCalled();
    });
});

// ─── DELETE /users/me/notes/:noteId ──────────────────────────────────────────

describe('DELETE /users/me/notes/:noteId', () => {
    test('returns 204 on successful delete', async () => {
        deleteNote.mockResolvedValue();

        const res = await request(app)
            .delete('/users/me/notes/1')
            .set('x-user-id', 'abc-123');

        expect(res.status).toBe(204);
        expect(deleteNote).toHaveBeenCalledWith('abc-123', '1');
    });

    test('returns 401 when x-user-id header is missing', async () => {
        const res = await request(app).delete('/users/me/notes/1');
        expect(res.status).toBe(401);
        expect(deleteNote).not.toHaveBeenCalled();
    });
});