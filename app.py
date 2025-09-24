import os
import json
import unicodedata
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import numpy as np
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

# --- CONFIGURAÇÃO DO GOOGLE GEMINI ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("ERRO: Chave da API do Gemini não encontrada.")

EMBEDDING_MODEL = "models/text-embedding-004"

# --- CARREGANDO A BASE DE CONHECIMENTO COM EMBEDDINGS ---
def load_knowledge_base():
    with open('knowledge_base_com_embeddings.json', 'r', encoding='utf-8') as f:
        return json.load(f)
knowledge_base = load_knowledge_base()
facts_with_embeddings = [fact for fact in knowledge_base['fatos'] if 'embedding' in fact and fact['embedding']]

# --- FUNÇÕES DE PROCESSAMENTO E BUSCA SEMÂNTICA ---
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
    best_fact = None
    
    print("--- DEBUG DE BUSCA SEMÂNTICA ---") # Início do log de debug
    for fact in facts_with_embeddings:
        score = np.dot(question_embedding, fact['embedding'])
        # NOVO: Imprime a pontuação de cada fato para depuração
        print(f"Debug: Comparando com '{fact['topico']}'. Pontuação: {score:.4f}")
        
        if score > best_score:
            best_score = score
            best_fact = fact['informacao']
    
    print(f"Debug: Melhor pontuação encontrada: {best_score:.4f}") # Imprime a melhor pontuação
    print("---------------------------------") # Fim do log de debug
            
    # MUDANÇA: Reduzido o limite de confiança para ser mais flexível
    CONFIDENCE_THRESHOLD = 0.6 
    
    if best_score > CONFIDENCE_THRESHOLD:
        return best_fact
    else:
        return None

# --- FUNÇÃO DE GERAÇÃO COM GEMINI (sem alterações) ---
def generate_gemini_response(user_question, context_fact, history):
    # (Esta função permanece a mesma)
    # ...
    # (O corpo da função, como na versão anterior, vai aqui)
    formatted_history = "\n".join([f"{item['role']}: {item['parts'][0]['text']}" for item in history])
    if not context_fact and not history:
        return "Desculpe, não encontrei informações sobre isso na minha base de dados. Pode tentar perguntar de outra forma?"
    prompt = f"""
    Você é a C.I.A., uma assistente de RH amigável e profissional da Fundação Tiradentes.
    Sua tarefa é responder à pergunta do novo funcionário usando APENAS a informação de contexto fornecida.
    Seja conciso e prestativo.

    --- CONTEXTO ---
    {context_fact if context_fact else "Nenhum contexto adicional encontrado para esta pergunta."}

    --- HISTÓRICO DA CONVERSA ---
    {formatted_history}

    --- PERGUNTA ATUAL DO FUNCIONÁRIO ---
    {user_question}
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-pro-latest')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"ERRO CRÍTICO ao chamar a API do Gemini: {e}")
        return "Desculpe, estou com um problema para me conectar à minha inteligência. Tente novamente mais tarde."

# --- ROTAS DA APLICAÇÃO (sem alterações) ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/ask', methods=['POST'])
def ask_question():
    data = request.get_json()
    user_question = data.get('question')
    history = data.get('history', [])
    
    relevant_fact = find_relevant_facts_semantica(user_question)
    answer_text = generate_gemini_response(user_question, relevant_fact, history)
    
    return jsonify({"answer": answer_text})