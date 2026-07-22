# Routes for AI feature
import os
import traceback
import uuid

from dotenv import load_dotenv
from flask import (Blueprint, current_app, json, jsonify, redirect,
                   render_template, request, url_for)
from flask_login import current_user, login_required
from groq import Groq
from werkzeug.utils import secure_filename

from extensions import db
from models import Flashcard
from utils.utils import extract_text_for_ai

load_dotenv()  # Load environment variables from .env file
genai_bp = Blueprint('genai', __name__)

# Safely loading the key from environment variables
client = Groq(api_key=os.getenv('GROQ_API_KEY'))

@genai_bp.route('/flashcards', methods=['GET'])
@login_required
def flashcards_dashboard():
    """Renders the main flashcard control deck panel."""
    # Get a distinct list of group names this user has created
    groups = db.session.query(Flashcard.group).filter_by(user_id=current_user.id).distinct().all()
    group_names = [g[0] for g in groups if g[0]]

    # Check if the user is clicking to filter down into a specific study deck group
    selected_group = request.args.get('study_group')
    
    cards_to_render = []
    if selected_group:
        cards_to_render = Flashcard.query.filter_by(user_id=current_user.id, group=selected_group).all()

    return render_template(
        'flashcards.html', 
        group_names=group_names, 
        flashcards=cards_to_render,
        selected_group=selected_group
    )

@genai_bp.route('/generate-flashcards', methods=['POST'])
@login_required
def generate_flashcards():
    temp_path = None
    try:
        #Validate if file exists
        if 'study_file' not in request.files:
            return jsonify({"success": False, "error": "No file uploaded."}), 400
        
        uploaded_file = request.files['study_file']

        #Validate filename
        if uploaded_file.filename == '':
            return jsonify({"success": False, "error": "No file selected."}), 400

        num_cards = request.form.get("num_cards", 5, type=int)

        # Validate group name
        group_name = request.form.get("group-name", "").strip() or "Untitled Group"
        existing_groups = (
            db.session.query(Flashcard.group)
            .filter_by(user_id=current_user.id)
            .distinct()
            .all()
        )
        existing_groups = [g[0] for g in existing_groups if g[0]]
        if group_name in existing_groups:
            return jsonify({"success": False, "error": "A group with this name already exists."}), 400

        # Save temp file
        temp_dir = os.path.join(current_app.root_path, "static", "temp")
        os.makedirs(temp_dir, exist_ok=True)
        safe_name = secure_filename(uploaded_file.filename)
        filename = f"{current_user.id}_{uuid.uuid4()}_{safe_name}"
        temp_path = os.path.join(temp_dir, filename)
        uploaded_file.save(temp_path)

        # Extract text using helper function
        file_text = extract_text_for_ai(temp_path, allowed_directory=temp_dir)
        if not file_text or len(file_text.strip()) < 10:
            return jsonify({"success": False, "error": "Could not extract readable text."}), 400

        # Trim long text to meet API limits
        file_text = file_text[:8000]

        # Sanitise user instructions
        custom_user_message = request.form.get("custom-message", "").strip()
        custom_user_message = custom_user_message.replace('"', "'")

        # Flashcard extractor
        def extract_flashcards_from_text(text):
            cards = []
            if not text:
                return cards

            # try JSON first
            try:
                obj = json.loads(text)
                flashcard = obj.get("flashcards", [])
                for card in flashcard:
                    front = card.get("front")
                    back = card.get("back")
                    if isinstance(front, list):
                        front = front[0]
                    if isinstance(front, str) and isinstance(back, str):
                        cards.append({"front": front, "back": back})
                if cards:
                    return cards
            except Exception as e:
                print(e)
            # strip markdown characters
            cleaned = text.replace("```json", "").replace("```", "").strip()

            # try JSON again
            try:
                obj = json.loads(cleaned)
                fc = obj.get("flashcards", [])
                for c in fc:
                    front = c.get("front")
                    back = c.get("back")
                    if isinstance(front, list):
                        front = front[0]
                    if isinstance(front, str) and isinstance(back, str):
                        cards.append({"front": front, "back": back})
                if cards:
                    return cards
            except Exception as e:
                print(e)
            # Regex to ensure nothing slips through
            import re
            pattern = re.compile(
                r'front"\s*:\s*"([^"]+)"[\s\S]*?back"\s*:\s*"([^"]+)"',
                re.IGNORECASE
            )
            for m in pattern.finditer(cleaned):
                front, back = m.group(1), m.group(2)
                cards.append({"front": front, "back": back})

            return cards

        # build main prompt
        base_prompt = f"""
        You are an elite study assistant. Generate {num_cards} flashcards, a mix of definitions, true/false.

            Return ONLY JSON:
            {{"flashcards":[{{"front":"...","back":"..."}}]}}

            --- begin text ---
            {file_text}
            --- end ---
            """

        # call model
        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": base_prompt}],
            temperature=0,
        )

        raw_output = response.choices[0].message.content
        print("\nRAW AI OUTPUT:\n", raw_output)

        # fallback if empty
        if not raw_output or not raw_output.strip():
            print("Model returned empty output. Retrying with fallback prompt.")
            fallback_prompt = f"""
                Generate {num_cards} flashcards.

                Return ONLY JSON:
                {{"flashcards":[{{"front":"...","back":"..."}}]}}

                --- begin text ---
                {file_text}
                --- end ---
                """
            fallback_response = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[{"role": "user", "content": fallback_prompt}],
                temperature=0,
            )
            raw_output = fallback_response.choices[0].message.content
            print("\nFALLBACK AI OUTPUT:\n", raw_output)

        # Extract initial cards
        flashcards_list = extract_flashcards_from_text(raw_output)

        # Generation for missing cards
        while len(flashcards_list) < num_cards:
            missing = num_cards - len(flashcards_list)

            missing_prompt = f"""
                Generate exactly {missing} flashcards.

                Return ONLY JSON:
                {{"flashcards":[{{"front":"...","back":"..."}}]}}

                --- begin text ---
                {file_text}
                --- end ---
                """

            missing_response = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[{"role": "user", "content": missing_prompt}],
                temperature=0,
            )

            raw_new_fc = missing_response.choices[0].message.content
            print("\nRAW BATCH OUTPUT:\n", raw_new_fc)

            if not raw_new_fc or not raw_new_fc.strip():
                print("Batch returned empty output. Retrying.")
                continue

            missing_cards = extract_flashcards_from_text(raw_new_fc)

            if not missing_cards:
                print("Batch returned no valid cards. Retrying.")
                continue

            flashcards_list.extend(missing_cards)

        # final trim
        flashcards_list = flashcards_list[:num_cards]

        # save to db
        for card in flashcards_list:
            db.session.add(Flashcard(
                user_id=current_user.id,
                front=card["front"],
                back=card["back"],
                group=group_name
            ))
        db.session.commit()

        return jsonify({
            "success": True,
            "redirect": url_for('genai.flashcards_dashboard', study_group=group_name),
            "message": f'Successfully created the deck \"{group_name}\"'
        }), 200

    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        print("Error:", e)
        return jsonify({"success": False, "error": "Something went wrong! Please reload and try again."}), 500

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
    
