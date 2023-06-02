var faker = require('faker');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const os = require('os');
const hostname = os.hostname();

app.get('*', function(req, res) {
  res.send(faker.name.firstName() + ` (${hostname})`);
});

app.listen(port, () => console.log(`Listening on port ${port}!`));

// This causes the process to respond to "docker stop" faster
process.on('SIGTERM', function() {
  console.log('Received SIGTERM, shutting down');
  app.close();
});
