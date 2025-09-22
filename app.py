import os
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import unicodedata
import json
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = os.getenv("VOICE_ID")
TTS_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

def load_knowledge_base():
    with open('knowledge_base.json', 'r', encoding='utf-8') as f:
        return json.load(f)
knowledge_base = load_knowledge_base()

# --- (Função generate_elevenlabs_audio e outras utilitárias permanecem iguais) ---
def generate_elevenlabs_audio(text):
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    data = {"text": text, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}}
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

def normalize_text(text):
    if not text: return ""
    return ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn').lower()

def extract_entity(user_question, entity_type):
    # (Esta função não precisa de mudanças)
    normalized_question = normalize_text(user_question)
    possible_values = knowledge_base.get("entities", {}).get(entity_type, {})
    for value in possible_values.keys():
        if normalize_text(value) in normalized_question:
            return value, possible_values[value]
    return None, None

# --- NOVA FUNÇÃO DE INTELIGÊNCIA (MAIS PRECISA) ---
def find_best_intent(user_question, current_context):
    normalized_question = normalize_text(user_question)
    best_match = {"tag": None, "score": 0}

    for intent in knowledge_base['intents']:
        # Lógica de contexto permanece a mesma
        intent_context = intent.get("context_filter")
        if intent_context and intent_context != current_context:
            continue
        
        # Se a intenção for dependente de contexto, damos prioridade
        priority = 1.5 if intent_context else 1
        
        current_score = 0
        for keyword in intent.get("keywords", []):
            normalized_keyword = normalize_text(keyword)
            
            # Se a palavra-chave (frase) inteira estiver na pergunta, a pontuação é muito maior!
            if normalized_keyword in normalized_question:
                # Pontuação = número de palavras na chave ao quadrado (dá muito mais peso a frases longas)
                score = len(normalized_keyword.split()) ** 2
                current_score += score
        
        final_score = current_score * priority
        if final_score > best_match['score']:
            best_match['tag'] = intent['tag']
            best_match['score'] = final_score
            
    return best_match
# --- FIM DA NOVA FUNÇÃO ---

def get_intent_by_tag(tag):
    for intent in knowledge_base['intents']:
        if intent['tag'] == tag:
            return intent
    return None

# --- ROTA /ask (SEM MUDANÇAS NA LÓGICA PRINCIPAL) ---
@app.route('/ask', methods=['POST'])
def ask_question():
    data = request.get_json()
    user_question = data.get('question')
    current_context = data.get('context', None)
    
    best_intent_match = find_best_intent(user_question, current_context)

    if best_intent_match['score'] > 0:
        intent = get_intent_by_tag(best_intent_match['tag'])
        answer_text = intent.get('answer')
        # ... (lógica de entidades) ...
        new_context = intent.get('context_set', None)
    else:
        answer_text = "Desculpe, não entendi sua pergunta. Pode tentar reformular?"
        new_context = None

    # Lógica de geração de áudio (se estiver usando)
    if ELEVENLABS_API_KEY:
        audio_url = generate_elevenlabs_audio(answer_text)
        if not audio_url:
            return jsonify({"error": "Falha ao gerar o áudio."}), 500
        return jsonify({"answer": answer_text, "context": new_context, "audio_url": audio_url})
    else:
        # Fallback se não estiver usando ElevenLabs
        return jsonify({"answer": answer_text, "context": new_context})


@app.route('/')
def index():
    return render_template('index.html')

