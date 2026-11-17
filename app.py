"""같은 Wi-Fi에서 시연하는 뽀송연구회 Flask 서버."""
import os
from pathlib import Path
from flask import Flask, render_template, request, jsonify
from werkzeug.exceptions import HTTPException
from werkzeug.security import generate_password_hash
from api.routes import api
from database.repository import init_db


def create_app(config=None):
    app = Flask(__name__)
    app.config.from_mapping(
        DATABASE=str(Path(app.instance_path) / 'bbosong.db'),
        TOKEN_TTL_SECONDS=1800,
        RESERVATION_TTL_SECONDS=600,
        MOCK_MODE=True,
        MAX_CONTENT_LENGTH=16384,
        ADMIN_PASSWORD_HASH=generate_password_hash(os.environ['ADMIN_PASSWORD']) if os.environ.get('ADMIN_PASSWORD') else None,
    )
    if config:
        app.config.update(config)
    app.json.ensure_ascii = False
    init_db(app)
    app.register_blueprint(api, url_prefix='/api')

    @app.errorhandler(HTTPException)
    def http_error(error):
        if request.path.startswith('/api/'):
            return jsonify(success=False, data=None, error={'code': error.name.upper().replace(' ', '_'), 'message': '요청 경로, 메서드 또는 데이터 크기를 확인해주세요.'}), error.code
        return error

    @app.get('/')
    def index():
        return render_template('index.html')

    return app


if __name__ == '__main__':
    create_app().run(host='0.0.0.0', port=5000, debug=False)
