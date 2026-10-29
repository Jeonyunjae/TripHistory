# Builds the static site (python3 tools/build.py):
#   index.html               home (trip list; live data comes from Notion via /api/trips)
#   <trip-key>/index.html    one page per trip that has data in trips/<trip-key>/
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(R, p), encoding='utf-8').read()

HEAD = ('<!doctype html>\n<html lang="ko"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">'
        '<meta name="theme-color" content="#1F2A44">{extra}</head><body>\n')
TAIL = '\n</body></html>'

def write(path, html):
    full = os.path.join(R, path)
    os.makedirs(os.path.dirname(full) or R, exist_ok=True)
    open(full, 'w', encoding='utf-8').write(html)
    print('built', path)

pages = json.loads(rd('src/trips.json'))

# home
static = [dict(id=p['notionId'], key=p.get('key'), color=p.get('color'), route=p.get('route'), **p['fallback']) for p in pages]
home = rd('src/home.html').replace('__TRIPS__', json.dumps(static, ensure_ascii=False).replace('</', '<\\/'))
write('index.html', HEAD.format(extra='') + home + TAIL)

# trip pages
tpl = rd('src/template.html')
globe = rd('src/globe.json')
for p in pages:
    key = p.get('key')
    if not key or not os.path.exists(os.path.join(R, 'trips', key, 'data.json')):
        continue
    geo = p.get('geo', key)
    html = (tpl.replace('__DATA__', rd(f'trips/{key}/data.json').replace('</', '<\\/'))
               .replace('__GLOBE__', globe)
               .replace('__GRID__', rd(f'geo/{geo}/grid.txt'))
               .replace('__COAST__', rd(f'geo/{geo}/coast.json')))
    write(f'{key}/index.html', HEAD.format(extra=f'<meta name="trip-key" content="{key}">') + html + TAIL)
