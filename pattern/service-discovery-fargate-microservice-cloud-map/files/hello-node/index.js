import os from 'node:os';
import url from 'node:url';
import express from 'express';
import fetch from 'node-fetch';
import retry from 'async-retry';
import { Resolver } from 'node:dns/promises'
const resolver = new Resolver();

const HOSTNAME = os.hostname();

const PORT = process.env.PORT || 3000;
const NAME_SERVER = process.env.NAME_SERVER;

const NAME_URL = url.parse(NAME_SERVER);

if (!NAME_SERVER) {
  throw new Error('Expected environment variable NAME_SERVER');
}

const app = express()

// Logic for looking up the DNS based service discovery record
// and selecting a random record from it.
var dnsRecords;
var lastResolveTime = 0;
const TTL = 5000;
async function resolveNameService() {
  if (lastResolveTime < new Date().getTime() - TTL) {
    dnsRecords = await resolver.resolve(NAME_URL.hostname);
  }
  return dnsRecords[Math.floor(Math.random() * dnsRecords.length)]
}

app.get('/', async function (req, res) {
  // Just in case a downstream task crashes, we wrap this in a retry
  // that will retry against a different task if needed.
  const randomName = await retry(
    async function () {
      const randomIp = await resolveNameService();
      const randomNameResponse = await fetch(`http://${randomIp}:${NAME_URL.port}`);
      return await randomNameResponse.text();
    },
    {
      retries: 5
    }
  );

  res.send(`Hello (from ${HOSTNAME}) ${randomName}`)
})

app.listen(PORT)

console.log(`Listening on http://localhost:${PORT} fetch`);
