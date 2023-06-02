const axios = require('axios');
const express = require('express');
const app = express();
const port = process.env.PORT || 80;

const metadataUrl = `${process.env.ECS_CONTAINER_METADATA_URI_V4}/task`;

app.get('*', async function (req, res) {
  const metadataResponse = await axios.get(metadataUrl);
  const formattedResponse = JSON.stringify(metadataResponse.data, null, 2)
  res.send(`<pre>
  Running on: ${metadataResponse.data.LaunchType}
  DNS: ${metadataResponse.data.Containers[0].Networks[0].PrivateDNSName}
  AvailabilityZone: ${metadataResponse.data.AvailabilityZone}
  </pre>
  <br />
  <br />
  <pre style='height: 400px; overflow: scroll'>${formattedResponse}</pre>`);
});

app.listen(port, () => console.log(`Listening on port ${port}!`));

// This causes the process to respond to "docker stop" faster
process.on('SIGTERM', function () {
  console.log('Received SIGTERM, shutting down');
  app.close();
});
