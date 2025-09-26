import os
import json
import unicodedata
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import numpy as np
from dotenv import load_dotenv
import requests

load_dotenv()
app = Flask(__name__)
CORS(app)

# --- CONFIGURAÇÃO DO GOOGLE GEMINI ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = os.getenv("VOICE_ID")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("ERRO: Chave da API do Gemini não encontrada.")

EMBEDDING_MODEL = "models/text-embedding-004"

# --- CARREGANDO A BASE DE CONHECIMENTO ---
def load_knowledge_base():
    with open('knowledge_base_com_embeddings.json', 'r', encoding='utf-8') as f:
        return json.load(f)
knowledge_base = load_knowledge_base()
facts_with_embeddings = [fact for fact in knowledge_base['fatos'] if 'embedding' in fact and fact['embedding']]

def generate_elevenlabs_audio(text):
    if not ELEVENLABS_API_KEY or not VOICE_ID:
        print("AVISO: Chaves do ElevenLabs não configuradas. A voz não será gerada.")
        return None
    
    tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = { "Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": ELEVENLABS_API_KEY }
    data = { "text": text, "model_id": "eleven_multilingual_v2", "voice_settings": { "stability": 0.5, "similarity_boost": 0.75 } }
    
    try:
        response = requests.post(tts_url, json=data, headers=headers)
        response.raise_for_status()
        
        audio_folder = os.path.join(app.static_folder, 'audio')
        os.makedirs(audio_folder, exist_ok=True)
        audio_file_path = os.path.join(audio_folder, "response.mp3")
        
        with open(audio_file_path, "wb") as f:
            f.write(response.content)
            
        return "/static/audio/response.mp3"
    except requests.exceptions.RequestException as e:
        print(f"ERRO CRÍTICO ao chamar a API do ElevenLabs: {e}")
        return None
    

# --- FUNÇÕES DE PROCESSAMENTO E BUSCA ---
def normalize_text(text):
    if not text: return ""
    return ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn').lower()

def find_relevant_facts_semantica(user_question):
    try:
        question_embedding = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=user_question
        )['embedding']
    except Exception as e:
        print(f"ERRO ao gerar embedding para a pergunta: {e}")
        return None

    best_score = -1
    best_fact_object = None
    
    # A lógica de busca agora encontra o fato com a maior similaridade para a pergunta atual
    for fact in facts_with_embeddings:
        score = np.dot(question_embedding, fact['embedding'])
        if score > best_score:
            best_score = score
            best_fact_object = fact
            
    # Limite de confiança para evitar respostas irrelevantes
    CONFIDENCE_THRESHOLD = 0.60
    
    if best_score > CONFIDENCE_THRESHOLD:
        return best_fact_object
    else:
        return None
    
def reformulate_query_with_history(user_question, history):
    # Se a pergunta já for longa, provavelmente não precisa de reformulação
    if len(user_question.split()) > 4:
        return user_question

    formatted_history = "\n".join([f"{item['role'].replace('model', 'assistente')}: {item['parts'][0]['text']}" for item in history])
    
    prompt = f"""
    Com base no histórico da conversa, reescreva a "pergunta curta" do usuário como uma pergunta completa e independente.
    Responda APENAS com a pergunta reescrita.

    --- HISTÓRICO ---
    {formatted_history}

    --- PERGUNTA CURTA ---
    {user_question}
    """
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-lite-001') # Usando o modelo rápido para esta tarefa
        response = model.generate_content(prompt)
        # Limpa a resposta para garantir que seja apenas a pergunta
        reformulated_question = response.text.strip().replace("*", "")
        print(f"Debug: Pergunta original: '{user_question}' -> Reformulada: '{reformulated_question}'")
        return reformulated_question
    except Exception as e:
        print(f"ERRO ao reformular a pergunta: {e}")
        return user_question # Retorna a original em caso de erro

# --- FUNÇÃO DE GERAÇÃO COM GEMINI ---
def generate_gemini_response(user_question, context_fact_object, history):
    if not context_fact_object and not history:
        return "Desculpe, não encontrei informações sobre isso em minha base de dados. Pode tentar perguntar de outra forma?"
    context_topic = context_fact_object.get('topico', 'Geral') if context_fact_object else 'Geral'
    context_info = context_fact_object.get('informacao', '') if context_fact_object else ''
    formatted_history = "\n".join([f"{item['role'].replace('model', 'assistente')}: {item['parts'][0]['text']}" for item in history])
    prompt = f"""
    Você é a C.I.A., uma assistente de RH amigável e profissional da Fundação Tiradentes.
    Sua tarefa é responder à pergunta do novo funcionário de forma concisa e direta, usando APENAS a informação de "CONTEXTO" fornecida.
    Não adicione saudações como 'Olá!' se já houver um histórico de conversa.

    --- CONTEXTO (Fonte da Verdade) ---
    {context_info if context_info else "Nenhum."}

    --- HISTÓRICO DA CONVERSA ---
    {formatted_history}

    --- PERGUNTA ATUAL DO FUNCIONÁRIO ---
    {user_question}
    """
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-lite-001') # Mantendo o modelo mais poderoso que funcionou
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"ERRO CRÍTICO ao chamar a API do Gemini: {e}")
        return "Desculpe, estou com um problema para me conectar à minha inteligência. Tente novamente mais tarde."


# --- ROTAS DA APLICAÇÃO ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/ask', methods=['POST'])
def ask_question():
    data = request.get_json()
    user_question = data.get('question')
    history = data.get('history', [])
    
    # 1. Busca (Retrieval)
    relevant_fact_object = find_relevant_facts_semantica(user_question)
    
    # 2. Geração de Texto com Gemini
    answer_text = generate_gemini_response(user_question, relevant_fact_object, history)
    
    # 3. Geração de Áudio com ElevenLabs
    audio_url = generate_elevenlabs_audio(answer_text)
    
    if not audio_url:
        # Se a geração de áudio falhar, a voz do navegador ainda pode ser usada como fallback
        print("Falha na geração de áudio, retornando apenas texto.")
        return jsonify({"answer": answer_text})

    return jsonify({"answer": answer_text, "audio_url": audio_url})
