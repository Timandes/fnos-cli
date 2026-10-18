// A subprocess-only HTTP boundary fixture: the real CLI and SDK still execute.
const fs = require('node:fs');
const fixture = JSON.parse(fs.readFileSync(process.env.FNOS_TEST_OAUTH_FIXTURE, 'utf8'));
if (fixture.tty) Object.defineProperty(process.stdin, 'isTTY', { value: true });
globalThis.fetch = async (url, init) => {
  const route = new URL(url).pathname;
  const request = { route, body: JSON.parse(init.body), authorization: new Headers(init.headers).get('authorization') };
  fs.appendFileSync(`${process.env.FNOS_TEST_OAUTH_FIXTURE}.requests`, JSON.stringify(request) + '\n');
  if (process.send) process.send({ route });
  const reply = fixture.responses[route];
  if (!reply) throw new Error(`Unexpected test route ${route}`);
  if (reply.error) throw new TypeError('fetch failed', { cause: Object.assign(new Error('fixture transport failure'), { code: reply.error }) });
  if (reply.delay) await new Promise(resolve => setTimeout(resolve, reply.delay));
  return new Response(JSON.stringify(reply.body), { status: reply.status || 200 });
};
