import React, { useState } from 'react';
import Header from './components/Header';
import LearningTrail from './components/LearningTrail';
import VideoPlayer from './components/VideoPlayer';
import Assistant from './components/Assistant';

const playlist = [
  { title: "Fundação Tiradentes", id: "nRuJN6wwfvs" },
  { title: "Departamento Pessoal", id: "WSfTir1w5v0" },
  { title: "Tecnologia da Informação e Informação", id: "7Bq-mzVo3XY" }
];

function App() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [completedVideos, setCompletedVideos] = useState(new Set());
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Bem-vindo à sua integração! Selecione um vídeo para começar ou faça uma pergunta.' }
  ]);

  const handleSelectVideo = (index) => {
    setCurrentVideoIndex(index);
  };

  const handleVideoEnd = () => {
    setCompletedVideos(prev => new Set(prev).add(currentVideoIndex));
    // Automatically play next video if there is one
    if (currentVideoIndex < playlist.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const handleSendMessage = async (text) => {
    // Add user message to chat immediately
    setMessages(prev => [...prev, { sender: 'user', text }]);

    try {
      const response = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          history: messages, // Send current chat history
          userName: 'Usuário' // Using a placeholder name for now
        })
      });
      const data = await response.json();
      // Add bot response
      setMessages(prev => [...prev, { sender: 'bot', text: data.answer }]);
    } catch (error) {
      console.error('Error communicating with AI:', error);
      setMessages(prev => [...prev, { sender: 'bot', text: 'Desculpe, estou com problemas de conexão.' }]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <LearningTrail
          playlist={playlist}
          currentVideoIndex={currentVideoIndex}
          completedVideos={completedVideos}
          onSelectVideo={handleSelectVideo}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <VideoPlayer
            videoId={playlist[currentVideoIndex].id}
            onVideoEnd={handleVideoEnd}
          />
          <Assistant
            messages={messages}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
}

export default App;