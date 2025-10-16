// --- CONFIGURAÇÃO INICIAL ---
const mainContent = document.getElementById('main-content');
const assistantContainer = document.getElementById('assistant-container');
const assistantBubble = document.getElementById('assistant-bubble');
const nameInput = document.getElementById('name-input');
const submitNameBtn = document.getElementById('submit-name-btn');
const logoTopLeft = document.getElementById('logo-top-left');

const videoTitle = document.getElementById('videoTitle');
const status = document.getElementById('status');
const chatLogContainer = document.querySelector('.chat-log-container');
const chatLog = document.getElementById('chatLog');
const finalSection = document.getElementById('finalSection');
const proofLink = document.getElementById('proofLink');
const learningTrail = document.getElementById('learning-trail');
const trailList = document.getElementById('trail-list');

// --- DADOS DO PROJETO ---
const playlist = [
    { title: "Fundação Tiradentes", id: "nRuJN6wwfvs" },
    { title: "Departamento Pessoal", id: "WSfTir1w5v0" },
    { title: "Tecnologia da Informação e Informação", id: "7Bq-mzVo3XY" }
];
const GOOGLE_DRIVE_LINK = "https://forms.office.com/Pages/ResponsePage.aspx?id=SpXsTHm1dEujPhiC3aNsD84rYKMX_bBAuqpbw2JvlBNURjJSWDc2UDJOQUNGWUNSMDhXMVJTNFFUQS4u";

const DEFAULT_PASSWORD = "Tiradentes@10";


let currentVideoIndex = -1;
let player;
let userName = "";
let conversationHistory = [];
const MAX_HISTORY_LENGTH = 6;
let ptBrVoices = [];

// --- LÓGICA DE VOZ DO NAVEGADOR ---
function loadVoices() {
    ptBrVoices = window.speechSynthesis.getVoices().filter(voice => voice.lang === 'pt-BR');
}
loadVoices();
if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
}
function speak(text, onEndCallback) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (ptBrVoices.length > 0) { utterance.voice = ptBrVoices[0]; }
    utterance.lang = 'pt-BR';
    utterance.onend = () => { if (onEndCallback) onEndCallback(); };
    window.speechSynthesis.speak(utterance);
}

// --- FUNÇÕES DE LÓGICA E UTILIDADES ---
function generateUsername(fullName) {
    if (!fullName) return "";
    const prepositions = new Set(['de', 'da', 'do', 'das', 'dos']);
    const normalized = fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const parts = normalized.split(' ').filter(part => part && !prepositions.has(part));
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0];
    return `${parts[0]}.${parts[parts.length - 1]}`;
}

