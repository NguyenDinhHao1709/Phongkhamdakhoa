import React from 'react';
import useTelehealthStore from '../../store/telehealthStore';
import TelehealthVideoModal from './TelehealthVideoModal';

export default function GlobalTelehealthModal() {
  const {
    isOpen,
    isMinimized,
    participantName,
    role,
    appointmentInfo,
    toggleMinimize,
    endCall,
  } = useTelehealthStore();

  if (!isOpen) return null;

  return (
    <TelehealthVideoModal
      isOpen={isOpen}
      isMinimized={isMinimized}
      onToggleMinimize={toggleMinimize}
      onClose={endCall}
      participantName={participantName}
      role={role}
      appointmentInfo={appointmentInfo}
    />
  );
}
