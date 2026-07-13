import xmlrpc.client
import os

url = 'https://nibl.odoo.com'
db = 'nibl'
username = 'saqib@niblfoods.com'
password = 'f439ae403991f5a73c3f805c243d9b55b7af07c9'

common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(db, username, password, {})

models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

# 1. Journals
journals = models.execute_kw(db, uid, password, 'account.journal', 'search_read', [[]], {'fields': ['id', 'name', 'type'], 'limit': 20})
print('Journals:')
for j in journals:
    print(f"  - {j['id']}: {j['name']} ({j['type']})")

# 2. Payments
print('\nPayments (last 10 inbound):')
payments = models.execute_kw(db, uid, password, 'account.payment', 'search_read', [[['payment_type', '=', 'inbound'], ['state', '=', 'posted']]], {'fields': ['name', 'amount', 'date', 'partner_id', 'journal_id', 'payment_type'], 'limit': 10})
for p in payments:
    print(f"  - {p['date']} | {p['name']} | {p.get('partner_id')} | Journal: {p.get('journal_id')} | Amount: {p['amount']}")
