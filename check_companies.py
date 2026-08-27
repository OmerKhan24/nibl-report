import xmlrpc.client

url = 'https://nibl.odoo.com'
db = 'nibl'
username = 'saqib@niblfoods.com'
password = 'f439ae403991f5a73c3f805c243d9b55b7af07c9'

common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

companies = models.execute_kw(db, uid, password, 'res.company', 'search_read', [[]], {'fields': ['id', 'name']})
for c in companies:
    print(c)
