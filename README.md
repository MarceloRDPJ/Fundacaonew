# Assistente de Onboarding Interativo com IA

Este projeto é uma aplicação web de onboarding interativo que utiliza um assistente de IA (construído com a API Google Gemini) para responder às perguntas dos funcionários.

## Estrutura do Projeto

O projeto foi atualizado para uma arquitetura moderna que separa o backend e o frontend:

-   **Backend**: Uma API Flask (`app.py`) que lida com a lógica da IA, busca de conhecimento e serviço de arquivos.
-   **Frontend**: Uma aplicação de página única (SPA) construída com **React** e **Vite**, localizada no diretório `frontend/`. A estilização é feita com **Tailwind CSS**.

---

## Deploy no Render

Siga estas instruções para fazer o deploy desta aplicação no **Render.com**.

### 1. Criar um Novo "Web Service"

No seu painel do Render, crie um novo **Web Service** e conecte-o ao seu repositório do GitHub.

### 2. Configurações do Serviço

Durante a criação do serviço, use as seguintes configurações:

-   **Environment**: `Python`
    *(O Render detectará o `requirements.txt` e o `app.py`)*

-   **Build Command**: `./build.sh`
    *Este comando executará nosso script personalizado, que instala todas as dependências (backend e frontend) e compila a aplicação React.*

-   **Start Command**: `gunicorn app:app`
    *Este comando inicia o servidor Flask usando o Gunicorn, que é um servidor WSGI robusto para produção.*

### 3. Variáveis de Ambiente

Na aba "Environment" do seu serviço no Render, adicione as seguintes variáveis de ambiente:

-   `GEMINI_API_KEY`: Sua chave de API do Google Gemini.
-   `GOOGLE_CREDENTIALS_JSON`: O conteúdo do seu arquivo de credenciais JSON do Google para a integração com o Google Sheets.
-   `PYTHON_VERSION`: A versão do Python que você deseja usar (ex: `3.11.0`).

---

Após salvar as configurações, o Render iniciará o processo de build executando o `build.sh` e, em seguida, iniciará o serviço com o comando `gunicorn`. A aplicação estará disponível na URL fornecida pelo Render.