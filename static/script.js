// --- CONFIGURAÇÃO INICIAL ---
// Referências para todos os elementos HTML
const welcomeScreen = document.getElementById('welcome-screen');
const nameInput = document.getElementById('name-input');
const startOnboardingBtn = document.getElementById('start-onboarding-btn');
const mainContent = document.getElementById('main-content');
const assistantContainer = document.getElementById('assistant-container');
const assistantText = document.getElementById('assistant-text');
const startJourneyBtn = document.getElementById('start-journey-btn');

const videoTitle = document.getElementById('videoTitle');
const questionPrompt = document.getElementById('questionPrompt');
const yesButton = document.getElementById('yesButton');
const noButton = document.getElementById('noButton');
const qaSection = document.getElementById('qaSection');
const questionForm = document.getElementById('questionForm');
const questionInput = document.getElementById('questionInput');
const continueButton = document.getElementById('continueButton');
const status = document.getElementById('status');
const chatLog = document.getElementById('chatLog');
const finalSection = document.getElementById('finalSection');
const proofLink = document.getElementById('proofLink');

// --- DADOS DO PROJETO ---
const playlist = [
    // Lembre-se de colocar seus IDs de vídeo corretos e limpos aqui
    { title: "Tópico 1: Boas-vindas", id: "ID_DO_SEU_VIDEO_1_AQUI" },
    { title: "Tópico 2: Apresentando os Benefícios", id: "ID_DO_SEU_VIDEO_2_AQUI" },
    { title: "Tópico 3: Ferramentas de Trabalho", id: "ID_DO_SEU_VIDEO_3_AQUI" }
];
const GOOGLE_DRIVE_LINK = "COLOQUE_SEU_LINK_DA_PROVA_AQUI";

// Variáveis de estado
let currentVideoIndex = -1; // Começa em -1 para que a primeira chamada seja para o índice 0
let currentContext = null;
let player;
let userName = "";

// --- FLUXO PRINCIPAL DA APLICAÇÃO ---

// Evento do botão "Iniciar Integração" na tela de boas-vindas
startOnboardingBtn.addEventListener('click', () => {
    userName = nameInput.value.trim();
    if (userName === "") {
        alert("Por favor, digite seu nome para continuar.");
        return;
    }

    welcomeScreen.classList.add('hidden');      // <-- ESTA É A LINHA CRÍTICA QUE ESCONDE O POP-UP
    assistantContainer.classList.remove('hidden'); // Mostra o avatar da assistente

    const welcomeMessage = `Olá, ${userName}! Sou a C.I.A., sua Companheira de Integração Artificial. Estou aqui para te guiar. Pront(a) para começar?`;
    assistantText.textContent = welcomeMessage;
    speak(welcomeMessage);
});

// Evento do botão "Vamos Começar!" da assistente
startJourneyBtn.addEventListener('click', () => {
    assistantContainer.classList.add('hidden'); // Esconde a assistente
    mainContent.classList.remove('hidden');     // Mostra o conteúdo principal
    playNextVideo();                            // Inicia a jornada de vídeos
});


// --- FUNÇÕES DA API DO YOUTUBE PLAYER ---
function onYouTubeIframeAPIReady() {
    // A inicialização do player agora acontece sob demanda
}

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

function onPlayerReady(event) {
    status.textContent = "Status: Reproduzindo vídeo...";
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        status.textContent = "Status: Vídeo concluído. Responda a pergunta abaixo.";
        questionPrompt.classList.remove('hidden');
    }
}

// --- FUNÇÕES DE CONTROLE DO FLUXO ---
function playNextVideo() {
    qaSection.classList.add('hidden');
    questionPrompt.classList.add('hidden');
    chatLog.innerHTML = '';
    currentContext = null;

    currentVideoIndex++;

    if (currentVideoIndex < playlist.length) {
        loadVideoByIndex(currentVideoIndex);
    } else {
        videoTitle.classList.add('hidden');
        document.getElementById('video-player-container').classList.add('hidden');
        status.textContent = "Status: Finalizado.";
        proofLink.href = GOOGLE_DRIVE_LINK;
        finalSection.classList.remove('hidden');
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

// --- EVENTOS DOS BOTÕES INTERNOS ---
noButton.addEventListener('click', () => {
    if(player && typeof player.stopVideo === 'function') player.stopVideo();
    playNextVideo();
});
yesButton.addEventListener('click', () => {
    questionPrompt.classList.add('hidden');
    qaSection.classList.remove('hidden');
    questionInput.focus();
    status.textContent = "Status: Faça sua(s) pergunta(s) ou clique em continuar.";
});
continueButton.addEventListener('click', () => {
    if(player && typeof player.stopVideo === 'function') player.stopVideo();
    playNextVideo();
});
questionForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const userQuestion = questionInput.value;
    if (!userQuestion) return;
    addToChatLog('user', userQuestion);
    getAnswerFromAI(userQuestion);
    questionInput.value = '';
});

// --- LÓGICA DO ASSISTENTE DE IA (CHAT) ---
function speak(text, onEndCallback) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
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
            questionInput.focus();
        });
    })
    .catch(error => {
        console.error('Erro ao se comunicar com a IA:', error);
        const errorMessage = "Desculpe, estou com problemas de conexão. Por favor, tente novamente ou clique em continuar.";
        addToChatLog('bot', errorMessage);
        speak(errorMessage);
        status.textContent = "Status: Erro de comunicação.";
    });
}