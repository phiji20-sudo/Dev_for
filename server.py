from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import os
import json

app = Flask(__name__, static_folder='.', static_url_path='')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
DATA_DIR = os.path.join(BASE_DIR, 'data')
STATE_FILE = os.path.join(DATA_DIR, 'state.json')
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

DEFAULT_STATE = {'galleryState': {'0': [], '1': [], '2': []}, 'heroImage': None}


def normalize_state(state):
    gallery = state.get('galleryState', {})
    if isinstance(gallery, dict):
        gallery = {str(key): value for key, value in gallery.items() if isinstance(value, list)}
    else:
        gallery = {}

    for index in ['0', '1', '2']:
        gallery.setdefault(index, [])

    state['galleryState'] = gallery
    state['heroImage'] = state.get('heroImage')
    return state


def load_state():
    legacy_state_file = os.path.join(BASE_DIR, 'data_state.json')
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
            if isinstance(loaded, dict):
                return normalize_state(loaded)
            return DEFAULT_STATE.copy()
        except Exception:
            return DEFAULT_STATE.copy()

    if os.path.exists(legacy_state_file):
        try:
            with open(legacy_state_file, 'r', encoding='utf-8') as f:
                legacy_state = json.load(f)
            if legacy_state:
                return legacy_state
        except Exception:
            pass

    return DEFAULT_STATE.copy()


STATE = load_state()


def save_state():
    try:
        normalize_state(STATE)
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(STATE, f, ensure_ascii=False, indent=2)
    except Exception as e:
        app.logger.error('Failed to save state: %s', e)


@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')


@app.route('/api/state', methods=['GET'])
def get_state():
    return jsonify(STATE)


@app.route('/api/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'no file'}), 400
    file = request.files['file']
    index = int(request.form.get('index', 0))
    filename = secure_filename(file.filename)
    save_name = filename
    base, ext = os.path.splitext(save_name)
    counter = 1
    while os.path.exists(os.path.join(UPLOAD_DIR, save_name)):
        save_name = f"{base}-{counter}{ext}"
        counter += 1

    path = os.path.join(UPLOAD_DIR, save_name)
    file.save(path)
    url = f"/uploads/{save_name}"

    STATE['galleryState'].setdefault(str(index), [])
    STATE['galleryState'][str(index)].append(url)
    save_state()

    return jsonify({'ok': True, 'url': url})


@app.route('/api/upload/hero', methods=['POST'])
def upload_hero():
    if 'file' not in request.files:
        return jsonify({'error': 'no file'}), 400

    file = request.files['file']
    filename = secure_filename(file.filename)
    save_name = filename
    base, ext = os.path.splitext(save_name)
    counter = 1
    while os.path.exists(os.path.join(UPLOAD_DIR, save_name)):
        save_name = f"{base}-{counter}{ext}"
        counter += 1

    path = os.path.join(UPLOAD_DIR, save_name)
    file.save(path)
    url = f"/uploads/{save_name}"
    STATE['heroImage'] = url
    save_state()

    return jsonify({'ok': True, 'url': url})


@app.route('/api/remove-image', methods=['POST'])
def remove_image():
    data = request.get_json(silent=True) or {}
    index = data.get('index')
    url = data.get('url')

    if not url:
        return jsonify({'error': 'invalid request'}), 400

    target_index = None
    if index is not None:
        index = str(index)
        if index in STATE['galleryState'] and url in STATE['galleryState'][index]:
            target_index = index

    if target_index is None:
        for idx, images in STATE['galleryState'].items():
            if url in images:
                target_index = idx
                break

    if target_index is None:
        return jsonify({'ok': True, 'removed': False}), 200

    STATE['galleryState'][target_index].remove(url)
    if url.startswith('/uploads/'):
        filename = url[len('/uploads/'):]
        upload_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(upload_path):
            try:
                os.remove(upload_path)
            except OSError:
                app.logger.warning('Unable to delete uploaded file: %s', upload_path)

    save_state()
    return jsonify({'ok': True})


@app.route('/music/<path:filename>')
def music_file(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'music'), filename)


@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
