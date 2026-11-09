"""Páginas y biblioteca de imágenes administradas, sin HTML arbitrario."""
from pathlib import Path
import html
import re
from .context import ROOT


def list_pages():
    pages = []
    for path in [ROOT / 'index.html', *sorted((ROOT / 'pages').glob('*.html'))]:
        source = path.read_text(encoding='utf-8')
        match = re.search(r'<title>(.*?)</title>', source, re.S)
        pages.append({'file': path.name, 'title': 'Inicio' if path.name=='index.html' else html.unescape(match[1]).split('·')[0].strip() if match else path.stem,
                      'href': path.relative_to(ROOT).as_posix()})
    return pages


def list_media():
    return [{'src': path.relative_to(ROOT).as_posix(), 'name': path.name}
            for path in sorted((ROOT / 'assets').rglob('*'))
            if path.is_file() and not path.is_symlink() and path.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp')
            and path.resolve().is_relative_to(ROOT.resolve())][:1000]


def create_page(data):
    slug, title = data.get('slug', ''), data.get('title', '')
    if not isinstance(slug, str) or not re.fullmatch(r'[a-z][a-z0-9-]{1,60}', slug):
        raise ValueError('Usa una ruta de 2 a 61 letras minúsculas, números y guiones.')
    if not isinstance(title, str) or not 1 <= len(title.strip()) <= 100:
        raise ValueError('Escribe un título de hasta 100 caracteres.')
    destination = ROOT / 'pages' / (slug + '.html')
    if destination.exists():
        raise ValueError('Esa ruta ya existe. Elige otra.')
    source = (ROOT / 'pages' / 'servicios.html').read_text(encoding='utf-8')
    safe_title = html.escape(title.strip())
    source = re.sub(r'<title>.*?</title>', lambda _: '<title>'+safe_title+' · Delfines Apart Hotel</title>', source, count=1, flags=re.S)
    source = re.sub(r'<main\b[^>]*>.*?</main>', lambda _: '<main id="contenido"><section class="section wrap" aria-label="'+safe_title+'"><p class="eyebrow">Delfines Apart Hotel</p><h1>'+safe_title+'</h1><p>Personaliza esta página desde el editor.</p><img src="assets/hero.webp" alt="Delfines Apart Hotel" style="width:100%;max-width:960px;border-radius:24px"><p><a class="button navy" href="pages/contacto.html">Contáctanos</a></p></section></main>', source, count=1, flags=re.S)
    source = source.replace('href="#reserva"', 'href="pages/contacto.html"')
    source = re.sub(r' class="active" aria-current="page"', '', source)
    # Crear exclusivamente un archivo nuevo; nunca sobrescribir páginas existentes.
    with destination.open('x', encoding='utf-8') as file:
        file.write(source)
    if data.get('addToMenu') is True:
        link = '<a href="pages/'+slug+'.html">'+safe_title+'</a>'
        for path in [ROOT / 'index.html', *sorted((ROOT / 'pages').glob('*.html'))]:
            text = path.read_text(encoding='utf-8')
            text = re.sub(r'(<nav id="menu"[^>]*>)(.*?)(</nav>)', lambda m: m[1]+m[2]+link+m[3], text, count=1, flags=re.S)
            path.write_text(text, encoding='utf-8')
    return {'file': destination.name, 'title': title.strip(), 'href': 'pages/'+destination.name}
