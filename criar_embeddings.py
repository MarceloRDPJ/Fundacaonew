import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY não encontrada no arquivo .env")
genai.configure(api_key=GEMINI_API_KEY)

INPUT_FILENAME = "knowledge_base.json"
OUTPUT_FILENAME = "knowledge_base_com_embeddings.json"
MODEL = "models/text-embedding-004"

print("Iniciando a geração de embeddings enriquecidos...")

with open(INPUT_FILENAME, 'r', encoding='utf-8') as f:
    knowledge_base = json.load(f)

knowledge_base_com_embeddings = knowledge_base.copy()

for fact in knowledge_base_com_embeddings['fatos']:
    # MUDANÇA CRÍTICA: Juntamos o tópico, a informação e as palavras-chave
    # para criar um embedding muito mais rico e preciso.
    keywords_text = ", ".join(fact.get("palavras_chave_busca", []))
    text_to_embed = f"Tópico: {fact['topico']}. Informação: {fact['informacao']}. Palavras relacionadas: {keywords_text}"
    
    print(f"Gerando embedding para o tópico: {fact['topico']}...")
    
    try:
        result = genai.embed_content(model=MODEL, content=text_to_embed)
        fact['embedding'] = result['embedding']
    except Exception as e:
        print(f"ERRO ao gerar embedding para '{fact['topico']}': {e}")
        fact['embedding'] = None

with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as f:
    json.dump(knowledge_base_com_embeddings, f, ensure_ascii=False, indent=4)

print("-" * 20)
print(f"SUCESSO! O arquivo '{OUTPUT_FILENAME}' foi recriado com embeddings enriquecidos.")