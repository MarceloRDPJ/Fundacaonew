import React from 'react';
import YouTube from 'react-youtube';

const VideoPlayer = ({ videoId, onVideoEnd }) => {
  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
      modestbranding: 1,
    },
  };

  return (
    <main className="flex-1 p-6 flex flex-col bg-black/20">
      <div className="bg-black aspect-video w-full rounded-lg shadow-lg overflow-hidden">
        <YouTube
          videoId={videoId}
          opts={opts}
          onEnd={onVideoEnd}
          className="w-full h-full"
        />
      </div>
    </main>
  );
};

export default VideoPlayer;