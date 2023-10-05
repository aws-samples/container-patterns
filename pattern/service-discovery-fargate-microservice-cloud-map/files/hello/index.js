var os = require('os');
const HOSTNAME = os.hostname();

const PORT = process.env.PORT || 3000;
const NAME_SERVER = process.env.NAME_SERVER;

if (!NAME_SERVER) {
  throw new Error('Expected environment variable NAME_SERVER');
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const randomNameResponse = await fetch(NAME_SERVER);
    const randomName = await randomNameResponse.text();
    return new Response(`Hello (from ${HOSTNAME}) ${randomName}`)
  }
});

console.log(`Listening on http://localhost:${server.port} ...`);
