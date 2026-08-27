import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import xmlrpc from 'xmlrpc';

const ODOO_URL  = 'https://nibl.odoo.com';
const ODOO_DB   = 'nibl';
const ODOO_USER = 'saqib@niblfoods.com';
const ODOO_KEY  = 'f439ae403991f5a73c3f805c243d9b55b7af07c9';

function makeClient(path) {
  const u = new URL(ODOO_URL);
  const secure = u.protocol === 'https:';
  const port   = u.port ? parseInt(u.port) : (secure ? 443 : 80);
  const create = secure ? xmlrpc.createSecureClient : xmlrpc.createClient;
  return create({ host: u.hostname, port, path });
}

async function getUid() {
  const client = makeClient('/xmlrpc/2/common');
  return new Promise((resolve, reject) => {
    client.methodCall(
      'authenticate',
      [ODOO_DB, ODOO_USER, ODOO_KEY, {}],
      (err, uid) => {
        if (err) return reject(err);
        resolve(uid);
      }
    );
  });
}

async function odooQuery(model, method, args = [[]], kwargs = {}) {
  const uid = await getUid();
  const client = makeClient('/xmlrpc/2/object');
  return new Promise((resolve, reject) => {
    client.methodCall(
      'execute_kw',
      [ODOO_DB, uid, ODOO_KEY, model, method, args, kwargs],
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
}

async function test() {
  try {
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const fromStr = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
    const toStr = format(endOfMonth(lastMonth), 'yyyy-MM-dd');

    const domain = [
      ['state', 'in', ['sale', 'done']],
      ['date', '>=', `${fromStr} 00:00:00`],
      ['date', '<=', `${toStr} 23:59:59`]
    ];

    console.log("Domain:", domain);

    const reports = await odooQuery('sale.report', 'search_read', [domain], {
      fields: ['product_id', 'product_uom_qty'],
      limit: 5000
    });

    console.log("Reports fetched:", reports.length);

    const salesMap = new Map();
    for (const r of reports) {
      if (!r.product_id) continue;
      const pid = r.product_id[0];
      const pname = r.product_id[1];
      const qty = r.product_uom_qty || 0;
      
      const existing = salesMap.get(pid);
      if (existing) {
        existing.qtySold += qty;
      } else {
        salesMap.set(pid, { name: pname, qtySold: qty });
      }
    }

    const pids = Array.from(salesMap.keys());
    console.log("Pids:", pids.length);

    const products = await odooQuery('product.product', 'search_read', [[['id', 'in', pids]]], {
      fields: ['name', 'qty_available', 'type'],
      limit: 5000
    });

    console.log("Products fetched:", products.length);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
