# put all authentication routes
from flask import Blueprint, jsonify, render_template, request
from flask_login import login_user
from werkzeug.security import check_password_hash

from models import User

auth_bp = Blueprint("auth", __name__)

# Login route
@auth_bp.route('/login', methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get('email')
        password = request.form.get('password')
        remember = True if request.form.get('remember') else False

        existing_user = User.query.filter_by(email=email).first()

        if not existing_user or not check_password_hash(existing_user.password, password):
            return jsonify({'success': False, 'error': 'Invalid login details'}), 400
        
        login_user(existing_user, remember=remember)
        return jsonify({"success": True, "redirect": "/dashboard"}), 200
    
    return render_template("login.html")