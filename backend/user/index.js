const express = require('express');
const userRouter = require('./userservice');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use('/users', userRouter);

app.listen(PORT, () => {
    console.log(`User service running on port ${PORT}`);
});