import os
import json
import unicodedata
import traceback
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import numpy as np
from dotenv import load_dotenv
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from google.oauth2.service_account import Credentials
from datetime import datetime, timezone, timedelta

load_dotenv()
app = Flask(__name__)
CORS(app)

# --- CONFIGURAÇÃO DO GOOGLE GEMINI ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
APPS_SCRIPT_URL = os.getenv("APPS_SCRIPT_URL")

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
]

GOOGLE_CREDENTIALS_PATH = '/etc/secrets/google_credentials.json'
SHEET_ID = '17S3BJeOwmjGnBo4IkbFvQvqVqjdLadB9xMBac9vTxtA'

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("ERRO: Chave GEMINI_API_KEY não encontrada no ambiente.")

EMBEDDING_MODEL = "models/text-embedding-004"

# Função para inicializar a conexão com o Google Sheets
def get_sheets_client():
    try:
        creds = Credentials.from_service_account_file(GOOGLE_CREDENTIALS_PATH, scopes=SCOPES)
        client = gspread.authorize(creds)
        return client
    except Exception as e:
        print(f"ERRO CRÍTICO ao conectar com Google Sheets: {e}")
        traceback.print_exc()
        return None
    
# Função para salvar a pergunta na planilha
def save_unanswered_question(question):
    client = get_sheets_client()
    if client:
        try:
            # Abre a planilha pelo ID e seleciona a primeira aba (worksheet)
            sheet = client.open_by_key(SHEET_ID).sheet1
            # Adiciona a pergunta em uma nova linha na primeira coluna
            sheet.append_row([question])
            print(f"Pergunta salva na planilha: '{question}'")
        except Exception as e:
            print(f"ERRO ao tentar salvar na planilha: {e}")
            traceback.print_exc()




# --- CARREGANDO A BASE DE CONHECIMENTO ---
def load_knowledge_base():
    try:
        with open('knowledge_base_com_embeddings.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("ERRO: O arquivo 'knowledge_base_com_embeddings.json' não foi encontrado.")
        return {"fatos": []}

knowledge_base = load_knowledge_base()
facts_with_embeddings = [fact for fact in knowledge_base['fatos'] if 'embedding' in fact and fact['embedding']]

# --- FUNÇÕES DE PROCESSAMENTO E BUSCA ---
def normalize_text(text):
    if not text: return ""
    return ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn').lower()

def find_relevant_facts_semantica(user_question):
    try:
        question_embedding = genai.embed_content(model=EMBEDDING_MODEL, content=user_question)['embedding']
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
            
    CONFIDENCE_THRESHOLD = 0.6
    if best_score > CONFIDENCE_THRESHOLD:
        return best_fact_object
    else:
        return None

# --- FUNÇÃO DE GERAÇÃO COM GEMINI ---
def generate_gemini_response(user_question, context_fact_object, history):
    if not context_fact_object and not history:
        save_unanswered_question(user_question)
        return "Desculpe, não encontrei informações sobre isso em minha base de dados. Pode tentar perguntar de outra forma?"

    context_topic = context_fact_object.get('topico', 'Geral') if context_fact_object else 'Geral'
    context_info = context_fact_object.get('informacao', '') if context_fact_object else ''
    formatted_history = "\n".join([f"{item['role'].replace('model', 'assistente')}: {item['parts'][0]['text']}" for item in history])
    
    prompt = f"""
    Você é a CELINE, uma assistente de RH amigável e profissional da Fundação Tiradentes.
    Sua principal tarefa é responder à pergunta do funcionário. Para isso, siga estas diretrizes:
    1.  Priorize o HISTÓRICO DA CONVERSA para entender o tópico atual e perguntas de acompanhamento.
    2.  Use a informação da seção "CONTEXTO" como sua principal fonte de verdade para responder à "PERGUNTA ATUAL".
    3.  Se o CONTEXTO for relevante para a pergunta, formule uma resposta clara e direta usando essa informação.
    4.  Se o CONTEXTO for sobre o tópico correto, mas não tiver a resposta exata, seja prestativo: informe o que você sabe sobre o tópico e admita o que você não sabe. (Ex: "Não tenho a data, mas o valor do benefício é X").
    5.  Se o CONTEXTO parecer totalmente irrelevante, diga que não encontrou a informação.

    --- CONTEXTO (Fonte da Verdade) ---
    {context_info if context_info else "Nenhum."}
    --- HISTÓRICO DA CONVERSA ---
    {formatted_history}
    --- PERGUNTA ATUAL DO FUNCIONÁRIO ---
    {user_question}
    """
    
    try:
        # Usando o modelo que sabemos que funciona para sua conta
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
    return jsonify({"answer": answer_text})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