@genai_bp.route('/api/edit_flashcard/<int:flashcard_id>', methods=['POST'])
def edit_flashcard(flashcard_id):
    flashcard = Flashcard.query.get(flashcard_id)
    data = request.form

    if not flashcard or flashcard.user_id != current_user.id:
        return jsonify({
            "success": False,
            "error": "Flashcard not found or access unauthorised"
        }), 404

    try:
        if 'front' in data:
            flashcard.front = data.get('front')

        if 'back' in data:
            flashcard.back = data.get('back')

        db.session.commit()
        return jsonify({"success": True}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": f"Database mutation crash: {str(e)}"
        }), 500

@genai_bp.route('/delete-group/<group_name>', methods=['POST'])
@login_required
def remove_group(group_name):    
    try:
        # FIX: Changed the left side filter parameter from group_name to group
        flashcards = db.session.query(Flashcard).filter_by(
            group=group_name,
            user_id=current_user.id
        ).all()
        
        # If no matching cards are found under this group name, return a 404
        if not flashcards:
            return jsonify({
                "success": False, 
                "error": "Flashcard group not found or unauthorised."
            }), 404

        # Loop through and delete each card individually 
        for card in flashcards:
            db.session.delete(card)
            
        # Commit the changes to your database file
        db.session.commit()
        
        return jsonify({"success": True}), 200

    except Exception as e:
        db.session.rollback()
        
        # This will still log to your terminal console if anything else goes wrong
        print("!!! DELETION CRASH ERROR !!!:", str(e)) 
        
        return jsonify({
            "success": False, 
            "error": f"Database Error: {str(e)}"
        }), 500