from flask import Flask, request, jsonify, render_template, url_for
from flask_cors import CORS
import unicodedata
import json

app = Flask(__name__)
CORS(app)

def load_knowledge_base():
    with open('knowledge_base.json', 'r', encoding='utf-8') as f:
        return json.load(f)

knowledge_base = load_knowledge_base()

def normalize_text(text):
    if not text: return ""
    return ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn').lower()

def extract_entity(user_question, entity_type):
    normalized_question = normalize_text(user_question)
    possible_values = knowledge_base.get("entities", {}).get(entity_type, {})
    
    for value in possible_values.keys():
        if normalize_text(value) in normalized_question:
            return value, possible_values[value]
    return None, None

def find_best_intent(user_question, current_context):
    normalized_question = normalize_text(user_question)
    best_match = {"tag": None, "score": 0}

    for intent in knowledge_base['intents']:
        intent_context = intent.get("context_filter")
        if intent_context and intent_context != current_context:
            continue

        priority = 1.5 if intent_context else 1
        score = 0
        for keyword in intent.get("keywords", []):
            if normalize_text(keyword) in normalized_question:
                score += 1
        
        final_score = score * priority
        if final_score > best_match['score']:
            best_match['tag'] = intent['tag']
            best_match['score'] = final_score
    
    return best_match

def get_intent_by_tag(tag):
    for intent in knowledge_base['intents']:
        if intent['tag'] == tag:
            return intent
    return None

@app.route('/ask', methods=['POST'])
def ask_question():
    data = request.get_json()
    if not data or 'question' not in data:
        return jsonify({"error": "Requisição inválida."}), 400

    user_question = data.get('question')
    current_context = data.get('context', None)
    
    best_intent_match = find_best_intent(user_question, current_context)

    if best_intent_match['score'] > 0:
        intent = get_intent_by_tag(best_intent_match['tag'])
        answer = intent.get('answer')
        
        if intent.get("entity"):
            entity_type = intent.get("entity")
            entity_name, entity_value = extract_entity(user_question, entity_type)
            
            if entity_name:
                answer = answer.replace(f"{{{entity_type}}}", entity_name)
                answer = answer.replace("{chefe}", entity_value)
            else:
                answer = f"Não consegui identificar sobre qual {entity_type} você está perguntando. Pode especificar?"
        
        new_context = intent.get('context_set', None)
        follow_up = intent.get('follow_up', None)
    else:
        answer = "Desculpe, não entendi sua pergunta. Pode tentar reformular?"
        new_context = None
        follow_up = None
    
    return jsonify({"answer": answer, "context": new_context, "follow_up": follow_up})

@app.route('/')
def index():
    return render_template('index.html')
