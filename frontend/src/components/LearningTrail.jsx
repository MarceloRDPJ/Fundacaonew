import React from 'react';
import { PlayCircle, CheckCircle, Video } from 'lucide-react';

const LearningTrail = ({ playlist, currentVideoIndex, completedVideos, onSelectVideo }) => {
  return (
    <aside className="w-80 bg-gray-900/50 p-4 border-r border-gray-700 overflow-y-auto">
      <div className="flex items-center mb-4">
        <Video className="w-6 h-6 mr-3 text-blue-400" />
        <h2 className="text-lg font-semibold">Sua Trilha de Integração</h2>
      </div>
      <ul className="space-y-2">
        {playlist.map((item, index) => {
          const isCompleted = completedVideos.has(index);
          const isActive = index === currentVideoIndex;

          return (
            <li
              key={item.id}
              onClick={() => onSelectVideo(index)}
              className={`p-3 rounded-lg flex items-center cursor-pointer transition-colors ${
                isActive
                  ? 'bg-blue-600 shadow-lg'
                  : isCompleted
                  ? 'text-gray-500 hover:bg-gray-800'
                  : 'hover:bg-gray-800'
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="w-5 h-5 mr-3 text-green-400 flex-shrink-0" />
              ) : (
                <PlayCircle className={`w-5 h-5 mr-3 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              )}
              <span className={`flex-1 ${isCompleted ? 'line-through' : ''}`}>
                {item.title}
              </span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export default LearningTrail;