import os
import json
import unicodedata
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

# Carrega as variáveis de ambiente (para desenvolvimento local)
load_dotenv()

app = Flask(__name__)
CORS(app)

# --- CONFIGURAÇÃO DO GOOGLE GEMINI ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("ERRO: Chave da API do Gemini não encontrada no ambiente.")

# --- CARREGANDO A BASE DE CONHECIMENTO ---
def load_knowledge_base():
    with open('knowledge_base.json', 'r', encoding='utf-8') as f:
        return json.load(f)
knowledge_base = load_knowledge_base()

# --- FUNÇÕES DE PROCESSAMENTO E BUSCA ---
def normalize_text(text):
    if not text: return ""
    return ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn').lower()

def find_relevant_facts(user_question):
    normalized_question = normalize_text(user_question)
    best_match = {"score": 0, "fact": None}

    for fact in knowledge_base['fatos']:
        current_score = 0
        for keyword in fact.get("palavras_chave_busca", []):
            normalized_keyword = normalize_text(keyword)
            # Verifica se a palavra-chave (pode ser uma frase) está contida na pergunta
            if normalized_keyword in normalized_question:
                # Pontuação é o número de palavras na chave ao quadrado (valoriza frases mais longas)
                score = len(normalized_keyword.split()) ** 2
                current_score += score
        
        if current_score > best_match["score"]:
            best_match["score"] = current_score
            best_match["fact"] = fact["informacao"]
            
    return best_match["fact"] if best_match["score"] > 0 else None

# --- FUNÇÃO DE GERAÇÃO COM GEMINI (COM O NOME DO MODELO CORRIGIDO) ---
def generate_gemini_response(user_question, context_fact):
    if not context_fact:
        return "Desculpe, não encontrei informações sobre isso em minha base de dados. Pode tentar perguntar de outra forma?"

    prompt = f"""
    Você é a C.I.A., uma assistente de RH amigável e profissional da Fundação Tiradentes.
    Sua tarefa é responder à pergunta do novo funcionário usando APENAS a informação de contexto fornecida.
    Seja conciso e prestativo.

    --- CONTEXTO ---
    {context_fact}

    --- PERGUNTA DO FUNCIONÁRIO ---
    {user_question}
    """
    
    try:
        # MUDANÇA CRÍTICA AQUI: Usando 'gemini-1.0-pro'
        model = genai.GenerativeModel('gemini-1.0-pro')
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
    if not data or 'question' not in data:
        return jsonify({"error": "Requisição inválida."}), 400

    user_question = data.get('question')
    
    # 1. Busca (Retrieval)
    relevant_fact = find_relevant_facts(user_question)
    
    # 2. Geração (Generation)
    answer_text = generate_gemini_response(user_question, relevant_fact)
    
    return jsonify({"answer": answer_text})