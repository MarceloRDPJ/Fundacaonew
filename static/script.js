// --- CONFIGURAÇÃO INICIAL ---
const videoTitle = document.getElementById('videoTitle');
const videoPlayer = document.getElementById('videoPlayer');
const questionPrompt = document.getElementById('questionPrompt');
const yesButton = document.getElementById('yesButton');
const noButton = document.getElementById('noButton');
const qaSection = document.getElementById('qaSection');
const questionForm = document.getElementById('questionForm');
const questionInput = document.getElementById('questionInput');
const continueButton = document.getElementById('continueButton');
const status = document.getElementById('status');
const chatLog = document.getElementById('chatLog');
// NOVO: Referências para a seção final
const finalSection = document.getElementById('finalSection');
const proofLink = document.getElementById('proofLink');

// --- DADOS DO PROJETO ---
const playlist = [
    { title: "Tópico 1: Boas-vindas", src: "/static/videos/video1.mp4" },
    { title: "Tópico 2: Apresentando os Benefícios", src: "/static/videos/video2.mp4" }
];

// IMPORTANTE: Cole o link compartilhável do seu Google Drive (ou Forms) aqui!
const GOOGLE_DRIVE_LINK = "https://forms.office.com/Pages/ResponsePage.aspx?id=SpXsTHm1dEujPhiC3aNsD84rYKMX_bBAuqpbw2JvlBNURjJSWDc2UDJOQUNGWUNSMDhXMVJTNFFUQS4u";

let currentVideoIndex = 0;
let currentContext = null;

// --- FUNÇÕES DE CONTROLE DO FLUXO ---
function playNextVideo() {
    qaSection.classList.add('hidden');
    questionPrompt.classList.add('hidden');
    chatLog.innerHTML = '';

    currentVideoIndex++;
    if (currentVideoIndex < playlist.length) {
        const video = playlist[currentVideoIndex];
        videoTitle.textContent = video.title;
        videoPlayer.src = video.src;
        videoPlayer.play();
        status.textContent = "Status: Reproduzindo vídeo...";
    } else {
        // MUDANÇA: Lógica para o fim da playlist
        videoTitle.classList.add('hidden');
        videoPlayer.classList.add('hidden');
        status.textContent = "Status: Finalizado.";
        
        // Define o link da prova e mostra a seção final
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

// --- EVENTOS DE INTERAÇÃO DO USUÁRIO ---
videoPlayer.addEventListener('ended', () => {
    status.textContent = "Status: Vídeo concluído. Responda a pergunta abaixo.";
    questionPrompt.classList.remove('hidden');
});

noButton.addEventListener('click', playNextVideo);

yesButton.addEventListener('click', () => {
    questionPrompt.classList.add('hidden');
    qaSection.classList.remove('hidden');
    questionInput.focus();
    status.textContent = "Status: Faça sua(s) pergunta(s) ou clique em continuar.";
});

continueButton.addEventListener('click', playNextVideo);

questionForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const userQuestion = questionInput.value;
    if (!userQuestion) return;
    addToChatLog('user', userQuestion);
    getAnswerFromAI(userQuestion);
    questionInput.value = '';
});

window.onload = () => {
    status.textContent = "Status: Carregando...";
    if (playlist.length > 0) {
        const firstVideo = playlist[0];
        videoTitle.textContent = firstVideo.title;
        videoPlayer.src = firstVideo.src;
        status.textContent = "Status: Pronto. Clique play para começar.";
    }
};

// --- LÓGICA DO ASSISTENTE DE IA ---
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