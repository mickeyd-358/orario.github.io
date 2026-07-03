# Define a User table schema
from datetime import date

from flask_login import UserMixin

from extensions import db

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(250), nullable=False)
    email = db.Column(db.String(250), unique=True, nullable=False)
    password = db.Column(db.String(250), nullable=True)
    quote = db.Column(db.String(250), nullable=True)
    study_time = db.Column(db.String(10), nullable=False)
    is_studying = db.Column(db.Boolean, default=False)
    study_group = db.Column(db.String(50), nullable=True)
    tasks = db.relationship('Task', backref='user', lazy='dynamic')
    flashcards = db.relationship('Flashcard', backref='user', lazy='dynamic', cascade="all, delete-orphan")

    def get_study_time_dict(self):
        return {
            'name': self.name,
            'study_time': self.study_time
        }

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    due_date = db.Column(db.Date, nullable=False, default=date.today)
    description = db.Column(db.String(200), nullable=False)
    reminder = db.Column(db.Boolean, default=False)
    is_complete = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def __init__(self, title, description, due_date, reminder, is_complete, user_id):
        self.title = title
        self.description = description
        self.due_date = due_date
        self.reminder = reminder
        self.is_complete = is_complete
        self.user_id = user_id

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'due_date': self.due_date.strftime('%Y-%m-%d'),
            'is_complete': self.is_complete,
            'reminder': self.reminder
        }

    def set_title(self, title):
        self.title = title
    
    def set_description(self, description):
        self.description = description

class Flashcard(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    front = db.Column(db.Text, nullable=False)
    back = db.Column(db.Text, nullable=False)
    group = db.Column(db.String(100), nullable=False, default='Untitled Group')

    def __init__(self, user_id, front, back, group='Untitled Group'):
        self.user_id = user_id
        self.front = front
        self.back = back
        self.group = group or 'Untitled Group'

class DailyStudyLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    study_group = db.Column(db.String(50))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False) 
    date = db.Column(db.Date, nullable=False, default=date.today)
    sessions_today = db.Column(db.Integer, default=0)
    total_minutes = db.Column(db.Integer, nullable=False, default=0)