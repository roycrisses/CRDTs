import React from 'react';

interface StatusBarProps {
  status: string;
  userCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status, userCount }) => {
  return (
    <div className="status-bar">
      <div className="status-item">
        <span className={`status-indicator ${status === 'connected' ? 'online' : 'offline'}`} />
        <span className="status-text">{status === 'connected' ? 'Connected' : 'Disconnected'}</span>
      </div>
      <div className="divider" />
      <div className="status-item">
        <span className="user-count">{userCount} {userCount === 1 ? 'Collaborator' : 'Collaborators'}</span>
      </div>
    </div>
  );
};
