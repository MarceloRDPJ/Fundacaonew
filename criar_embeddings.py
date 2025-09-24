import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Carrega a chave de API do seu arquivo .env
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY não encontrada no arquivo .env")
genai.configure(api_key=GEMINI_API_KEY)

# Nome dos arquivos
INPUT_FILENAME = "knowledge_base.json"
OUTPUT_FILENAME = "knowledge_base_com_embeddings.json"
MODEL = "models/text-embedding-004" # Modelo de embedding do Google

print("Iniciando a geração de embeddings...")

# Carrega a base de conhecimento original
with open(INPUT_FILENAME, 'r', encoding='utf-8') as f:
    knowledge_base = json.load(f)

# Cria uma cópia para não modificar o original
knowledge_base_com_embeddings = knowledge_base.copy()

# Itera sobre cada fato e gera o embedding
for fact in knowledge_base_com_embeddings['fatos']:
    text_to_embed = f"Tópico: {fact['topico']}\nInformação: {fact['informacao']}"
    print(f"Gerando embedding para o tópico: {fact['topico']}...")
    
    try:
        # Chama a API do Gemini para criar o embedding (vetor numérico)
        result = genai.embed_content(model=MODEL, content=text_to_embed)
        fact['embedding'] = result['embedding']
    except Exception as e:
        print(f"ERRO ao gerar embedding para '{fact['topico']}': {e}")
        # Se der erro, pula este fato, mas continua com os outros
        fact['embedding'] = None


# Salva o novo arquivo JSON com os embeddings
with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as f:
    json.dump(knowledge_base_com_embeddings, f, ensure_ascii=False, indent=4)

print("-" * 20)
print(f"SUCESSO! O arquivo '{OUTPUT_FILENAME}' foi criado com os embeddings.")
print("Agora, suba este novo arquivo para o seu GitHub e atualize o 'app.py' para usá-lo.")