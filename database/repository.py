import sqlite3
from pathlib import Path
from flask import current_app, g
from datetime import datetime, timezone


def now():
    return datetime.now(timezone.utc).isoformat()


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(current_app.config['DATABASE'], timeout=10)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys=ON')
        # Serialize the availability check and session insert across requests.
        g.db.execute('BEGIN IMMEDIATE')
    return g.db


def init_db(app):
    Path(app.config['DATABASE']).parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(app.config['DATABASE']) as db:
        db.executescript(Path(__file__).with_name('schema.sql').read_text())
        for slot in (1, 2):
            db.execute('INSERT OR IGNORE INTO compartment(compartment_id,updated_at) VALUES (?,?)', (slot, now()))

    @app.after_request
    def finish(response):
        db = g.get('db')
        if db:
            db.commit() if response.status_code < 400 else db.rollback()
        if response.content_type.startswith('application/json'):
            response.headers['Cache-Control'] = 'no-store'
        return response

    @app.teardown_appcontext
    def close(error):
        db = g.pop('db', None)
        if db:
            db.close()
