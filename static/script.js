// --- CONFIGURAÇÃO INICIAL ---
const mainContent = document.getElementById('main-content');
const assistantContainer = document.getElementById('assistant-container');
const assistantBubble = document.getElementById('assistant-bubble');
const nameInput = document.getElementById('name-input');
const submitNameBtn = document.getElementById('submit-name-btn');

// ... (outras referências de elementos)
const videoTitle = document.getElementById('videoTitle');
const status = document.getElementById('status');
const chatLogContainer = document.querySelector('.chat-log-container');
const chatLog = document.getElementById('chatLog');
const finalSection = document.getElementById('finalSection');
const proofLink = document.getElementById('proofLink');


// --- DADOS DO PROJETO ---
const playlist = [
    { title: "Tópico 1: Boas-vindas", id: "TfWqNT4C15w" },
    { title: "Tópico 2: Apresentando os Benefícios", id: "nRuJN6wwfvs" }
];
const GOOGLE_DRIVE_LINK = "https://forms.office.com/Pages/ResponsePage.aspx?id=SpXsTHm1dEujPhiC3aNsD84rYKMX_bBAuqpbw2JvlBNURjJSWDc2UDJOQUNGWUNSMDhXMVJTNFFUQS4u";

const DEFAULT_PASSWORD = "Tiradentes@10";

let currentVideoIndex = -1;
let currentContext = null;
let player;
let userName = "";

// --- FUNÇÕES DE LÓGICA E UTILIDADES ---

/**
 * Gera um nome de usuário no formato 'primeironome.ultimonome'.
 * @param {string} fullName - O nome completo do usuário.
 * @returns {string} O nome de usuário formatado.
 */
function generateUsername(fullName) {
    if (!fullName) return "";
    // Normaliza o nome (remove acentos e converte para minúsculas)
    const normalized = fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const parts = normalized.split(' ').filter(part => part); // Remove espaços extras
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0];
    return `${parts[0]}.${parts[parts.length - 1]}`;
}

/**
 * Copia um texto para a área de transferência.
 * @param {string} text - O texto a ser copiado.
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("Senha copiada para a área de transferência!");
    }).catch(err => {
        console.error('Falha ao copiar a senha: ', err);
    });
}


// --- FLUXO PRINCIPAL DA APLICAÇÃO ---

window.onload = () => {
    speak("Olá! Para começarmos, qual o seu nome completo?");
};

// Evento do botão que envia o nome
submitNameBtn.addEventListener('click', () => {
    userName = nameInput.value.trim();
    if (userName === "") {
        alert("Por favor, digite seu nome completo.");
        return;
    }

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
                <button class="copy-icon" onclick="copyToClipboard('${DEFAULT_PASSWORD}')" title="Copiar senha">📋</button>
            </div>
        </div>
        <button id="ack-credentials-btn">Entendi, anotei minhas credenciais</button>
    `;
    speak(credentialsMessage);

    // Adiciona o evento ao novo botão de confirmação
    document.getElementById('ack-credentials-btn').addEventListener('click', () => {
        const welcomeMessage = `Perfeito! Quando estiver pronto(a) para começar sua jornada de integração, clique no botão abaixo.`;
        updateAssistantBubble(welcomeMessage, "start");
        speak(welcomeMessage);
    });
});

function startJourney() {
    window.speechSynthesis.cancel();
    assistantBubble.classList.add('hidden');
    assistantContainer.classList.remove('assistant-centered');
    assistantContainer.classList.add('assistant-corner');
    mainContent.classList.remove('hidden');
    playNextVideo();
}


// --- FUNÇÕES DA API DO YOUTUBE, CONTROLE DE FLUXO, CHAT E IA ---
// (O restante do código permanece o mesmo da versão anterior)

function onYouTubeIframeAPIReady() { /* A inicialização agora acontece sob demanda */ }

