/**
 * Server-only Odoo XML-RPC helper
 * Called from Next.js API routes only — never exposed to client
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
const xmlrpc = require('xmlrpc');

const ODOO_URL  = process.env.ODOO_URL       || 'https://nibl.odoo.com';
const ODOO_DB   = process.env.ODOO_DB        || 'nibl';
const ODOO_USER = process.env.ODOO_USERNAME  || '';
const ODOO_KEY  = process.env.ODOO_API_KEY   || '';

function makeClient(path: string): any {
  const u = new URL(ODOO_URL);
  const secure = u.protocol === 'https:';
  const port   = u.port ? parseInt(u.port) : (secure ? 443 : 80);
  const create = secure ? xmlrpc.createSecureClient : xmlrpc.createClient;
  return create({ host: u.hostname, port, path });
}

let _uid: number | null = null;

async function getUid(): Promise<number> {
  if (_uid) return _uid;
  const client = makeClient('/xmlrpc/2/common');
  return new Promise((resolve, reject) => {
    client.methodCall(
      'authenticate',
      [ODOO_DB, ODOO_USER, ODOO_KEY, {}],
      (err: Error | null, uid: number) => {
        if (err) return reject(err);
        if (!uid) return reject(new Error('Odoo auth failed — check ODOO_USERNAME and ODOO_API_KEY'));
        _uid = uid;
        resolve(uid);
      }
    );
  });
}

export async function odooQuery<T>(
  model: string,
  method: string,
  args: unknown[] = [[]],
  kwargs: Record<string, unknown> = {}
): Promise<T> {
  const uid    = await getUid();
  const client = makeClient('/xmlrpc/2/object');
  return new Promise((resolve, reject) => {
    client.methodCall(
      'execute_kw',
      [ODOO_DB, uid, ODOO_KEY, model, method, args, kwargs],
      (err: Error | null, result: T) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
}
