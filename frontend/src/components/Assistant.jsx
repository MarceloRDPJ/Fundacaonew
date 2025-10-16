import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';

const Assistant = ({ messages, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <section className="flex flex-col h-full max-h-[50vh] bg-gray-800/50 border-t border-gray-700">
      <div className="flex items-center p-3 border-b border-gray-700">
        <Bot className="w-6 h-6 mr-3 text-blue-400" />
        <h3 className="font-semibold">Assistente Celine</h3>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`p-3 rounded-lg max-w-lg break-words ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-200'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Digite sua pergunta..."
            className="w-full bg-gray-900 border border-gray-600 rounded-full py-2 pl-4 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors disabled:bg-gray-500"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </form>
      </div>
    </section>
  );
};

export default Assistant;