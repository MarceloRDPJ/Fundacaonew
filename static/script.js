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

// --- DADOS DO PROJETO ---
const playlist = [
    { title: "Tópico 1: Boas-vindas", id: "ID_DO_SEU_VIDEO_1_AQUI" },
    { title: "Tópico 2: Apresentando os Benefícios", id: "ID_DO_SEU_VIDEO_2_AQUI" }
];
const GOOGLE_DRIVE_LINK = "SEU_LINK_DA_PROVA_AQUI";
const DEFAULT_PASSWORD = "Tiradentes@10";

// --- Variáveis de Estado ---
let currentVideoIndex = -1;
let player;
let userName = "";
let conversationHistory = [];
const MAX_HISTORY_LENGTH = 6;
let ptBrVoices = [];

// --- LÓGICA DE VOZ DO NAVEGADOR ---
function loadVoices() { ptBrVoices = window.speechSynthesis.getVoices().filter(voice => voice.lang === 'pt-BR'); }
loadVoices();
if (window.speechSynthesis.onvoiceschanged !== undefined) { window.speechSynthesis.onvoiceschanged = loadVoices; }

function speak(text, onEndCallback) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (ptBrVoices.length > 0) { utterance.voice = ptBrVoices[0]; }
    utterance.lang = 'pt-BR';
    utterance.onend = () => { if (onEndCallback) onEndCallback(); };
    window.speechSynthesis.speak(utterance);
}

// --- FUNÇÕES DE LÓGICA E UTILIDADES ---
/**
 * Gera um nome de usuário inteligente no formato 'primeironome.ultimonome', ignorando preposições.
 */
function generateUsername(fullName) {
    if (!fullName) return "";
    const prepositions = new Set(['de', 'da', 'do', 'das', 'dos']);
    const normalized = fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const parts = normalized.split(' ').filter(part => part && !prepositions.has(part));
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0];
    return `${parts[0]}.${parts[parts.length - 1]}`;
}

/**
 * Copia a senha e dá um feedback visual.
 */
function copyPassword(buttonElement) {
    navigator.clipboard.writeText(DEFAULT_PASSWORD).then(() => {
        const originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = "Copiado!";
        buttonElement.disabled = true;
        setTimeout(() => {
            buttonElement.innerHTML = originalText;
            buttonElement.disabled = false;
        }, 2000); // Volta ao normal após 2 segundos
    }).catch(err => {
        console.error('Falha ao copiar a senha: ', err);
        alert("Não foi possível copiar a senha.");
    });
}

// --- FLUXO PRINCIPAL DA APLICAÇÃO ---
window.onload = () => {
    speak("Olá! Para começarmos, qual o seu nome completo?");
};

submitNameBtn.addEventListener('click', () => {
    userName = nameInput.value.trim();
    if (userName === "") { alert("Por favor, digite seu nome completo."); return; }

    const generatedUser = generateUsername(userName);
    const credentialsMessage = `Ótimo, ${userName.split(' ')[0]}! Suas credenciais de primeiro acesso estão abaixo. Anote-as em um local seguro.`;

    // Atualiza o balão para mostrar as credenciais
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
                <button class="copy-btn" id="copy-password-btn" title="Copiar senha">📋</button>
            </div>
        </div>
        <button id="ack-credentials-btn">Entendi, anotei minhas credenciais</button>
    `;
    speak(credentialsMessage);

    // Adiciona os eventos aos novos botões
    document.getElementById('copy-password-btn').addEventListener('click', function() {
        copyPassword(this);
    });
    document.getElementById('ack-credentials-btn').addEventListener('click', () => {
        const welcomeMessage = `Perfeito! Quando estiver pronto(a) para começar sua jornada de integração, clique no botão abaixo.`;
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
    playNextVideo();
}

// --- FUNÇÕES DA API DO YOUTUBE PLAYER E CONTROLE DE FLUXO ---
function onYouTubeIframeAPIReady() {}

function loadVideoByIndex(index) {
    if (index < playlist.length) {
        const videoData = playlist[index];
        videoTitle.textContent = videoData.title;
        if (!player) {
            player = new YT.Player('youtubePlayer', {
                height: '390', width: '640', videoId: videoData.id,
                playerVars: { 'autoplay': 1, 'controls': 1, 'modestbranding': 1, 'origin': window.location.origin },
                events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange }
            });
        } else {
            player.loadVideoById(videoData.id);
            player.playVideo();
        }
    }
}

function onPlayerReady(event) { status.textContent = "Status: Reproduzindo vídeo..."; }

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        status.textContent = "Status: Vídeo concluído.";
        updateAssistantBubble("Ficou com alguma dúvida sobre este tópico?", "prompt");
        assistantBubble.classList.remove('hidden');
    }
}

function playNextVideo() {
    assistantBubble.classList.add('hidden');
    chatLogContainer.classList.add('hidden');
    chatLog.innerHTML = '';
    conversationHistory = [];
    currentVideoIndex++;
    if (currentVideoIndex < playlist.length) {
        loadVideoByIndex(currentVideoIndex);
    } else {
        assistantContainer.classList.add('hidden');
        logoTopLeft.classList.add('hidden');
        mainContent.classList.remove('hidden');
        const mainContainer = document.querySelector('#main-content .container');
        if (mainContainer) mainContainer.innerHTML = '';
        finalSection.classList.remove('hidden');
        if (mainContainer) mainContainer.appendChild(finalSection);
        status.textContent = "Status: Finalizado.";
    }
}

function updateAssistantBubble(text, mode) {
    let content = `<p>${text}</p>`;
    if (mode === "start") {
        content += `<button id="start-journey-btn">Vamos Começar!</button>`;
    } else if (mode === "prompt") {
        content += `<div><button id="post-video-yes">Sim</button><button id="post-video-no">Não</button></div>`;
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
                    <button id="continueButton">Continuar para o próximo vídeo &rarr;</button>
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
        document.getElementById('continueButton').addEventListener('click', () => {
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
            history: conversationHistory.slice(0, -1)
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
    });
}