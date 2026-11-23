import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import db from './utils/db.js';
import app from './app.js';

if (typeof process !== 'undefined' && process.env && !process.env.CLOUDFLARE_WORKERS) {
  process.env.CLOUDFLARE_WORKERS = '1';
}

db.setHyperdriveResolver(() => {
  const binding = env?.HYPERDRIVE;
  return binding && typeof binding.connectionString === 'string' && binding.connectionString.trim()
    ? binding.connectionString.trim()
    : null;
});

app.listen(3000);

export default httpServerHandler({ port: 3000 });
