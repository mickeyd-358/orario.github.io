import calendar
import html
import secrets
import traceback
from collections import defaultdict
from datetime import datetime, timedelta

import regex as re
from flask import (Flask, jsonify, make_response, redirect, render_template,
                   request, session, url_for)
from flask_login import LoginManager, current_user, login_required, logout_user
from flask_wtf.csrf import CSRFError, CSRFProtect
from werkzeug.security import generate_password_hash

from extensions import db
from routes.auth import auth_bp
from routes.genai import genai_bp
from routes.pomodoro import pomodoro_bp
from routes.tasks import tasks_bp
from utils.utils import get_calendar_navigation

# Initialise Flask app
app = Flask(__name__)
csrf = CSRFProtect(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SECRET_KEY'] = secrets.token_urlsafe(32)    # generates a random cryptographically secure key
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)
app.config['SESSION_COOKIE_SECURE'] = True  # HTTPS only
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent XSS
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection

# Initialise database
db.init_app(app)

app.register_blueprint(auth_bp)
app.register_blueprint(tasks_bp)
app.register_blueprint(genai_bp)
app.register_blueprint(pomodoro_bp)

# Configure Flask-Login
login_manager = LoginManager(app)
login_manager.login_view = 'auth.login'

# Stops circular import
from models import Task, User


# Load user for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Home route
@app.route('/')
def home():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard')) # Send users back to dashboard if logged in
    return render_template('home.html')

# Custom error response
@app.errorhandler(CSRFError)
def handle_csrf_error(e):
    return render_template("404.html", error_message=e.description), 400

@app.errorhandler(404)
def page_not_found_error(e):
    return render_template("404.html", error_message=e.description), 404

# Register route
@app.route('/register/', methods=['POST', 'GET'])
def register():
    if request.method == 'POST':
        name = html.escape(request.form.get('name'))
        email = html.escape(request.form.get('email'))
        password = request.form.get('password')

        user = User.query.filter_by(email=email).first()

        if user:
            return jsonify({'success': False, 'error': 'Email address already exists'}), 400

        
        cleaned_name = name.lower().replace('\x00', '')

        # Use regex to remove any potential dangerous substrings
        dangerous_patterns = [r'onload', 
                            r'onerror', 
                            r'onclick', 
                            r'onmouseover', 
                            r'onfocus', 
                            r'javascript:', 
                            r'data:', 
                            r'<script>', 
                            r'</script>', 
                            r'style',]
        
        # Replace dangerous substrings with an empty string, case insensitive
        for pattern in dangerous_patterns:
            cleaned_name = re.sub(pattern, '', cleaned_name)

        if not email:
            return jsonify({'success': False, 'error': 'Must enter an email!'}), 400
        if not re.match(r"^[a-zA-Z0-9+!+#]+(?:[._-][a-zA-Z0-9+!+#]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$", email):
            return jsonify({'success': False, 'error': 'Invalid email format'}), 400

        if not password:
            return jsonify({'success': False, 'error': 'Password is required'}), 400

        if len(password) < 8 or len(password) > 64:
            return jsonify({'success': False, 'error': 'Password incorrect length'}), 400
        
        elif re.search(r"[a-z]", password) == None:
            return jsonify({'success': False, 'error': 'Password must contain a lowercase letter'}), 400
        
        elif re.search(r"[A-Z]", password) == None:
            return jsonify({'success': False, 'error': 'Password must contain a capital letter'}), 400
        
        elif re.search(r"[0-9]", password) == None:
            return jsonify({'success': False, 'error': 'Password must contain a digit'}), 400
        
        elif re.search(r"[!@#\-_=+.\$%\^&\*]", password) == None:
            return jsonify({'success': False, 'error': 'Password must contain a special character'}), 400

        sanitised_name = html.escape(cleaned_name)
        name_parts = sanitised_name.split()

        final_name = ''

        for name in name_parts:
            newname = name.capitalize()
            final_name += newname + ' '

        # Implement try / except to catch any database errors
        try:
            new_user = User(email=email, name=final_name.strip(), password=generate_password_hash(password), quote=None, study_time="00:00")
            db.session.add(new_user)
            db.session.commit()
            return jsonify({"success": True, "redirect": "/login"}), 200
        except Exception as e:
            db.session.rollback()
            traceback.print_exc()
            return jsonify({"success": False, "error": "An unexpected error occurred"}), 500

    return render_template("register.html")

@app.route('/dashboard')
@login_required
def dashboard():
    # Parse and Validate Arguments
    now = datetime.now()
    try:
        year = int(request.args.get("year", now.year))
        month = int(request.args.get("month", now.month))
        if not (1 <= month <= 12):
            raise ValueError
    except ValueError:
        return jsonify({"success": False, "error": "Invalid Arguments"}), 400

    prev_year, prev_month, next_year, next_month = get_calendar_navigation(year, month)
    
    # Query tasks for the month efficiently using filters
    monthly_tasks = current_user.tasks.filter(
        db.extract('year', Task.due_date) == year,
        db.extract('month', Task.due_date) == month
    ).order_by(Task.due_date.asc()).all()

    #group tasks by day
    tasks_by_day = defaultdict(list)
    for task in monthly_tasks:
        tasks_by_day[task.due_date.day].append(task)
    
    first_name = current_user.name.split()[0]
    
    return render_template(
        'dashboard.html',
        user_quote=current_user.quote,
        name=first_name,
        year=year,
        month=month,
        calendar=calendar.Calendar().monthdayscalendar(year, month),
        month_name=calendar.month_name[month],
        prev_year=prev_year,
        prev_month=prev_month,
        next_year=next_year,
        next_month=next_month,
        today=now.day,
        current_month=now.month,
        current_year=now.year,
        tasks=monthly_tasks,
        tasks_by_day=dict(tasks_by_day)
    )

@app.route('/api/update_quote', methods=['POST'])
@login_required
def update_quote():
    data = request.get_json()
    
    if not data or 'quote' not in data:
        return jsonify({'success': False, 'error': 'Invalid quote details'}), 400

    current_user.quote = data['quote']
    db.session.commit()

    return jsonify({'status': 'success'}), 200

@app.route('/flashcards')
@login_required
def flashcards():
    return render_template('flashcards.html')

@app.route('/logout', methods=["POST"])
@login_required
def logout():
    logout_user()
    session.clear()
    
    response = make_response(jsonify({"success": True, "redirect": "/login"}))
    
    # Remove session token and remember token when user logs out
    response.set_cookie('remember_token', '', expires=0)
    response.set_cookie('session', '', expires=0)

    return response

if __name__ == "__main__":
    # Create the database tables when running the app directly
    with app.app_context():
        db.create_all()

    app.run(debug=True, ssl_context='adhoc')
