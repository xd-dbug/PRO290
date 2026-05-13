const request = require('supertest');
const express = require('express');

jest.mock('../model/users');
jest.mock('jsonwebtoken');
jest.mock('bcrypt');

const { createUser, findUserByEmail } = require('../model/users');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const authRouter = require('./authservice');

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test_secret';
});

describe('POST /auth/register', () => {
    test('creates a hashed user record and returns 201', async () => {
        findUserByEmail.mockResolvedValue(null);
        bcrypt.hash.mockResolvedValue('hashed_password');
        createUser.mockResolvedValue();

        const res = await request(app).post('/auth/register').send({
            email: 'test@test.com',
            username: 'testuser',
            password: 'password123',
        });

        expect(res.status).toBe(201);
        expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
        expect(createUser).toHaveBeenCalledWith('test@test.com', 'testuser', 'hashed_password');
    });

    test('returns 409 when email already exists', async () => {
        findUserByEmail.mockResolvedValue({ user_id: '123', email: 'test@test.com' });

        const res = await request(app).post('/auth/register').send({
            email: 'test@test.com',
            username: 'testuser',
            password: 'password123',
        });

        expect(res.status).toBe(409);
        expect(createUser).not.toHaveBeenCalled();
    });

    test('returns 400 when fields are missing', async () => {
        const res = await request(app).post('/auth/register').send({
            email: 'test@test.com',
        });

        expect(res.status).toBe(400);
    });
});

describe('POST /auth/login', () => {
    test('returns JWT on correct credentials', async () => {
        findUserByEmail.mockResolvedValue({
            user_id: 'abc-123',
            email: 'test@test.com',
            password_hash: 'hashed_password',
        });
        bcrypt.compare.mockResolvedValue(true);
        jwt.sign.mockReturnValue('signed_token');

        const res = await request(app).post('/auth/login').send({
            email: 'test@test.com',
            password: 'password123',
        });

        expect(res.status).toBe(200);
        expect(res.body.token).toBe('signed_token');
        expect(jwt.sign).toHaveBeenCalledWith(
            { userId: 'abc-123', email: 'test@test.com' },
            'test_secret',
            { expiresIn: '8h' }
        );
    });

    test('returns 401 on wrong password', async () => {
        findUserByEmail.mockResolvedValue({
            user_id: 'abc-123',
            email: 'test@test.com',
            password_hash: 'hashed_password',
        });
        bcrypt.compare.mockResolvedValue(false);

        const res = await request(app).post('/auth/login').send({
            email: 'test@test.com',
            password: 'wrongpassword',
        });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid credentials');
    });

    test('returns 401 when user does not exist', async () => {
        findUserByEmail.mockResolvedValue(null);

        const res = await request(app).post('/auth/login').send({
            email: 'nobody@test.com',
            password: 'password123',
        });

        expect(res.status).toBe(401);
    });
});

describe('GET /auth/validate', () => {
    test('returns 200 and X-User-ID header on valid token', async () => {
        jwt.verify.mockReturnValue({ userId: 'abc-123', email: 'test@test.com' });

        const res = await request(app)
            .get('/auth/validate')
            .set('Authorization', 'Bearer valid_token');

        expect(res.status).toBe(200);
        expect(res.headers['x-user-id']).toBe('abc-123');
    });

    test('returns 401 on expired or malformed token', async () => {
        jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

        const res = await request(app)
            .get('/auth/validate')
            .set('Authorization', 'Bearer bad_token');

        expect(res.status).toBe(401);
    });

    test('returns 401 when Authorization header is missing', async () => {
        const res = await request(app).get('/auth/validate');

        expect(res.status).toBe(401);
    });
});