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
    question_words = set(normalized_question.split())
    
    best_match = {"score": 0, "fact": None}

    for fact in knowledge_base['fatos']:
        keywords = set(fact.get("palavras_chave_busca", []))
        # Pontua pela quantidade de palavras-chave correspondentes
        score = len(question_words.intersection(keywords))
        
        if score > best_match["score"]:
            best_match["score"] = score
            best_match["fact"] = fact["informacao"]
    
    return best_match["fact"] if best_match["score"] > 0 else None

# --- FUNÇÃO DE GERAÇÃO COM GEMINI ---
def generate_gemini_response(user_question, context_fact):
    if not context_fact:
        return "Desculpe, não encontrei informações sobre isso. Pode tentar perguntar de outra forma?"

    # O prompt que guia o Gemini
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
        model = genai.GenerativeModel('gemini-pro')
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
    
    # O contexto e follow_up agora são gerenciados pelo LLM, então retornamos uma estrutura mais simples
    return jsonify({"answer": answer_text})