function loadVideoByIndex(index) {
    if (index < playlist.length) {
        const videoData = playlist[index];
        videoTitle.textContent = videoData.title;
        if (!player) {
            player = new YT.Player('youtubePlayer', {
                height: '390', width: '640', videoId: videoData.id,
                playerVars: { 'autoplay': 1, 'controls': 1, 'modestbranding': 1 },
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
    currentContext = null;
    currentVideoIndex++;
    if (currentVideoIndex < playlist.length) {
        loadVideoByIndex(currentVideoIndex);
    } else {
        assistantContainer.classList.add('hidden');
        videoTitle.classList.add('hidden');
        document.getElementById('video-player-container').classList.add('hidden');
        status.textContent = "Status: Finalizado.";
        proofLink.href = GOOGLE_DRIVE_LINK;
        finalSection.classList.remove('hidden');
    }
}

function updateAssistantBubble(text, mode) {
    let content = `<p>${text}</p>`;
    if (mode === "start") {
        content += `<button id="start-journey-btn">Vamos Começar!</button>`;
    } else if (mode === "prompt") {
        content += `<div><button id="post-video-yes">Sim</button><button id="post-video-no">Não</button></div>`;
    } else if (mode === "qa") {
        content = `
            <div id="qaSection">
                <form id="questionForm" class="question-form">
                    <input type="text" id="questionInput" placeholder="Digite sua dúvida aqui..." autocomplete="off">
                    <button type="submit" id="sendButton">Enviar</button>
                </form>
                <button id="continueButton">Continuar para o próximo vídeo &rarr;</button>
            </div>`;
    }
    assistantBubble.innerHTML = content;
    addBubbleEventListeners(mode);
}

function addBubbleEventListeners(mode) {
    if (mode === "start") {
        document.getElementById('start-journey-btn').addEventListener('click', startJourney);
    } else if (mode === "prompt") {
        document.getElementById('post-video-yes').addEventListener('click', () => {
            updateAssistantBubble("", "qa");
            chatLogContainer.classList.remove('hidden');
            document.getElementById('questionInput').focus();
        });
        document.getElementById('post-video-no').addEventListener('click', () => {
            if (player && typeof player.stopVideo === 'function') player.stopVideo();
            playNextVideo();
        });
    } else if (mode === "qa") {
        document.getElementById('questionForm').addEventListener('submit', (event) => {
            event.preventDefault();
            const questionInput = document.getElementById('questionInput');
            const userQuestion = questionInput.value;
            if (!userQuestion) return;
            addToChatLog('user', userQuestion);
            getAnswerFromAI(userQuestion);
            questionInput.value = '';
        });
        document.getElementById('continueButton').addEventListener('click', () => {
            if (player && typeof player.stopVideo === 'function') player.stopVideo();
            playNextVideo();
        });
    }
}

function addToChatLog(sender, message) {
    const messageElement = document.createElement('p');
    const senderPrefix = sender === 'user' ? 'Você' : 'Assistente';
    messageElement.className = sender === 'user' ? 'user-message' : 'bot-message';
    messageElement.innerHTML = `<strong>${senderPrefix}:</strong> ${message}`;
    chatLog.appendChild(messageElement);
    chatLog.parentElement.scrollTop = chatLog.parentElement.scrollHeight;
}

function speak(text, onEndCallback) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Usando a voz do navegador por enquanto
    utterance.lang = 'pt-BR';
    utterance.onend = () => { if (onEndCallback) onEndCallback(); };
    window.speechSynthesis.speak(utterance);
}

function getAnswerFromAI(question) {
    status.textContent = "Pensando...";
    fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question, context: currentContext })
    })
    .then(response => response.json())
    .then(data => {
        const answer = data.answer;
        currentContext = data.context;
        addToChatLog('bot', answer);
        speak(answer, () => {
            status.textContent = "Status: Faça outra pergunta ou clique em continuar.";
            if(document.getElementById('questionInput')) {
                document.getElementById('questionInput').focus();
            }
        });
    })
    .catch(error => {
        console.error('Erro ao se comunicar com a IA:', error);
        // ... (código de erro)
    });
}