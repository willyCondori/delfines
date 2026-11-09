from urllib.parse import urlsplit
import json
from .context import ROOT, STYLE_KEYS

def read_config():
    path = ROOT / 'data' / 'site-settings.json'
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'version': 1, 'revision': 0, 'pages': {}}

def write_config(config):
    data = json.dumps(config, ensure_ascii=False, indent=2)
    for path, text in [(ROOT / 'data' / 'site-settings.json', data), (ROOT / 'scripts' / 'editor' / 'settings.js', 'window.DELFINES_SITE_SETTINGS = ' + data.replace('<', '\\u003c') + ';\n')]:
        temporary = path.with_suffix(path.suffix + '.tmp')
        temporary.write_text(text, encoding='utf-8')
        temporary.replace(path)

def validate_config(value):
    if not isinstance(value, dict) or not isinstance(value.get('pages'), dict):
        raise ValueError('Formato de configuración inválido.')
    valid_pages = {p.name for p in ROOT.rglob('*.html') if p.name != 'admin.html'} | {'*'}
    cleaned = {'version': 1, 'pages': {}}
    total = 0
    for page, records in value['pages'].items():
        if page not in valid_pages or not isinstance(records, dict):
            raise ValueError('Página no válida.')
        cleaned['pages'][page] = {}
        for selector, record in records.items():
            total += 1
            if total > 3000 or not isinstance(selector, str) or len(selector) > 1500 or (not isinstance(record, dict)):
                raise ValueError('Demasiados elementos o selector inválido.')
            output = {}
            if 'editorLocked' in record:
                if not isinstance(record['editorLocked'], bool):
                    raise ValueError('Bloqueo del componente no válido.')
                output['editorLocked'] = record['editorLocked']
            if 'component' in record:
                import re
                component = record['component']
                if (not re.fullmatch(r'#editor-component-[a-z0-9-]+', selector) or
                        not isinstance(component, dict) or component.get('tag') not in ('p', 'h2', 'img', 'a', 'div', 'section')):
                    raise ValueError('Componente no permitido.')
                parent = component.get('parent', 'main')
                if not isinstance(parent, str) or len(parent) > 1500 or any(c in parent for c in '<>{}'):
                    raise ValueError('Contenedor no válido.')
                output['component'] = {'tag': component['tag'], 'parent': parent}
            if 'animationTrigger' in record:
                if record['animationTrigger'] not in ('load', 'hover', 'click'):
                    raise ValueError('Activación de animación inválida.')
                output['animationTrigger'] = record['animationTrigger']
            if 'carousel' in record:
                import re
                carousel = record['carousel']
                if not re.fullmatch(r'#editor-carousel-[a-z0-9-]+', selector) or not isinstance(carousel, dict):
                    raise ValueError('Carrusel inválido.')
                slides = carousel.get('slides')
                if not isinstance(slides, list) or not 2 <= len(slides) <= 20:
                    raise ValueError('El carrusel necesita de 2 a 20 imágenes.')
                clean_slides = []
                for slide in slides:
                    if not isinstance(slide, dict):
                        raise ValueError('Imagen de carrusel inválida.')
                    src = slide.get('src', '')
                    if (not isinstance(src, str) or not src or len(src) > 2000 or src.startswith('//')
                            or '\\' in src or any(ord(c) < 32 for c in src)
                            or urlsplit(src).scheme not in ('', 'https', 'http')):
                        raise ValueError('Ruta de imagen no permitida.')
                    clean_slides.append({'src': src, 'caption': str(slide.get('caption', ''))[:500]})
                interval = carousel.get('interval', 5)
                if not isinstance(interval, (int, float)) or not 2 <= interval <= 30:
                    raise ValueError('El intervalo debe estar entre 2 y 30 segundos.')
                output['carousel'] = {'title': str(carousel.get('title', ''))[:200],
                    'after': str(carousel.get('after', ''))[:1000], 'target': str(carousel.get('target', ''))[:1500], 'slides': clean_slides,
                    'autoplay': carousel.get('autoplay') is True, 'interval': interval}
            if isinstance(record.get('label'), str):
                output['label'] = record['label'][:180]
            if isinstance(record.get('styles'), dict):
                output['styles'] = {}
                for key, style in record['styles'].items():
                    if key not in STYLE_KEYS or not isinstance(style, str) or len(style) > 500 or any((x in style.lower() for x in ['url(', 'expression', 'javascript:', '@import', '<', '>', '{', '}'])):
                        raise ValueError('Estilo no permitido.')
                    output['styles'][key] = style
            for key in ['text', 'alt', 'src', 'href']:
                if key in record:
                    if not isinstance(record[key], str) or len(record[key]) > 15000:
                        raise ValueError('Contenido demasiado largo.')
                    text = record[key]
                    if key in ['href', 'src']:
                        parsed = urlsplit(text)
                        if parsed.scheme and parsed.scheme not in (['http', 'https'] if key == 'src' else ['http', 'https', 'mailto', 'tel']):
                            raise ValueError('Enlace no permitido.')
                        if text.startswith('//') or '\\' in text or any(ord(c) < 32 or ord(c) == 127 for c in text):
                            raise ValueError('Ruta no permitida.')
                    output[key] = text
            cleaned['pages'][page][selector] = output
    return cleaned
