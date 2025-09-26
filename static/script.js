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
    { title: "Tópico 1: Boas-vindas", id: "TfWqNT4C15w" },
    { title: "Tópico 2: Apresentando os Benefícios", id: "nRuJN6wwfvs" }
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
    if (ptBrVoices.length > 0) {
        utterance.voice = ptBrVoices[0];
    }
    utterance.lang = 'pt-BR';
    utterance.onend = () => { if (onEndCallback) onEndCallback(); };
    window.speechSynthesis.speak(utterance);
}

// --- FLUXO PRINCIPAL DA APLICAÇÃO ---
window.onload = () => {
    speak("Olá! Para começarmos, qual o seu nome completo?");
};

submitNameBtn.addEventListener('click', () => {
    userName = nameInput.value.trim();
    if (userName === "") {
        alert("Por favor, digite seu nome.");
        return;
    }
    const welcomeMessage = `Prazer em conhecer, ${userName}! Sou a C.I.A., sua Companheira de Integração. Quando estiver pronto(a), vamos começar.`;
    updateAssistantBubble(welcomeMessage, "start");
    speak(welcomeMessage);
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

// --- FUNÇÕES DA API DO YOUTUBE PLAYER ---
function onYouTubeIframeAPIReady() {}

function loadVideoByIndex(index) {
    if (index < playlist.length) {
        const videoData = playlist[index];
        videoTitle.textContent = videoData.title;
        if (!player) {
            player = new YT.Player('youtubePlayer', {
                height: '390', width: '640', videoId: videoData.id,
                playerVars: { 
                    'autoplay': 1, 
                    'controls': 1, 
                    'modestbranding': 1,
                    'origin': window.location.origin 
                },
                events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange }
            });
        } else {
            player.loadVideoById(videoData.id);
            player.playVideo();
        }
    }
}

function onPlayerReady(event) {
    status.textContent = "Status: Reproduzindo vídeo...";
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        status.textContent = "Status: Vídeo concluído.";
        updateAssistantBubble("Ficou com alguma dúvida sobre este tópico?", "prompt");
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
        assistantContainer.classList.add('hidden');
        logoTopLeft.classList.add('hidden');
        mainContent.classList.remove('hidden');
        const mainContainer = document.querySelector('#main-content .container');
        if (mainContainer) mainContainer.innerHTML = ''; // Limpa o conteúdo
        
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
    .then(response => response.json()) // Espera o JSON completo
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