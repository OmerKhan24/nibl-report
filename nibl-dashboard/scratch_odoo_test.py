import xmlrpc.client

url = 'https://nibl.odoo.com'
db = 'nibl'
username = 'saqib@niblfoods.com'
password = 'f439ae403991f5a73c3f805c243d9b55b7af07c9'

common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

domain = [['payment_type', '=', 'inbound'], ['state', 'in', ['posted', 'paid', 'reconciled']]]
domain.append(['date', '>=', '2026-01-01'])
domain.append(['date', '<=', '2026-07-13'])

payments = models.execute_kw(db, uid, password, 'account.payment', 'search_read', [domain], {'fields': ['name', 'amount', 'date', 'partner_id', 'journal_id', 'payment_type'], 'limit': 5000})

b2c_total = 0
b2c_count = 0
faysal_khi = 0
faysal_khi_count = 0
faysal_isb = 0
faysal_isb_count = 0
dubai_khi = 0
dubai_khi_count = 0
dubai_isb = 0
dubai_isb_count = 0
cash_khi = 0
cash_khi_count = 0
cash_isb = 0
cash_isb_count = 0

for p in payments:
    if not p.get('journal_id'): continue
    jid = p['journal_id'][0]
    amt = p['amount']
    pname = p['partner_id'][1].lower() if p.get('partner_id') else ''
    
    # isB2C
    is_b2c = any(x in pname for x in ['trax', 'payfast', 'pay fast', 'postex', 'shopify'])
    if is_b2c:
        b2c_total += amt
        b2c_count += 1
        continue
        
    # inferCity
    pname_upper = pname.upper()
    city = 'Other'
    if any(x in pname_upper for x in ['KHI', 'KARACHI', 'DHA', 'CLIFTON', 'GULSHAN', 'TARIQ ROAD', 'BAHADURABAD']):
        city = 'Karachi'
    elif any(x in pname_upper for x in ['ISB', 'ISLAMABAD', 'ISL', 'G-10', 'F-7', 'BLUE AREA', 'JINNAH SUPER', 'F-11', 'G-9']):
        city = 'Islamabad'
        
    if jid == 19:
        if city == 'Islamabad': faysal_isb += amt
        else: faysal_khi += amt
    elif jid == 16:
        if city == 'Islamabad': dubai_isb += amt
        else: dubai_khi += amt
    elif jid == 17:
        cash_khi += amt
    elif jid == 18:
        cash_isb += amt

print(f"Total payments fetched: {len(payments)}")
print(f"B2C: {b2c_total}")
print(f"Faysal (KHI): {faysal_khi}")
print(f"Faysal (ISB): {faysal_isb}")
print(f"Dubai (KHI): {dubai_khi}")
print(f"Dubai (ISB): {dubai_isb}")
print(f"Cash (KHI): {cash_khi}")
print(f"Cash (ISB): {cash_isb}")
