import os
from flask import Flask
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)

# --- CÓDIGO DE DIAGNÓSTICO ---
print("--- INICIANDO TESTE DE DIAGNÓSTICO DA API GEMINI ---")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("RESULTADO: ERRO FATAL - A variável de ambiente GEMINI_API_KEY não foi encontrada.")
else:
    print("RESULTADO: Chave de API encontrada no ambiente.")
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        print("RESULTADO: Biblioteca GenAI configurada com sucesso.")

        # Tenta listar os modelos - o teste de fogo
        print("RESULTADO: Tentando listar modelos da API do Gemini...")
        model_list = [m.name for m in genai.list_models()]
        print("RESULTADO: SUCESSO! Modelos encontrados:", model_list)

    except Exception as e:
        print(f"RESULTADO: ERRO CRÍTICO DURANTE O TESTE - {e}")

print("--- FIM DO TESTE DE DIAGNÓSTICO ---")
# ------------------------------------

@app.route('/')
def index():
    return "Página de teste de diagnóstico do Gemini."

# A rota /ask não é necessária para este teste