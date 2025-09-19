// --- CONFIGURAÇÃO INICIAL ---
const videoTitle = document.getElementById('videoTitle');
// REMOVIDO: const videoPlayer = document.getElementById('videoPlayer');
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
// MUDANÇA: Use os IDs dos vídeos do YouTube (a parte final do URL de embed)
const playlist = [
    { title: "Tópico 1: Apresentando os Benefícios", id: "TfWqNT4C15w" },
    { title: "Tópico 2: Ferramentas de Trabalho", id: "nRuJN6wwfvs" }
    // Adicione mais vídeos aqui se precisar, sempre usando apenas o ID limpo
];

const GOOGLE_DRIVE_LINK = "COLOQUE_SEU_LINK_DA_PROVA_AQUI";

let currentVideoIndex = 0;
let currentContext = null;
let player; // Variável global para o player do YouTube

// --- FUNÇÕES DA API DO YOUTUBE PLAYER ---
// Esta função será chamada automaticamente quando a API do YouTube estiver pronta
function onYouTubeIframeAPIReady() {
    status.textContent = "Status: Pronto. Clique play para começar.";
    loadVideoByIndex(currentVideoIndex);
}

/**
 * Carrega e inicia um vídeo do YouTube.
 * @param {number} index - O índice do vídeo na playlist.
 */
function loadVideoByIndex(index) {
    if (index < playlist.length) {
        const videoData = playlist[index];
        videoTitle.textContent = videoData.title;
        
        if (!player) {
            // Cria o player do YouTube pela primeira vez
            player = new YT.Player('youtubePlayer', {
                height: '390',
                width: '640',
                videoId: videoData.id,
                playerVars: {
                    'autoplay': 0, // Desativar autoplay inicial
                    'controls': 1,
                    'modestbranding': 1 // Tentar reduzir a logo do YouTube
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
        } else {
            // Se o player já existe, apenas carrega um novo vídeo
            player.loadVideoById(videoData.id);
            player.pauseVideo(); // Começa pausado
        }
    } else {
        // Fim da playlist: exibe a seção final com o link da prova
        videoTitle.classList.add('hidden');
        document.getElementById('video-player-container').classList.add('hidden'); // Esconde o contêiner do player
        status.textContent = "Status: Finalizado.";
        
        proofLink.href = GOOGLE_DRIVE_LINK;
        finalSection.classList.remove('hidden');
    }
}

/**
 * Chamado quando o player do YouTube está pronto.
 */
function onPlayerReady(event) {
    // Se quiser autoplay no primeiro vídeo, use event.target.playVideo();
    // No nosso caso, queremos que o usuário dê play
    status.textContent = "Status: Pronto para começar. Dê Play no vídeo.";
}

/**
 * Chamado quando o estado do player do YouTube muda (tocando, pausado, terminou, etc.).
 * @param {Object} event - O objeto de evento do player.
 */
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        // O vídeo terminou de tocar
        status.textContent = "Status: Vídeo concluído. Responda a pergunta abaixo.";
        questionPrompt.classList.remove('hidden'); // Mostra os botões Sim/Não
    }
}

// --- FUNÇÕES DE CONTROLE DO FLUXO (Adaptadas) ---

function playNextVideo() {
    qaSection.classList.add('hidden');
    questionPrompt.classList.add('hidden');
    chatLog.innerHTML = '';
    currentContext = null; // Limpa o contexto para o novo tópico

    currentVideoIndex++;
    if (currentVideoIndex < playlist.length) {
        loadVideoByIndex(currentVideoIndex); // Carrega o próximo vídeo
    } else {
        // Fim da playlist: exibe a seção final
        videoTitle.classList.add('hidden');
        document.getElementById('video-player-container').classList.add('hidden'); // Esconde o contêiner do player
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

// --- EVENTOS DE INTERAÇÃO DO USUÁRIO ---
// Evento 'ended' do videoPlayer foi removido pois agora usamos onPlayerStateChange

noButton.addEventListener('click', () => {
    player.stopVideo(); // Para o vídeo atual antes de ir para o próximo
    playNextVideo();
});

yesButton.addEventListener('click', () => {
    questionPrompt.classList.add('hidden');
    qaSection.classList.remove('hidden');
    questionInput.focus();
    status.textContent = "Status: Faça sua(s) pergunta(s) ou clique em continuar.";
});

continueButton.addEventListener('click', () => {
    player.stopVideo(); // Para o vídeo atual
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

// window.onload agora só garante que a API do YouTube será carregada
// A função onYouTubeIframeAPIReady() é que inicia o processo de carregar o primeiro vídeo.
window.onload = () => {
    // Nenhuma ação específica aqui, a API do YouTube fará o resto.
    // O player só será inicializado quando onYouTubeIframeAPIReady for chamado.
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