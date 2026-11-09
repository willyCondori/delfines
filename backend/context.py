from pathlib import Path
import threading

ROOT = Path(__file__).resolve().parent.parent
LOCK = threading.RLock()
SESSIONS = {}
ATTEMPTS = {}
STATE = None
CREDENTIALS = {}
STYLE_KEYS = {'font-size', 'font-family', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'color', 'background-color', 'background-image', 'border-radius', 'border-width', 'border-style', 'border-color', 'padding', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'width', 'height', 'max-width', 'object-fit', 'object-position', 'transform', 'translate', 'opacity', 'box-shadow', 'zoom', 'min-width', 'min-height', 'max-height', 'box-sizing', 'flex-shrink', 'animation-name', 'animation-duration', 'animation-delay', 'animation-iteration-count', 'animation-timing-function', 'animation-fill-mode', 'background-clip', '-webkit-background-clip', '-webkit-text-fill-color', 'display', 'rotate', 'gap', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'grid-template-columns', 'order'}
ALLOWED_EXT = {'.html', '.css', '.js', '.json', '.jpg', '.jpeg', '.png', '.webp', '.ico', '.woff2', '.woff', '.ttf', '.txt', '.md', '.svg'}
