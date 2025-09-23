// --- CONFIGURAÇÃO INICIAL ---
const mainContent = document.getElementById('main-content');
const assistantContainer = document.getElementById('assistant-container');
const assistantBubble = document.getElementById('assistant-bubble');
const nameInput = document.getElementById('name-input');
const submitNameBtn = document.getElementById('submit-name-btn');
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

let ptBrVoices = []; // Variável para as vozes do navegador

let currentVideoIndex = -1;
let currentContext = null;
let player;
let userName = "";

// --- LÓGICA PARA CARREGAR AS VOZES DO NAVEGADOR ---
function loadVoices() {
    ptBrVoices = window.speechSynthesis.getVoices().filter(voice => voice.lang === 'pt-BR');
}
loadVoices();
if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

// --- FLUXO PRINCIPAL DA APLICAÇÃO ---
window.onload = () => {
    speak("Olá! Para começarmos, qual o seu nome?");
};

submitNameBtn.addEventListener('click', () => {
    userName = nameInput.value.trim();
    if (userName === "") {
        alert("Por favor, digite seu nome.");
        return;
    }
    const welcomeMessage = `Prazer em conhecer, ${userName}! Sou a CELINE, sua Companheira de Integração. Estou aqui para te guiar. Quando estiver pronto(a), vamos começar.`;
    updateAssistantBubble(welcomeMessage, "start");
    speak(welcomeMessage);
});

function startJourney() {
    window.speechSynthesis.cancel();
    assistantBubble.classList.add('hidden');
    assistantContainer.classList.remove('assistant-centered');
    assistantContainer.classList.add('assistant-corner');
    mainContent.classList.remove('hidden');
    playNextVideo();
}

// --- FUNÇÕES DA API DO YOUTUBE PLAYER ---
function onYouTubeIframeAPIReady() {}

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

// --- FUNÇÕES DE CONTROLE DO FLUXO ---
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
        document.getElementById('post-video-no').addEventListener('click', playNextVideo);
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
        document.getElementById('continueButton').addEventListener('click', playNextVideo);
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

// --- LÓGICA DO ASSISTENTE DE IA (CHAT) ---
function speak(text, onEndCallback) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (ptBrVoices.length > 0) {
        utterance.voice = ptBrVoices[0];
    }
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
        const answerText = data.answer; // Resposta em TEXTO
        currentContext = data.context;
        addToChatLog('bot', answerText);
        
        speak(answerText, () => { // Usa a função speak do NAVEGADOR
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
    });
}