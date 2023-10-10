var os = require('os');
const HOSTNAME = os.hostname();

const PORT = process.env.PORT || 3000;

const TOP_NAMES = [
  'Olivia',
  'Emma',
  'Charlotte',
  'Amelia',
  'Sophia',
  'Isabella',
  'Ava',
  'Mia',
  'Evelyn',
  'Luna',

  'Liam',
  'Noah',
  'Oliver',
  'James',
  'Elijah',
  'William',
  'Henry',
  'Lucas',
  'Benjamin',
  'Theodore'
]

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    var randomName = TOP_NAMES[Math.floor(Math.random() * TOP_NAMES.length)]
    return new Response(`${randomName} (from ${HOSTNAME})`)
  }
});

console.log(`Listening on http://localhost:${server.port} ...`);
