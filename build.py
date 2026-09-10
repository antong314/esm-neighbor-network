#!/usr/bin/env python3
"""Build the site: wraps each pages/*.html partial in the shared layout and writes _site/.
Usage: python3 build.py   (then: python3 -m http.server -d _site 8765)"""
import re, pathlib, html, shutil, json
ROOT=pathlib.Path(__file__).parent; PAGES=ROOT/"pages"; OUT=ROOT/"_site"; ASSETS=ROOT/"assets"
CFG=json.loads((ROOT/"site.config.json").read_text())
NAV=[("index.html","Home"),("culture.html","Culture"),("gatherings.html","Gatherings"),("governance.html","Governance"),
     ("building.html","Building"),("projects.html","Projects"),("calendar.html","Calendar"),("resources.html","Resources")]
ICONS=(ROOT/"assets"/"icons.svg").read_text()
def layout(fname, title, desc, body):
    nav="".join(f'<li><a href="{f}"{" class=\"active\"" if f==fname else ""}>{t}</a></li>' for f,t in NAV)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} · Ecovilla San Mateo Neighbor Network</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="icon" href="img/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
</head>
<body data-page="{fname[:-5]}" data-edit-api="{CFG.get("editApi","")}" data-repo="{CFG.get("repo","")}">
{ICONS}
<a class="skip" href="#main">Skip to content</a>
<div class="topbar"><div class="wrap"><span>Ecovilla San Mateo · Machuca Valley · Costa Rica</span><a href="https://sites.google.com/view/esmneighbornetwork-es/inicio" target="_blank" rel="noopener"><svg class="i"><use href="#i-lang"/></svg> Ver en Español</a></div></div>
<header class="site"><div class="wrap">
<a class="brand" href="index.html"><img src="img/logo.png" alt="Ecovilla San Mateo"><span>Neighbor Network<small>Ecovilla San Mateo</small></span></a>
<button class="nav-toggle" aria-expanded="false" aria-controls="mainnav"><svg class="i"><use href="#i-menu"/></svg> Menu</button>
<nav class="main" id="mainnav" aria-label="Main"><ul>{nav}</ul></nav>
</div></header>
<main id="main">
{body}
</main>
<footer class="site"><div class="wrap">
<div class="cols">
<div><h4>Ecovilla San Mateo · Neighbor Network</h4><p>A shared home for the information neighbors need: our culture, how we govern ourselves, building on your lot, and what's happening in the community.</p>
<p><a href="https://sites.google.com/view/esmneighbornetwork-es/inicio" target="_blank" rel="noopener">Sitio en Español</a></p></div>
<div><h4>Explore</h4><ul><li><a href="culture.html">Our culture</a></li><li><a href="gatherings.html">Gatherings</a></li><li><a href="governance.html">Governance</a></li><li><a href="dues.html">Dues &amp; budget</a></li><li><a href="building.html">Building at ESM</a></li><li><a href="projects.html">Projects</a></li></ul></div>
<div><h4>Quick links</h4><ul><li><a href="calendar.html">Community calendar</a></li><li><a href="https://notebooklm.google.com/notebook/78111856-e974-4859-91ad-813596b8d6be" target="_blank" rel="noopener">Ask the ESM Answerbot</a></li><li><a href="https://community-app-project.vercel.app/t/ecovilla-san-mateo/login" target="_blank" rel="noopener">Rio community app</a></li><li><a href="https://www.loomio.com/ecovilla-san-mateo/" target="_blank" rel="noopener">Loomio (voting)</a></li><li><a href="resources.html#library">Document library</a></li></ul></div>
<div><h4>Contact</h4><ul><li>Condo administration:<br><a href="mailto:esmadmin@laecovilla.com">esmadmin@laecovilla.com</a></li><li>Maintenance requests:<br><a href="mailto:warner@laecovilla.com">warner@laecovilla.com</a></li><li>Community calendar:<br><a href="mailto:ecovillasanmateocr@gmail.com">ecovillasanmateocr@gmail.com</a></li></ul></div>
</div>
<div class="fine">This site is edited by neighbors — use the <strong>Edit this page</strong> button to fix or add anything. Every change is saved with its history and can be restored. Documents open in Google Drive; some may require access.</div>
</div></footer>
<script src="js/main.js"></script>
<script src="js/edit.js" defer></script>
</body></html>'''
if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir()
for d in ("css","js","img"): shutil.copytree(ASSETS/d, OUT/d)
(OUT/".nojekyll").write_text("")
for p in sorted(PAGES.glob("*.html")):
    src=p.read_text()
    m=re.match(r'<!--\s*title:(.*?)\|\s*desc:(.*?)-->\s*',src,re.S)
    title,desc=(m.group(1).strip(),m.group(2).strip()) if m else (p.stem,"")
    body=src[m.end():] if m else src
    (OUT/p.name).write_text(layout(p.name,title,desc,body))
    print("built",p.name)
