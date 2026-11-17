"""뽀송연구회 Flask 개발 서버."""
from flask import Flask, render_template
from api.routes import api


def create_app():
    app = Flask(__name__)
    app.json.ensure_ascii = False
    app.register_blueprint(api, url_prefix='/api')

    @app.get('/')
    def index():
        return render_template('index.html')

    return app


if __name__ == '__main__':
    create_app().run(host='0.0.0.0', port=5000, debug=False)