function copyCredentials(username, buttonElement) {
    const textToCopy = `Usuário: ${username}\nSenha: ${DEFAULT_PASSWORD}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = "Copiado!";
        buttonElement.disabled = true;
        setTimeout(() => {
            buttonElement.innerHTML = originalText;
            buttonElement.disabled = false;
        }, 2000);
    }).catch(err => {
        console.error('Falha ao copiar credenciais: ', err);
        alert("Não foi possível copiar as credenciais.");
    });
}

// NOVO: Função para criar a lista da trilha dinamicamente
function populateLearningTrail() {
    trailList.innerHTML = ''; // Limpa a lista antes de preencher
    playlist.forEach((video, index) => {
        const item = document.createElement('li');
        item.className = 'trail-item';
        item.id = `trail-item-${index}`; // ID para facilitar a seleção
        item.textContent = video.title;
        trailList.appendChild(item);
    });
}

// NOVO: Função para atualizar o estado visual da trilha
function updateTrailState(activeIndex) {
    const items = document.querySelectorAll('.trail-item');
    items.forEach((item, index) => {
        item.classList.remove('active', 'completed'); // Reseta as classes

        if (index < activeIndex) {
            item.classList.add('completed');
        } else if (index === activeIndex) {
            item.classList.add('active');
        }
    });
}

// --- FLUXO PRINCIPAL DA APLICAÇÃO ---
window.onload = () => {
    populateLearningTrail(); // Preenche a trilha assim que a página carrega
    speak("Olá! Sou Celine a Assistente Virtual que vai acompanhar sua integração hoje. Para começarmos, qual o seu nome completo?");
};

submitNameBtn.addEventListener('click', () => {
    userName = nameInput.value.trim();
    if (userName === "") { alert("Por favor, digite seu nome."); return; }

    const generatedUser = generateUsername(userName);
    const credentialsMessage = `Ótimo, ${userName.split(' ')[0]}! Suas credenciais de primeiro acesso estão abaixo.`;

    assistantBubble.innerHTML = `
        <p>${credentialsMessage}</p>
        <div class="credentials-box">
            <div class="credential-item">
                <span>Usuário:</span>
                <code>${generatedUser}</code>
            </div>
            <div class="credential-item">
                <span>Senha Padrão:</span>
                <code>${DEFAULT_PASSWORD}</code>
                <button class="copy-btn" id="copy-credentials-btn" title="Copiar usuário e senha">📋</button>
            </div>
        </div>
        <button id="ack-credentials-btn">Entendi, anotei minhas credenciais</button>
    `;
    speak(credentialsMessage);

    document.getElementById('copy-credentials-btn').addEventListener('click', function() {
        copyCredentials(generatedUser, this);
    });
    document.getElementById('ack-credentials-btn').addEventListener('click', () => {
        const welcomeMessage = `Perfeito! Quando estiver pronto(a), vamos começar.`;
        updateAssistantBubble(welcomeMessage, "start");
        speak(welcomeMessage);
    });
});

function startJourney() {
    window.speechSynthesis.cancel();
    const assistantLogo = assistantContainer.querySelector('.assistant-logo-centered');
    if (assistantLogo) assistantLogo.classList.add('hidden');
    assistantBubble.classList.add('hidden');
    assistantContainer.classList.remove('assistant-centered');
    assistantContainer.classList.add('assistant-corner');
    mainContent.classList.remove('hidden');
    logoTopLeft.classList.remove('hidden');
    learningTrail.classList.remove('hidden');
    playNextVideo();
}

// --- FUNÇÕES DA API DO YOUTUBE PLAYER ---
function onYouTubeIframeAPIReady() {
    // Cria a instância do player quando a API do YouTube estiver pronta.
    player = new YT.Player('youtubePlayer', {
        height: '100%',
        width: '100%',
        playerVars: {
            'controls': 1,
            'modestbranding': 1,
            'origin': window.location.origin,
            'autoplay': 1 // Autoplay para os vídeos carregados
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function loadVideoByIndex(index) {
    if (index < playlist.length && player && typeof player.loadVideoById === 'function') {
        updateTrailState(index);
        const videoData = playlist[index];
        videoTitle.textContent = videoData.title;
        // Carrega e reproduz o vídeo no player existente.
        player.loadVideoById(videoData.id);
    }
}

function onPlayerReady(event) {
    status.textContent = "Status: Reproduzindo vídeo...";
    forceIframeSize(); // <-- ADICIONE AQUI
    event.target.playVideo(); // Garante que o vídeo toque após o 'ready'
}

function forceIframeSize() {
    const iframe = document.getElementById('youtubePlayer'); // O ID do seu player
    if (iframe) {
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        forceIframeSize(); // Garante que o iframe mantenha o tamanho correto
        status.textContent = "Status: Vídeo concluído.";

        //Verifica se o vídeo atual é o último da playlist
        const isLastVideo = currentVideoIndex === playlist.length - 1;

        if (isLastVideo) {
            // Se for o último vídeo, mostra o prompt de Q&A completo
            updateAssistantBubble("Ficou com alguma dúvida durante a Integração?", "prompt");
        } else {
            // Se não for o último, mostra apenas uma confirmação para continuar
            updateAssistantBubble("Tudo certo? Clique abaixo para ir ao próximo tópico da integração.", "confirm_continue");
        }
        
        assistantBubble.classList.remove('hidden');
    }
}

// --- FUNÇÕES DE CONTROLE DE FLUXO E UI ---
function playNextVideo() {
    assistantBubble.classList.add('hidden');
    chatLogContainer.classList.add('hidden');
    chatLog.innerHTML = '';
    conversationHistory = [];
    currentVideoIndex++;
    if (currentVideoIndex < playlist.length) {
        loadVideoByIndex(currentVideoIndex);
    } else {

        learningTrail.classList.add('hidden'); // ESCONDE A TRILHA
        assistantContainer.classList.add('hidden');
        logoTopLeft.classList.add('hidden');

        // CORREÇÃO: Lógica de finalização ajustada
        assistantContainer.classList.add('hidden');
        logoTopLeft.classList.add('hidden');
        
        const mainContainer = document.querySelector('#main-content .container');
        
        // Garante que o container principal esteja visível, se estiver escondido
        if (mainContent.classList.contains('hidden')) {
            mainContent.classList.remove('hidden');
        }

        // Limpa o conteúdo anterior (título do vídeo, player, etc.)
        if (mainContainer) {
            mainContainer.innerHTML = ''; 
        }
        
        // Mostra a seção final e a anexa ao container limpo
        finalSection.classList.remove('hidden');
        if (mainContainer) {
            mainContainer.appendChild(finalSection);
        }
        
        // Define o link da prova no botão
        proofLink.href = GOOGLE_DRIVE_LINK;
    }
}


function updateAssistantBubble(text, mode) {
    let content = `<p>${text}</p>`;
    
    if (mode === "start") {
        content += `<button id="start-journey-btn">Vamos Começar!</button>`;
    } else if (mode === "prompt") {
        content += `<div><button id="post-video-yes">Sim</button><button id="post-video-no">Não</button></div>`;
    } else if (mode === "confirm_continue") { // NOVO: Modo para o botão simples de continuar
        content += `<button id="confirm-continue-btn">Entendi, próximo tópico &rarr;</button>`;
    }

    assistantBubble.innerHTML = content;
    addBubbleEventListeners(mode);
}

function addBubbleEventListeners(mode) {
    if (mode === "start") {
        document.getElementById('start-journey-btn').addEventListener('click', startJourney);
    } else if (mode === "prompt") {
        document.getElementById('post-video-yes').addEventListener('click', () => {
            const qaContent = `
                <div id="qaSection">
                    <form id="questionForm" class="question-form">
                        <input type="text" id="questionInput" placeholder="Digite sua dúvida aqui..." autocomplete="off">
                        <button type="submit" id="sendButton">Enviar</button>
                    </form>
                    <button id="continueButton">Finalizar Integração &rarr;</button>
                </div>`;
            assistantBubble.innerHTML = qaContent;
            addBubbleEventListeners("qa_inner");
            chatLogContainer.classList.remove('hidden');
            document.getElementById('questionInput').focus();
        });
        document.getElementById('post-video-no').addEventListener('click', () => {
            if (player && typeof player.stopVideo === 'function') player.stopVideo();
            playNextVideo();
        });
    } else if (mode === "qa_inner") {
        document.getElementById('questionForm').addEventListener('submit', (event) => {
            event.preventDefault();
            const questionInput = document.getElementById('questionInput');
            const userQuestion = questionInput.value;
            if (!userQuestion) return;
            getAnswerFromAI(userQuestion);
            questionInput.value = '';
        });
        // ALTERADO: O botão agora chama playNextVideo para ir para a tela final
        document.getElementById('continueButton').addEventListener('click', () => {
            if (player && typeof player.stopVideo === 'function') player.stopVideo();
            playNextVideo();
        });
    } else if (mode === "confirm_continue") { // NOVO: Faz o novo botão funcionar
        document.getElementById('confirm-continue-btn').addEventListener('click', () => {
            if (player && typeof player.stopVideo === 'function') player.stopVideo();
            playNextVideo();
        });
    }
}

// --- LÓGICA DA IA (COM MEMÓRIA) ---
function addToChatLog(sender, message) {
    const role = sender === 'user' ? 'user' : 'model';
    conversationHistory.push({ role: role, parts: [{ text: message }] });
    if (conversationHistory.length > MAX_HISTORY_LENGTH) {
        conversationHistory.splice(0, 2);
    }
    const messageElement = document.createElement('p');
    const senderPrefix = sender === 'user' ? 'Você' : 'Assistente';
    messageElement.className = sender === 'user' ? 'user-message' : 'bot-message';
    messageElement.innerHTML = `<strong>${senderPrefix}:</strong> ${message}`;
    chatLog.appendChild(messageElement);
    chatLog.parentElement.scrollTop = chatLog.parentElement.scrollHeight;
}

function getAnswerFromAI(question) {
    const sendButton = document.getElementById('sendButton');
    const continueButton = document.getElementById('continueButton');
    if (sendButton) sendButton.disabled = true;
    if (continueButton) continueButton.disabled = true;
    status.textContent = "Pensando...";
    addToChatLog('user', question);

    fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        
        body: JSON.stringify({
            question: question,
            history: conversationHistory.slice(0, -1),
            userName: userName 
        })
    })
    .then(response => response.json())
    .then(data => {
        const answerText = data.answer;
        addToChatLog('bot', answerText);
        
        speak(answerText, () => {
            if (sendButton) sendButton.disabled = false;
            if (continueButton) continueButton.disabled = false;
            status.textContent = "Status: Faça outra pergunta ou clique em continuar.";
            if(document.getElementById('questionInput')) {
                document.getElementById('questionInput').focus();
            }
        });
    })
    .catch(error => {
        console.error('Erro ao se comunicar com a IA:', error);
        const errorMessage = "Desculpe, estou com problemas de conexão...";
        addToChatLog('bot', errorMessage);
        if (sendButton) sendButton.disabled = false;
        if (continueButton) continueButton.disabled = false;
        status.textContent = "Status: Erro de comunicação.";
    });
}