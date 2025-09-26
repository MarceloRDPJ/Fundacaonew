import os
import json
import unicodedata
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import numpy as np
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
    print("AVISO: Chave da API do Gemini não encontrada. Verifique seu arquivo .env")

EMBEDDING_MODEL = "models/text-embedding-004"

# --- CARREGANDO A BASE DE CONHECIMENTO COM EMBEDDINGS ---
def load_knowledge_base():
    try:
        with open('knowledge_base_com_embeddings.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("ERRO: O arquivo 'knowledge_base_com_embeddings.json' não foi encontrado.")
        print("Por favor, execute o script 'criar_embeddings.py' primeiro.")
        return {"fatos": []} # Retorna uma base vazia para não travar o app

knowledge_base = load_knowledge_base()
facts_with_embeddings = [fact for fact in knowledge_base['fatos'] if 'embedding' in fact and fact['embedding']]

# --- FUNÇÕES DE PROCESSAMENTO E BUSCA SEMÂNTICA ---
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
    
    for fact in facts_with_embeddings:
        score = np.dot(question_embedding, fact['embedding'])
        if score > best_score:
            best_score = score
            best_fact_object = fact
            
    CONFIDENCE_THRESHOLD = 0.65
    
    if best_score > CONFIDENCE_THRESHOLD:
        return best_fact_object
    else:
        return None

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

    --- CONTEXTO ---
    {context_info if context_info else "Nenhum."}
    --- HISTÓRICO DA CONVERSA ---
    {formatted_history}
    --- PERGUNTA ATUAL DO FUNCIONÁRIO ---
    {user_question}
    """
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-lite-001')
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
    
    relevant_fact_object = find_relevant_facts_semantica(user_question)
    answer_text = generate_gemini_response(user_question, relevant_fact_object, history)
    
    # Retorna apenas o texto da resposta
    return jsonify({"answer": answer_text})

# --- BLOCO PARA EXECUÇÃO LOCAL ---
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)