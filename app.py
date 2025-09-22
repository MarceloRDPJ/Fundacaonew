import os
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import unicodedata
import json
import requests
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env (só funciona localmente)
load_dotenv()

app = Flask(__name__)
CORS(app)

# --- CONFIGURAÇÃO DO ELEVENLABS ---
# Pega as chaves do ambiente. No Render, virá das "Environment Variables". Localmente, do .env.
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = os.getenv("VOICE_ID")
TTS_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

# --- CARREGANDO A BASE DE CONHECIMENTO ---
def load_knowledge_base():
    with open('knowledge_base.json', 'r', encoding='utf-8') as f:
        return json.load(f)
knowledge_base = load_knowledge_base()

# --- FUNÇÃO PARA GERAR ÁUDIO COM ELEVENLABS ---
def generate_elevenlabs_audio(text):
    if not ELEVENLABS_API_KEY or not VOICE_ID:
        print("Chaves do ElevenLabs não configuradas.")
        return None

    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": { "stability": 0.5, "similarity_boost": 0.75 }
    }
    try:
        response = requests.post(TTS_URL, json=data, headers=headers, stream=True)
        response.raise_for_status()

        audio_folder = os.path.join(app.static_folder, 'audio')
        os.makedirs(audio_folder, exist_ok=True)
        
        audio_file_path = os.path.join(audio_folder, "response.mp3")
        with open(audio_file_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=1024):
                f.write(chunk)

        return "/static/audio/response.mp3"
    except requests.exceptions.RequestException as e:
        print(f"Erro ao chamar a API do ElevenLabs: {e}")
        return None

# (Suas funções normalize_text, extract_entity, find_best_intent, get_intent_by_tag não mudam)
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
        if intent_context and intent_context != current_context: continue
        priority = 1.5 if intent_context else 1
        current_score = 0
        for keyword in intent.get("keywords", []):
            normalized_keyword = normalize_text(keyword)
            if normalized_keyword in normalized_question:
                score = len(normalized_keyword.split()) ** 2
                current_score += score
        final_score = current_score * priority
        if final_score > best_match['score']:
            best_match['tag'] = intent['tag']
            best_match['score'] = final_score
    return best_match
def get_intent_by_tag(tag):
    for intent in knowledge_base['intents']:
        if intent['tag'] == tag:
            return intent
    return None

# --- ROTAS DA APLICAÇÃO ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/ask', methods=['POST'])
def ask_question():
    data = request.get_json()
    user_question = data.get('question')
    current_context = data.get('context', None)
    
    best_intent_match = find_best_intent(user_question, current_context)
    # ... (lógica para encontrar a resposta em texto) ...
    if best_intent_match['score'] > 0:
        intent = get_intent_by_tag(best_intent_match['tag'])
        answer_text = intent.get('answer')
        new_context = intent.get('context_set', None)
        follow_up = intent.get('follow_up', None)
    else:
        answer_text = "Desculpe, não entendi sua pergunta."
        new_context = None
        follow_up = None

    audio_url = generate_elevenlabs_audio(answer_text)
    
    if not audio_url:
        return jsonify({"error": "Falha ao gerar o áudio."}), 500

    return jsonify({"answer": answer_text, "context": new_context, "follow_up": follow_up, "audio_url": audio_url})

# Removido o if __name__ == '__main__' para ser compatível com o Gunicorn