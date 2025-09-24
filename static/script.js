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

const DEFAULT_PASSWORD = "Tiradentes@10";


let currentVideoIndex = -1;
let player;
let userName = "";

// NOVO: Variável para guardar o histórico da conversa
let conversationHistory = [];
const MAX_HISTORY_LENGTH = 6; // Guarda as últimas 6 mensagens (3 turnos)

// --- FUNÇÕES DE LÓGICA E UTILIDADES ---
// (Funções de controle do fluxo de vídeo e da assistente permanecem as mesmas)
window.onload = () => { speak("Olá! Para começarmos, qual o seu nome?"); };
submitNameBtn.addEventListener('click', () => {
    userName = nameInput.value.trim();
    if (userName === "") { alert("Por favor, digite seu nome."); return; }
    const welcomeMessage = `Prazer em conhecer, ${userName}! Sou a C.I.A., sua Companheira de Integração. Quando estiver pronto(a), vamos começar.`;
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
function onYouTubeIframeAPIReady() { /* Inicialização sob demanda */ }
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
    conversationHistory = []; // Limpa o histórico para o novo tópico
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
function updateAssistantBubble(text, mode) { /* ... (sem alterações) ... */ }
function addBubbleEventListeners(mode) { /* ... (sem alterações) ... */ }

// --- LÓGICA DO CHAT (COM MEMÓRIA) ---
/**
 * Adiciona uma mensagem ao log de chat na tela E ao histórico de conversa.
 */
function addToChatLog(sender, message) {
    // Adiciona ao histórico
    conversationHistory.push({
        role: sender, // 'user' ou 'bot'
        text: message
    });
    // Garante que o histórico não cresça indefinidamente
    if (conversationHistory.length > MAX_HISTORY_LENGTH) {
        conversationHistory.shift(); // Remove a mensagem mais antiga
    }

    // Adiciona à tela
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
    utterance.lang = 'pt-BR';
    utterance.onend = () => { if (onEndCallback) onEndCallback(); };
    window.speechSynthesis.speak(utterance);
}

/**
 * Envia a pergunta E o histórico da conversa para o back-end.
 */
function getAnswerFromAI(question) {
    status.textContent = "Pensando...";
    fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            question: question,
            history: conversationHistory // NOVO: Enviando o histórico
        })
    })
    .then(response => response.json())
    .then(data => {
        const answerText = data.answer;
        addToChatLog('bot', answerText); // A resposta também é adicionada ao histórico
        
        speak(answerText, () => {
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