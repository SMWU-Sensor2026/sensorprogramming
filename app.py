"""같은 Wi-Fi에서 시연하는 뽀송연구회 Flask 서버."""
import os
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.exceptions import HTTPException
from werkzeug.security import generate_password_hash
from api.routes import api
from database.repository import init_db
from hardware.backend import load_driver


def create_app(config=None):
    app = Flask(__name__)
    app.config.from_mapping(
        DATABASE=str(Path(app.instance_path) / 'bbosong.db'),
        TOKEN_TTL_SECONDS=1800,
        RESERVATION_TTL_SECONDS=600,
        DEMO_MODE=os.environ.get('DEMO_MODE', '1') == '1',
        MAX_CONTENT_LENGTH=16384,
        FRONTEND_DIST=str(Path(__file__).resolve().parent / 'frontend' / 'dist'),
        ADMIN_PASSWORD_HASH=generate_password_hash(os.environ['ADMIN_PASSWORD']) if os.environ.get('ADMIN_PASSWORD') else None,
    )
    if config:
        app.config.update(config)
    app.extensions['hardware'] = app.config.get('HARDWARE_DRIVER') or load_driver()
    app.config['MOCK_MODE'] = app.extensions['hardware'].is_mock
    if not app.config['MOCK_MODE']:
        app.config['DEMO_MODE'] = False
    app.json.ensure_ascii = False
    init_db(app)
    app.register_blueprint(api, url_prefix='/api')

    @app.errorhandler(HTTPException)
    def http_error(error):
        if request.path.startswith('/api/'):
            return jsonify(success=False, data=None, error={'code': error.name.upper().replace(' ', '_'), 'message': '요청 경로, 메서드 또는 데이터 크기를 확인해주세요.'}), error.code
        return error

    @app.get('/')
    @app.get('/admin')
    def index():
        dist = Path(app.config['FRONTEND_DIST'])
        if not (dist / 'index.html').is_file():
            return 'React 화면을 먼저 빌드해주세요: cd frontend && npm ci && npm run build', 503
        response = send_from_directory(dist, 'index.html')
        response.headers['Cache-Control'] = 'no-cache'
        return response

    @app.get('/assets/<path:filename>')
    def frontend_asset(filename):
        return send_from_directory(Path(app.config['FRONTEND_DIST']) / 'assets', filename)

    return app


if __name__ == '__main__':
    create_app().run(host='0.0.0.0', port=5000, debug=False)
