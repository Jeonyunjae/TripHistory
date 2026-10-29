# Builds index.html from src/template.html + data (python3 tools/build.py)
import os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s=open(f'{R}/src/template.html',encoding='utf-8').read()
d=open(f'{R}/src/data.json',encoding='utf-8').read().replace('</','<\\/')
g=open(f'{R}/src/globe.json',encoding='utf-8').read()
grid=open(f'{R}/geo/grid.txt').read(); coast=open(f'{R}/geo/coast.json').read()
html=s.replace('__DATA__',d).replace('__GLOBE__',g).replace('__GRID__',grid).replace('__COAST__',coast)
if not html.lstrip().lower().startswith('<!doctype'):
    html='<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#1F2A44"></head><body>\n'+html+'\n</body></html>'
open(f'{R}/index.html','w',encoding='utf-8').write(html); print('index.html built')
