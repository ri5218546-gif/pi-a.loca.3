from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'pinaloca.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    )
    ''')
    conn.commit()
    conn.close()

app = Flask(__name__)
CORS(app)

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    if not email or not password:
        return jsonify({'success': False, 'message': 'Faltan datos'}), 400

    password_hash = generate_password_hash(password)
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('INSERT INTO users (email, password_hash) VALUES (?,?)', (email, password_hash))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Usuario creado'})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Ya existe una cuenta con ese correo'}), 409
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    if not email or not password:
        return jsonify({'success': False, 'message': 'Faltan datos'}), 400

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT password_hash FROM users WHERE email = ?', (email,))
    row = c.fetchone()
    conn.close()
    if not row:
        return jsonify({'success': False, 'message': 'Cuenta no encontrada'}), 404

    password_hash = row[0]
    if check_password_hash(password_hash, password):
        return jsonify({'success': True, 'message': 'Autenticado'})
    else:
        return jsonify({'success': False, 'message': 'Contraseña incorrecta'}), 401

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
