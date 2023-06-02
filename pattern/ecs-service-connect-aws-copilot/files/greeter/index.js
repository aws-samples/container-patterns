const axios = require('axios');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const GREETING_URL = process.env.GREETING_URL;
const NAME_URL = process.env.NAME_URL;

const os = require('os');
const hostname = os.hostname();

if (!GREETING_URL) {
  throw new Error('Process requires that environment variable GREETING_URL be passed');
}

if (!NAME_URL) {
  throw new Error('Process requires that environment variable NAME_URL be passed');
}

app.get('*', async function (req, res) {
  const greeting = await axios.get(GREETING_URL);
  const name = await axios.get(NAME_URL)

  res.send(`From ${hostname}: ${greeting.data} ${name.data}`);
});

app.listen(port, () => console.log(`Listening on port ${port}!`));

// This causes the process to respond to "docker stop" faster
process.on('SIGTERM', function () {
  console.log('Received SIGTERM, shutting down');
  app.close();
});
