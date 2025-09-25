import os
import json
import unicodedata
from flask import Flask, request, jsonify, render_template, Response, stream_with_context
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

# --- CARREGANDO A BASE DE CONHECIMENTO ---
def load_knowledge_base():
    with open('knowledge_base_com_embeddings.json', 'r', encoding='utf-8') as f:
        return json.load(f)
knowledge_base = load_knowledge_base()
facts_with_embeddings = [fact for fact in knowledge_base['fatos'] if 'embedding' in fact and fact['embedding']]

# --- FUNÇÕES DE PROCESSAMENTO E BUSCA (sem alterações) ---
def normalize_text(text): # ... (código existente)
def find_relevant_facts_semantica(user_question): # ... (código existente)

# --- FUNÇÃO DE GERAÇÃO COM GEMINI (MODIFICADA PARA STREAMING) ---
def generate_gemini_response_stream(user_question, context_fact, history):
    # Esta função agora é um GERADOR, usando 'yield'
    if not context_fact and not history:
        yield "Desculpe, não encontrei informações sobre isso. Pode tentar de outra forma?"
        return # Termina a execução da função

    formatted_history = "\n".join([f"{item['role']}: {item['parts'][0]['text']}" for item in history])
    prompt = f"""
    Você é a C.I.A., uma assistente de RH amigável e profissional.
    Sua tarefa é responder à pergunta do funcionário usando o CONTEXTO fornecido e o HISTÓRICO da conversa.
    Seja conciso e prestativo.

    --- CONTEXTO ---
    {context_fact if context_fact else "Nenhum."}
    --- HISTÓRICO DA CONVERSA ---
    {formatted_history}
    --- PERGUNTA ATUAL DO FUNCIONÁRIO ---
    {user_question}
    """
    
    try:
        model = genai.GenerativeModel('gemini-1.5-pro-latest')
        # MUDANÇA CRÍTICA: Adicionamos stream=True
        responses = model.generate_content(prompt, stream=True)
        
        # Itera sobre cada pedaço da resposta que a API envia
        for chunk in responses:
            yield chunk.text
            
    except Exception as e:
        print(f"ERRO CRÍTICO ao chamar a API do Gemini: {e}")
        yield "Desculpe, estou com um problema de conexão no momento."

# --- ROTAS DA APLICAÇÃO ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/ask', methods=['POST'])
def ask_question():
    data = request.get_json()
    user_question = data.get('question')
    history = data.get('history', [])
    
    relevant_fact = find_relevant_facts_semantica(user_question)
    
    # MUDANÇA CRÍTICA: A rota agora retorna um objeto Response com o gerador
    return Response(stream_with_context(generate_gemini_response_stream(user_question, relevant_fact, history)), mimetype='text/plain')