import html
from datetime import datetime, date

from flask import Blueprint, jsonify, request, url_for
from flask_login import current_user, login_required

from extensions import db
from models import Task

tasks_bp = Blueprint("tasks", __name__)


@tasks_bp.route('/api/get_tasks')
@login_required
def get_tasks():
    user_tasks = (
        Task.query
        .filter_by(user_id=current_user.id)
        .order_by(Task.due_date.asc())
        .all()
    )

    tasks = [task.to_dict() for task in user_tasks]
    today = date.today()
    pending = 0
    num_overdue = 0

    for task in user_tasks:
        if task.due_date and task.due_date < today and not task.is_complete:
            num_overdue += 1

        if not task.is_complete:
            pending += 1

    total_tasks = len(tasks)

    if total_tasks == 0:
        completion_rate = 0
    else:
        completion_rate = round(((total_tasks - pending) / total_tasks) * 100, 1)
        print(round(((total_tasks - pending) / total_tasks) * 100, 1))
    return jsonify({
        "success": True,
        "tasks": tasks,
        "pending": pending,
        "num_overdue": num_overdue,
        "completion_rate": completion_rate
    }), 200

@tasks_bp.route('/api/add_task', methods=['POST'])
@login_required
def add_task():
    title = html.escape(request.form.get('title', '').strip())
    description = html.escape(request.form.get('description', '').strip())
    due_date = request.form.get('due_date')
    reminder = True if request.form.get('reminder') else False
    print(reminder)

    if not title or not due_date:
        return jsonify({"success": False, "error": "Title and Date are required"}), 400

    if len(title) > 50:
        return jsonify({"success": False, "error": "Title is too long"}), 400
    
    if len(description) > 100:
        return jsonify({"success": False, "error": "Description is too long"}), 400

    try:
        valid_date = datetime.strptime(due_date, '%Y-%m-%d').date()
        new_task = Task(
            title=title,
            description=description,
            due_date=valid_date,
            reminder=reminder,
            is_complete=False,
            user_id=current_user.id
        )
        db.session.add(new_task)
        db.session.commit()
        return jsonify({"success": True, "redirect": url_for('dashboard')}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": "Database error"}), 500

@tasks_bp.route('/api/edit_task/<int:task_id>', methods=['POST'])
@login_required
def edit_task(task_id):

    data = request.form

    task = db.session.get(Task, task_id)

    if not task or task.user_id != current_user.id:
        return jsonify({
            "success": False,
            "error": "Task not found"
        }), 404

    try:

        if 'title' in data:
            task.title = html.escape(data.get('title'))

        if 'description' in data:
            task.description = html.escape(data.get('description'))

        if 'due_date' in data:
            task.due_date = datetime.strptime(
                data.get('due_date'),
                '%Y-%m-%d'
            ).date()

        if 'is_complete' in data:
            task.is_complete = data.get('is_complete') == 'true'

        if 'reminder' in data:
            task.reminder = data.get('reminder') == 'true'

        db.session.commit()

        return jsonify({
            "success": True
        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@tasks_bp.route('/api/delete_task/<int:task_id>', methods=['POST'])
@login_required
def delete_task(task_id):

    task = db.session.get(Task, task_id)

    if not task or task.user_id != current_user.id:
        return jsonify({
            "success": False,
            "error": "Task not found"
        }), 404

    try:
        db.session.delete(task)
        db.session.commit()

        return jsonify({
            "success": True
        }), 200

    except Exception:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": "Could not delete task"
        }), 500
