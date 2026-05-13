const express = require('express');
const authRouter = require('./authservice');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use('/auth', authRouter);

app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
});