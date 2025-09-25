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


// Variáveis de estado
let currentVideoIndex = -1;
let player;
let userName = "";
let conversationHistory = [];
const MAX_HISTORY_LENGTH = 6; // Guarda as últimas 6 mensagens (3 turnos)

// --- LÓGICA DE VOZ DO NAVEGADOR ---
let ptBrVoices = [];
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
    speak("Olá! Para começarmos, qual o seu nome?");
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
    assistantBubble.classList.add('hidden');
    assistantContainer.classList.remove('assistant-centered');
    assistantContainer.classList.add('assistant-corner');
    mainContent.classList.remove('hidden');
    playNextVideo();
}

// --- FUNÇÕES DA API DO YOUTUBE PLAYER ---
function onYouTubeIframeAPIReady() { /* A inicialização acontece sob demanda */ }

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
        const yesBtn = document.getElementById('post-video-yes');
        const noBtn = document.getElementById('post-video-no');
        
        yesBtn.addEventListener('click', () => {
            updateAssistantBubble("", "qa");
            chatLogContainer.classList.remove('hidden');
            document.getElementById('questionInput').focus();
        });
        noBtn.addEventListener('click', () => {
            if (player && typeof player.stopVideo === 'function') player.stopVideo();
            playNextVideo();
        });
    } else if (mode === "qa") {
        const form = document.getElementById('questionForm');
        const continueBtn = document.getElementById('continueButton');
        
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const questionInput = document.getElementById('questionInput');
            const userQuestion = questionInput.value;
            if (!userQuestion) return;
            addToChatLog('user', userQuestion);
            getAnswerFromAI(userQuestion);
            questionInput.value = '';
        });
        continueBtn.addEventListener('click', () => {
            if (player && typeof player.stopVideo === 'function') player.stopVideo();
            playNextVideo();
        });
    }
}

function startTypingAnimation(botMessageElement, onFinished) {
    // Limpa qualquer animação anterior que possa estar rodando
    if (typingInterval) clearInterval(typingInterval);

    typingInterval = setInterval(() => {
        // Se há caracteres na fila, digita o próximo
        if (characterQueue.length > 0) {
            const char = characterQueue.shift(); // Pega o primeiro caractere da fila
            botMessageElement.innerHTML += char;
            chatLog.parentElement.scrollTop = chatLog.parentElement.scrollHeight;
        } else {
            // Se a fila está vazia, para o loop e chama a função de finalização
            clearInterval(typingInterval);
            if (onFinished) {
                onFinished();
            }
        }
    }, TYPING_SPEED);
}

function addToChatLog(sender, message, isFinalizing = false) {
    const role = sender === 'user' ? 'user' : 'model';
    
    if(sender === 'user' || isFinalizing) {
        conversationHistory.push({ role: role, parts: [{ text: message }] });
        if (conversationHistory.length > MAX_HISTORY_LENGTH) {
            conversationHistory.splice(0, 2);
        }
    }

    if (sender === 'user') {
        const messageElement = document.createElement('p');
        messageElement.className = 'user-message';
        messageElement.innerHTML = `<strong>Você:</strong> ${message}`;
        chatLog.appendChild(messageElement);
        chatLog.parentElement.scrollTop = chatLog.parentElement.scrollHeight;
    }
}


// --- LÓGICA DA IA (COM MEMÓRIA) ---
async function getAnswerFromAI(question) {
    const sendButton = document.getElementById('sendButton');
    const continueButton = document.getElementById('continueButton');

    if (sendButton) sendButton.disabled = true;
    if (continueButton) continueButton.disabled = true;
    status.textContent = "Pensando...";

    addToChatLog('user', question);

    const botMessageElement = document.createElement('p');
    botMessageElement.className = 'bot-message';
    botMessageElement.innerHTML = `<strong>Assistente:</strong> `;
    chatLog.appendChild(botMessageElement);
    chatLog.parentElement.scrollTop = chatLog.parentElement.scrollHeight;

    let fullResponse = "";
    let streamFinished = false;

    // A função que será chamada quando a digitação terminar
    const onTypingFinished = () => {
        // Só executa se a conexão já tiver terminado
        if (!streamFinished) return;
        
        addToChatLog('bot', fullResponse, true); // Adiciona a resposta completa ao histórico lógico
        speak(fullResponse); // Toca a voz com a resposta completa

        if (sendButton) sendButton.disabled = false;
        if (continueButton) continueButton.disabled = false;
        status.textContent = "Status: Faça outra pergunta ou clique em continuar.";
        if(document.getElementById('questionInput')) {
            document.getElementById('questionInput').focus();
        }
    };

    // Inicia a animação de digitação, que ficará esperando por caracteres na fila
    startTypingAnimation(botMessageElement, onTypingFinished);

    try {
        const response = await fetch('/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: question,
                history: conversationHistory.slice(0, -1)
            })
        });

        if (!response.ok) throw new Error(`Erro no servidor: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                streamFinished = true; // Sinaliza que a conexão terminou
                // Se a fila de caracteres já esvaziou, chama a finalização
                if(characterQueue.length === 0) onTypingFinished();
                break;
            }
            const chunk = decoder.decode(value);
            fullResponse += chunk;
            characterQueue.push(...chunk.split('')); // Adiciona os caracteres na fila
        }

    } catch (error) {
        console.error('Erro ao se comunicar com a IA:', error);
        fullResponse = "Desculpe, estou com problemas de conexão...";
        characterQueue.push(...fullResponse.split('')); // Adiciona a mensagem de erro na fila
        streamFinished = true;
        if(characterQueue.length === 0) onTypingFinished();
    }
}
