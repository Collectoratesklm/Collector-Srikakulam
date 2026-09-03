import React, { useState } from 'react';
import { VideoTile } from './VideoTile';
import type { Participant } from '../types';

interface VideoGridProps {
  localParticipant: Participant;
  localStream: MediaStream | null;
  remoteParticipants: Participant[];
  remoteStreams: Map<string, MediaStream>;
  activeSpeakerSocketId?: string | null;
  reactionsMap: Map<string, Array<{ id: string; reaction: string }>>;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localParticipant,
  localStream,
  remoteParticipants,
  remoteStreams,
  activeSpeakerSocketId,
  reactionsMap,
}) => {
  const [pinnedSocketId, setPinnedSocketId] = useState<string | null>(null);

  // Combine local and remote participants
  const allParticipants = [localParticipant, ...remoteParticipants];

  // Find if anyone is sharing screen
  const screenSharer = allParticipants.find((p) => p.isScreenSharing);

  // Active spotlight participant (screen sharer or pinned)
  const spotlightParticipant = screenSharer
    ? screenSharer
    : pinnedSocketId
    ? allParticipants.find((p) => p.socketId === pinnedSocketId)
    : null;

  // Render Spotlight / Presentation Mode
  if (spotlightParticipant) {
    const isLocal = spotlightParticipant.socketId === localParticipant.socketId;
    const stream = isLocal ? localStream : remoteStreams.get(spotlightParticipant.socketId);
    const filmstripParticipants = allParticipants.filter(
      (p) => p.socketId !== spotlightParticipant.socketId
    );

    return (
      <div className="w-full h-full flex flex-col md:flex-row p-3 gap-3 overflow-hidden">
        {/* Main Spotlight Stage */}
        <div className="flex-1 h-[60vh] md:h-full relative rounded-2xl overflow-hidden shadow-2xl">
          <VideoTile
            participant={spotlightParticipant}
            stream={stream}
            isLocal={isLocal}
            isActiveSpeaker={spotlightParticipant.socketId === activeSpeakerSocketId}
            isPinned={spotlightParticipant.socketId === pinnedSocketId}
            onTogglePin={() =>
              setPinnedSocketId(
                pinnedSocketId === spotlightParticipant.socketId ? null : spotlightParticipant.socketId
              )
            }
            reactions={reactionsMap.get(spotlightParticipant.socketId) || []}
          />
        </div>

        {/* Filmstrip of other participants */}
        <div className="w-full md:w-64 h-32 md:h-full flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0 pb-2">
          {filmstripParticipants.map((p) => {
            const pIsLocal = p.socketId === localParticipant.socketId;
            const pStream = pIsLocal ? localStream : remoteStreams.get(p.socketId);
            return (
              <div key={p.socketId} className="w-44 md:w-full aspect-video shrink-0">
                <VideoTile
                  participant={p}
                  stream={pStream}
                  isLocal={pIsLocal}
                  isActiveSpeaker={p.socketId === activeSpeakerSocketId}
                  isPinned={p.socketId === pinnedSocketId}
                  onTogglePin={() =>
                    setPinnedSocketId(pinnedSocketId === p.socketId ? null : p.socketId)
                  }
                  reactions={reactionsMap.get(p.socketId) || []}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Gallery Grid Layout based on count
  const count = allParticipants.length;

  let gridClasses = 'grid-cols-1';
  if (count === 2) {
    gridClasses = 'grid-cols-1 md:grid-cols-2';
  } else if (count >= 3 && count <= 4) {
    gridClasses = 'grid-cols-1 sm:grid-cols-2';
  } else if (count >= 5 && count <= 6) {
    gridClasses = 'grid-cols-2 lg:grid-cols-3';
  } else if (count > 6) {
    gridClasses = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  }

  return (
    <div className="w-full h-full p-3 md:p-5 flex items-center justify-center overflow-y-auto">
      <div
        className={`grid ${gridClasses} gap-3 md:gap-4 w-full h-full max-h-[84vh] auto-rows-fr`}
      >
        {allParticipants.map((participant) => {
          const isLocal = participant.socketId === localParticipant.socketId;
          const stream = isLocal ? localStream : remoteStreams.get(participant.socketId);

          return (
            <div key={participant.socketId} className="w-full h-full min-h-[180px] max-h-full">
              <VideoTile
                participant={participant}
                stream={stream}
                isLocal={isLocal}
                isActiveSpeaker={participant.socketId === activeSpeakerSocketId}
                isPinned={false}
                onTogglePin={() => setPinnedSocketId(participant.socketId)}
                reactions={reactionsMap.get(participant.socketId) || []}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
