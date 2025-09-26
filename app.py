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

# --- CARREGANDO A BASE DE CONHECIMENTO ---
def load_knowledge_base():
    with open('knowledge_base_com_embeddings.json', 'r', encoding='utf-8') as f:
        return json.load(f)
knowledge_base = load_knowledge_base()
facts_with_embeddings = [fact for fact in knowledge_base['fatos'] if 'embedding' in fact and fact['embedding']]

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
    CONFIDENCE_THRESHOLD = 0.65
    
    if best_score > CONFIDENCE_THRESHOLD:
        return best_fact_object
    else:
        return None

# --- FUNÇÃO DE GERAÇÃO COM GEMINI ---
def generate_gemini_response(user_question, context_fact_object, history):
    # Se a busca não encontrou nada E não há histórico, retorna a mensagem padrão.
    if not context_fact_object and not history:
        return "Desculpe, não encontrei informações sobre isso em minha base de dados. Pode tentar perguntar de outra forma?"

    # Prepara o contexto e o histórico
    context_info = context_fact_object.get('informacao', '') if context_fact_object else "Nenhuma."
    formatted_history = "\n".join([f"{item['role'].replace('model', 'assistente')}: {item['parts'][0]['text']}" for item in history])
    
    # PROMPT APRIMORADO COM REGRAS RÍGIDAS
    prompt = f"""
    Você é a C.I.A., uma assistente de RH da Fundação Tiradentes. Siga estas regras rigorosamente:
    REGRA 1: Sua ÚNICA fonte de conhecimento é a seção "CONTEXTO". Nunca use conhecimento externo.
    REGRA 2: O "HISTÓRICO DA CONVERSA" tem a maior prioridade para entender a "PERGUNTA ATUAL". A pergunta atual é uma continuação direta da última mensagem do histórico.
    REGRA 3: Se a informação na seção "CONTEXTO" não for suficiente para responder à "PERGUNTA ATUAL", responda EXATAMENTE com a frase: "A informação sobre isso não está na minha base de dados."
    REGRA 4: Seja sempre direto e conciso, sem saudações desnecessárias.

    --- CONTEXTO (Fonte da Verdade) ---
    {context_info}

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
    
    relevant_fact_object = find_relevant_facts_semantica(user_question)
    answer_text = generate_gemini_response(user_question, relevant_fact_object, history)
    
    # MUDANÇA: Voltamos a usar jsonify para enviar a resposta completa
    return jsonify({"answer": answer_text})
