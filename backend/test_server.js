require('dotenv').config();
const express = require('express');
const db = require('./config/database');

const app = express();
const PORT = 3002;

app.get('/', (req, res) => {
    res.send('Hello World');
});

async function start() {
    try {
        console.log('Initializing DB...');
        await db.initialize();
        console.log('DB Initialized.');
        app.listen(PORT, () => {
            console.log('Test server running on ' + PORT);
        });
    } catch (err) {
        console.error('Failed to start:', err);
    }
}

start();
