// Express web server for an API
const express = require('express');
const app = express();
const port = 3000;

// Healthcheck endpoint
app.get('/', (req, res) => {
  res.send('Hello World!');
})

// Get user by ID endpoint
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  res.send(`User ${userId} found!`);
})

// Get user by username endpoint
app.get('/api/users/by/username/:username', (req, res) => {
  const username = req.params.username;
  res.send(`User ${username} found!`);
})

app.listen(port, () => {
  console.log(`Running on port ${port}...\n`);
})