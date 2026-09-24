const fs = require('fs');
const path = require('path');

const srcDir = 'd:\\\\ProjectGameWeb\\\\apps\\\\web\\\\src';

const files = {
  'pages/CreateRoomPage.tsx': `import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function CreateRoomPage() {
  const [games, setGames] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPrivate, setIsPrivate] = useState(false);
  
  const { socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/games').then(res => {
      setGames(res.data);
      if (res.data.length > 0) setSelectedGame(res.data[0].id);
    }).catch(() => {});
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !selectedGame) return;
    
    socket.emit('room:create', {
      gameId: selectedGame,
      name: roomName,
      maxPlayers,
      isPrivate
    });
    
    socket.once('room:created', (data: any) => {
      navigate(\`/lobby/\${data.roomCode}\`);
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl mt-12">
      <Card>
        <h1 className="text-3xl font-bold text-white mb-6">Create New Room</h1>
        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Game</label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-purple-500"
            >
              {games.map(game => (
                <option key={game.id} value={game.id}>{game.name}</option>
              ))}
            </select>
          </div>
          
          <Input label="Room Name (Optional)" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="My Awesome Room" />
          
          <div className="grid grid-cols-2 gap-4">
            <Input type="number" label="Max Players" value={maxPlayers.toString()} onChange={(e) => setMaxPlayers(parseInt(e.target.value))} min={2} max={20} />
            
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl cursor-pointer border border-gray-700">
                <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="w-5 h-5 rounded text-purple-500 bg-gray-900 border-gray-700 focus:ring-purple-500" />
                <span className="text-white font-medium">Private Room</span>
              </label>
            </div>
          </div>
          
          <Button type="submit" size="lg" className="w-full mt-4">Create Room</Button>
        </form>
      </Card>
    </div>
  );
}`,
  'pages/JoinRoomPage.tsx': `import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Html5QrcodeScanner } from 'html5-qrcode';

export function JoinRoomPage() {
  const { roomCode: paramCode } = useParams<{ roomCode?: string }>();
  const [code, setCode] = useState(paramCode || '');
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState('');
  
  const { socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (paramCode) {
      api.get(\`/api/rooms/\${paramCode}\`).then(res => {
        setRoomInfo(res.data);
      }).catch(() => {
        setError('Room not found');
      });
    }
  }, [paramCode]);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("reader", { qrbox: { width: 250, height: 250 }, fps: 5 }, false);
      scanner.render(
        (text) => {
          scanner.clear();
          const match = text.match(/join\\/([A-Za-z0-9]+)/);
          const scannedCode = match ? match[1] : text;
          setCode(scannedCode);
          setShowScanner(false);
        },
        (err) => {}
      );
      return () => { scanner.clear().catch(()=>{}); };
    }
  }, [showScanner]);

  const handleJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!socket || !code.trim()) return;
    
    socket.emit('room:join', { roomCode: code.toUpperCase() });
    
    socket.once('room:joined', (data: any) => {
      navigate(\`/lobby/\${data.roomCode}\`);
    });
    socket.once('room:error', (err: any) => {
      setError(err.message || 'Failed to join room');
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-lg mt-12">
      <Card>
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Join Room</h1>
        
        {roomInfo ? (
          <div className="text-center space-y-4 mb-8">
            <div className="bg-gray-800 p-4 rounded-xl">
              <h2 className="text-xl font-bold text-white">{roomInfo.gameName}</h2>
              <p className="text-gray-400">Host: {roomInfo.hostName}</p>
              <p className="text-gray-400">{roomInfo.playerCount} / {roomInfo.maxPlayers} players</p>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleJoin} className="space-y-6">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ENTER 5-LETTER CODE"
            className="text-center text-2xl tracking-widest font-mono h-16 uppercase"
            maxLength={5}
            error={error}
          />
          
          <Button type="submit" size="lg" className="w-full">Join Game</Button>
          
          <div className="text-center">
            <span className="text-gray-500">or</span>
          </div>
          
          <Button type="button" variant="outline" className="w-full" onClick={() => setShowScanner(true)}>
            Scan QR Code
          </Button>
        </form>
      </Card>

      <Modal isOpen={showScanner} onClose={() => setShowScanner(false)}>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Scan QR Code</h2>
          <div className="bg-white rounded-lg overflow-hidden p-2">
            <div id="reader"></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}`,
  'pages/LobbyPage.tsx': `import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useRoom } from '../hooks/useRoom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { QRCodeDisplay } from '../components/lobby/QRCodeDisplay';
import { PlayerList } from '../components/lobby/PlayerList';
import { InviteFriends } from '../components/lobby/InviteFriends';

export function LobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { room, leaveRoom, setReady, kickPlayer } = useRoom();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (!room && socket && roomCode) {
      socket.emit('room:join', { roomCode });
    }
  }, [room, socket, roomCode]);

  useEffect(() => {
    if (socket) {
      const handleGameStarted = () => navigate(\`/game/\${roomCode}\`);
      socket.on('game:started', handleGameStarted);
      return () => { socket.off('game:started', handleGameStarted); };
    }
  }, [socket, navigate, roomCode]);

  if (!room || !user) return <div className="text-center mt-20 text-white">Loading lobby...</div>;

  const isHost = room.hostId === user.id;
  const currentPlayer = room.players.find((p: any) => p.id === user.id);
  const allReady = room.players.every((p: any) => p.isReady);
  const enoughPlayers = room.players.length >= (room.settings?.minPlayers || 2);

  const handleStartGame = () => {
    if (isHost && allReady && enoughPlayers) {
      socket?.emit('game:start', { roomId: room.id });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <span className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
            {room.gameType}
          </span>
          <h1 className="text-3xl font-bold text-white">{room.name || 'Game Lobby'}</h1>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <Button variant="secondary" onClick={() => setShowInvite(true)}>Invite Friends</Button>
          <Button variant="danger" onClick={() => { leaveRoom(); navigate('/dashboard'); }}>Leave Room</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="p-6 bg-gray-800/80 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Players ({room.players.length}/{room.maxPlayers})</h2>
            </div>
            <div className="p-2">
              <PlayerList 
                players={room.players} 
                hostId={room.hostId} 
                currentUserId={user.id}
                isHost={isHost}
                onKick={kickPlayer}
              />
            </div>
          </Card>
          
          <div className="flex gap-4">
            <Button 
              size="lg" 
              className="flex-1" 
              variant={currentPlayer?.isReady ? 'secondary' : 'primary'}
              onClick={() => setReady(!currentPlayer?.isReady)}
            >
              {currentPlayer?.isReady ? 'Not Ready' : 'Ready Up'}
            </Button>
            
            {isHost && (
              <Button 
                size="lg" 
                className="flex-1" 
                disabled={!allReady || !enoughPlayers}
                onClick={handleStartGame}
                title={!enoughPlayers ? 'Not enough players' : !allReady ? 'Not everyone is ready' : ''}
              >
                Start Game
              </Button>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          <Card className="flex flex-col items-center p-8">
            <h3 className="text-lg font-medium text-gray-300 mb-6">Join with Code</h3>
            <QRCodeDisplay roomCode={roomCode || ''} />
          </Card>
          
          {isHost && (
            <Card>
              <h3 className="text-lg font-medium text-white mb-4">Room Settings</h3>
              <p className="text-sm text-gray-400">Settings available when host.</p>
            </Card>
          )}
        </div>
      </div>

      {showInvite && <InviteFriends onClose={() => setShowInvite(false)} />}
    </div>
  );
}`,
  'pages/GamePage.tsx': `import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useGameState } from '../hooks/useGameState';
import { useRoom } from '../hooks/useRoom';
import { useGameStore } from '../stores/gameStore';
import { SpyfallGame } from '../components/games/spyfall/SpyfallGame';
import { GameOverScreen } from '../components/games/spyfall/GameOverScreen';

export function GamePage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { room } = useRoom();
  const { sendAction, startGame } = useGameState();
  const { playerView, gameResult } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!room) {
      // navigate('/dashboard');
    }
  }, [room, navigate]);

  if (!room || !playerView) {
    return <div className="flex items-center justify-center h-screen text-white">Loading game state...</div>;
  }

  const handleAction = (type: string, payload?: unknown) => {
    sendAction(room.id, type, payload);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {gameResult ? (
        <GameOverScreen result={gameResult} onPlayAgain={() => startGame(room.id)} onReturnLobby={() => navigate(\`/lobby/\${roomCode}\`)} />
      ) : room.gameType === 'spyfall' ? (
        <SpyfallGame playerView={playerView as any} onAction={handleAction} />
      ) : (
        <div className="text-white p-8">Unsupported game type: {room.gameType}</div>
      )}
    </div>
  );
}`,
  'pages/ProfilePage.tsx': `import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await api.put('/api/users/me', { displayName });
      setIsEditing(false);
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl mt-12">
      <Card className="flex flex-col items-center text-center p-8">
        <Avatar src={user.avatarUrl} fallback={user.displayName} size="lg" className="h-32 w-32 text-4xl mb-6" />
        
        {isEditing ? (
          <div className="flex gap-2 w-full max-w-xs mb-6">
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Button onClick={handleSave} isLoading={isLoading}>Save</Button>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-4">
            <h1 className="text-3xl font-bold text-white">{user.displayName}</h1>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
          </div>
        )}

        <div className="w-full text-left space-y-4 max-w-md bg-gray-900/50 p-6 rounded-xl border border-gray-700">
          <div>
            <span className="text-gray-500 text-sm">Username</span>
            <p className="text-white">@{user.username}</p>
          </div>
          <div>
            <span className="text-gray-500 text-sm">Email</span>
            <p className="text-white">{user.email}</p>
          </div>
          <div>
            <span className="text-gray-500 text-sm">Account Created</span>
            <p className="text-white">{new Date(user.createdAt || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>

        <Button variant="danger" className="mt-8" onClick={logout}>Sign Out</Button>
      </Card>
    </div>
  );
}`,
  'pages/FriendsPage.tsx': `import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { FriendList } from '../components/friends/FriendList';
import { FriendSearch } from '../components/friends/FriendSearch';
import { FriendRequests } from '../components/friends/FriendRequests';

export function FriendsPage() {
  const [tab, setTab] = useState<'friends' | 'requests' | 'sent'>('friends');

  return (
    <div className="container mx-auto p-4 max-w-4xl mt-8">
      <h1 className="text-3xl font-bold text-white mb-8">Friends</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="flex gap-4 border-b border-gray-700 pb-2">
            <button 
              className={\`px-4 py-2 font-medium transition-colors \${tab === 'friends' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}\`}
              onClick={() => setTab('friends')}
            >
              My Friends
            </button>
            <button 
              className={\`px-4 py-2 font-medium transition-colors \${tab === 'requests' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}\`}
              onClick={() => setTab('requests')}
            >
              Requests
            </button>
          </div>
          
          <Card>
            {tab === 'friends' && <FriendList />}
            {tab === 'requests' && <FriendRequests />}
          </Card>
        </div>
        
        <div>
          <Card>
            <h2 className="text-xl font-bold text-white mb-4">Add Friend</h2>
            <FriendSearch />
          </Card>
        </div>
      </div>
    </div>
  );
}`,
  'components/lobby/QRCodeDisplay.tsx': `import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export function QRCodeDisplay({ roomCode }: { roomCode: string }) {
  const [copied, setCopied] = useState(false);
  const joinUrl = \`\${window.location.origin}/join/\${roomCode}\`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-4 rounded-xl mb-6">
        <QRCodeSVG value={joinUrl} size={200} />
      </div>
      
      <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 p-2 pl-6 rounded-xl">
        <span className="text-3xl font-mono tracking-[0.2em] font-bold text-white uppercase">{roomCode}</span>
        <button 
          onClick={copyToClipboard}
          className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors flex items-center justify-center cursor-pointer"
        >
          {copied ? <Check className="text-green-400" /> : <Copy />}
        </button>
      </div>
    </div>
  );
}`,
  'components/lobby/PlayerList.tsx': `import { Avatar } from '../ui/Avatar';
import { Crown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlayerListProps {
  players: any[];
  hostId: string;
  currentUserId: string;
  isHost: boolean;
  onKick: (id: string) => void;
}

export function PlayerList({ players, hostId, currentUserId, isHost, onKick }: PlayerListProps) {
  return (
    <div className="space-y-2">
      <AnimatePresence>
        {players.map(player => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between p-3 bg-gray-800 rounded-xl border border-gray-700/50 hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-center gap-4">
              <Avatar src={player.avatarUrl} fallback={player.displayName} />
              <div className="flex flex-col">
                <span className="text-white font-medium flex items-center gap-2">
                  {player.displayName}
                  {player.id === hostId && <Crown className="text-yellow-500 h-4 w-4" />}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className={\`text-xs font-bold px-2 py-1 rounded \${player.isReady ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}\`}>
                {player.isReady ? 'READY' : 'NOT READY'}
              </span>
              
              {isHost && player.id !== currentUserId && (
                <button 
                  onClick={() => onKick(player.id)}
                  className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Kick player"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}`,
  'components/lobby/InviteFriends.tsx': `import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { api } from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import { useParams } from 'react-router';

export function InviteFriends({ onClose }: { onClose: () => void }) {
  const [friends, setFriends] = useState<any[]>([]);
  const [invited, setInvited] = useState<Record<string, boolean>>({});
  const { socket } = useSocket();
  const { roomCode } = useParams<{ roomCode: string }>();

  useEffect(() => {
    api.get('/api/friends').then(res => setFriends(res.data)).catch(() => {});
  }, []);

  const handleInvite = (friendId: string) => {
    socket?.emit('friend:invite_to_room', { friendId, roomCode });
    setInvited(prev => ({ ...prev, [friendId]: true }));
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <h2 className="text-xl font-bold text-white mb-6">Invite Friends</h2>
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {friends.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No friends found.</p>
        ) : (
          friends.map(friend => (
            <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
              <div className="flex items-center gap-3">
                <Avatar fallback={friend.displayName} status={friend.status} />
                <span className="text-white font-medium">{friend.displayName}</span>
              </div>
              <Button 
                size="sm" 
                variant={invited[friend.id] ? 'ghost' : 'outline'}
                onClick={() => handleInvite(friend.id)}
                disabled={invited[friend.id]}
              >
                {invited[friend.id] ? 'Invited ✓' : 'Invite'}
              </Button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}`,
  'components/games/spyfall/SpyfallGame.tsx': `import { SpyfallPhase } from '@party/spyfall';
import { RoleCard } from './RoleCard';
import { QuestionPhase } from './QuestionPhase';
import { VotingPhase } from './VotingPhase';
import { SpyGuessPhase } from './SpyGuessPhase';
import { GameOverScreen } from './GameOverScreen';
import { GameTimer } from './GameTimer';
import { useGameStore } from '../../../stores/gameStore';

export function SpyfallGame({ playerView, onAction }: { playerView: any, onAction: any }) {
  const { timer } = useGameStore();

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col h-screen max-w-5xl">
      {timer && timer.expiresAt && <GameTimer expiresAt={timer.expiresAt} />}
      
      <div className="flex-1 flex items-center justify-center">
        {playerView.phase === SpyfallPhase.ROLE_REVEAL && (
          <RoleCard isSpy={playerView.isSpy} roleName={playerView.roleName} locationName={playerView.locationName} locations={playerView.locations} onProceed={() => onAction('ready')} />
        )}
        
        {playerView.phase === SpyfallPhase.QUESTIONING && (
          <QuestionPhase playerView={playerView} onAction={onAction} currentUserId={playerView.playerId} />
        )}
        
        {playerView.phase === SpyfallPhase.ACCUSATION_VOTE && (
          <VotingPhase playerView={playerView} onAction={onAction} />
        )}
        
        {playerView.phase === SpyfallPhase.SPY_GUESS && (
          <SpyGuessPhase playerView={playerView} onAction={onAction} />
        )}
      </div>
    </div>
  );
}`,
  'components/games/spyfall/RoleCard.tsx': `import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function RoleCard({ isSpy, roleName, locationName, locations, onProceed }: any) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 500);
    const p = setTimeout(onProceed, 5000);
    return () => { clearTimeout(t); clearTimeout(p); };
  }, [onProceed]);

  return (
    <div className="perspective-1000 w-full max-w-md h-96 cursor-pointer" onClick={() => { setFlipped(true); setTimeout(onProceed, 1000); }}>
      <motion.div
        className="w-full h-full relative preserve-3d"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
      >
        <div className="absolute inset-0 backface-hidden bg-gray-800 rounded-3xl border-2 border-gray-700 flex flex-col items-center justify-center p-8 shadow-2xl">
          <span className="text-6xl mb-6">❓</span>
          <h2 className="text-2xl font-bold text-white">Your Identity</h2>
          <p className="text-gray-400 mt-2">Flipping...</p>
        </div>
        
        <div className={\`absolute inset-0 backface-hidden rotate-y-180 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl border-2 \${isSpy ? 'bg-gradient-to-b from-red-900 to-gray-900 border-red-500' : 'bg-gradient-to-b from-blue-900 to-gray-900 border-blue-500'}\`}>
          {isSpy ? (
            <>
              <span className="text-6xl mb-4 drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]">🕵️</span>
              <h2 className="text-3xl font-black text-white text-center tracking-wide mb-2 uppercase text-red-500">You are the SPY!</h2>
              <p className="text-gray-300 text-center font-medium">Your mission: Figure out the location</p>
            </>
          ) : (
            <>
              <span className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-2">Location</span>
              <h2 className="text-4xl font-black text-white text-center mb-6 text-blue-400">{locationName}</h2>
              <span className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-1">Your Role</span>
              <h3 className="text-2xl font-bold text-white text-center mb-4">{roleName}</h3>
              <p className="text-gray-300 text-center font-medium mt-auto">Don't let the spy figure out the location!</p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}`,
  'components/games/spyfall/LocationGrid.tsx': `import { useState } from 'react';
import { cn } from '../../../lib/utils';

export function LocationGrid({ locations }: { locations: string[] }) {
  const [crossedOut, setCrossedOut] = useState<Record<string, boolean>>({});

  const toggle = (loc: string) => {
    setCrossedOut(prev => ({ ...prev, [loc]: !prev[loc] }));
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {locations.map(loc => (
        <button
          key={loc}
          onClick={() => toggle(loc)}
          className={cn(
            "p-3 rounded-lg text-sm font-medium transition-all text-left",
            crossedOut[loc] ? "bg-gray-800/30 text-gray-600 line-through" : "bg-gray-800 text-gray-200 hover:bg-gray-700"
          )}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}`,
  'components/games/spyfall/QuestionPhase.tsx': `import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { LocationGrid } from './LocationGrid';

export function QuestionPhase({ playerView, onAction, currentUserId }: any) {
  const isQuestioner = playerView.currentQuestionerId === currentUserId;
  const isAnswerer = playerView.currentAnswererId === currentUserId;
  
  const questioner = playerView.players.find((p: any) => p.id === playerView.currentQuestionerId);
  const answerer = playerView.players.find((p: any) => p.id === playerView.currentAnswererId);

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 items-start">
      <div className="flex-1 space-y-6 w-full">
        <Card className="text-center p-8 border-purple-500/30 shadow-[0_0_30px_-10px_rgba(168,85,247,0.2)]">
          {!answerer ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">Waiting for {questioner?.name || 'someone'} to ask</h2>
              {isQuestioner && (
                <div className="mt-6">
                  <p className="text-gray-400 mb-4">Select someone to ask a question:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {playerView.players.filter((p: any) => p.id !== currentUserId && p.id !== playerView.previousQuestionerId).map((p: any) => (
                      <Button key={p.id} onClick={() => onAction('ask_question', { targetPlayerId: p.id })}>{p.name}</Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">{questioner?.name} is asking {answerer?.name}</h2>
              {isAnswerer && (
                <div className="mt-6">
                  <p className="text-gray-300 mb-6">Answer the question out loud, then click Done.</p>
                  <Button size="lg" onClick={() => onAction('answer_done', {})}>Done Answering</Button>
                </div>
              )}
            </>
          )}
        </Card>

        <div className="flex gap-4 justify-center">
          <Button variant="danger" onClick={() => {
            const id = prompt('Enter player ID to accuse:');
            if (id) onAction('accuse', { targetPlayerId: id });
          }}>Accuse Someone ({playerView.remainingAccusations} left)</Button>
          
          {playerView.isSpy && (
            <Button variant="outline" className="border-red-500 text-red-500" onClick={() => onAction('spy_reveal', {})}>
              Reveal & Guess Location
            </Button>
          )}
        </div>
      </div>
      
      <div className="w-full lg:w-96">
        <h3 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-4">Locations Reference</h3>
        <LocationGrid locations={playerView.locations} />
      </div>
    </div>
  );
}`,
  'components/games/spyfall/VotingPhase.tsx': `import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';

export function VotingPhase({ playerView, onAction }: any) {
  const { accuser, accused, votesNeeded, yesVotes, noVotes, hasVoted } = playerView.votingState || {};
  
  return (
    <Card className="w-full max-w-lg text-center p-8">
      <span className="text-5xl mb-6 block">⚖️</span>
      <h2 className="text-2xl font-bold text-white mb-2">Accusation!</h2>
      <p className="text-xl text-gray-300 mb-8"><span className="text-red-400 font-bold">{accuser?.name}</span> accuses <span className="text-purple-400 font-bold">{accused?.name}</span></p>
      
      {hasVoted ? (
        <div className="text-gray-400">Waiting for others to vote...</div>
      ) : (
        <div className="flex gap-4 justify-center">
          <Button size="lg" variant="danger" onClick={() => onAction('vote', { guilty: true })}>Guilty</Button>
          <Button size="lg" className="bg-green-600 hover:bg-green-500" onClick={() => onAction('vote', { guilty: false })}>Not Guilty</Button>
        </div>
      )}
      
      <div className="mt-8 bg-gray-900 rounded-full h-2 overflow-hidden flex">
        <div className="bg-red-500" style={{ width: \`\${(yesVotes / votesNeeded) * 100}%\` }} />
        <div className="bg-green-500" style={{ width: \`\${(noVotes / votesNeeded) * 100}%\` }} />
      </div>
    </Card>
  );
}`,
  'components/games/spyfall/SpyGuessPhase.tsx': `import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { useState } from 'react';

export function SpyGuessPhase({ playerView, onAction }: any) {
  const [selected, setSelected] = useState('');
  
  if (!playerView.isSpy) {
    return (
      <Card className="p-8 text-center max-w-md">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Spy is guessing!</h2>
        <p className="text-gray-300">The spy has revealed themselves and is trying to guess the location...</p>
      </Card>
    );
  }
  
  return (
    <Card className="p-8 max-w-4xl w-full">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">Guess the Location</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {playerView.locations.map((loc: string) => (
          <button
            key={loc}
            onClick={() => setSelected(loc)}
            className={\`p-4 rounded-xl text-sm font-bold transition-all \${selected === loc ? 'bg-red-500 text-white ring-4 ring-red-500/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}\`}
          >
            {loc}
          </button>
        ))}
      </div>
      <div className="flex justify-center">
        <Button size="lg" variant="danger" disabled={!selected} onClick={() => onAction('spy_guess_location', { locationName: selected })}>
          Confirm Guess
        </Button>
      </div>
    </Card>
  );
}`,
  'components/games/spyfall/GameOverScreen.tsx': `import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { motion } from 'framer-motion';

export function GameOverScreen({ result, onPlayAgain, onReturnLobby }: any) {
  const spyWon = result.winner === 'spy';
  
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center h-screen bg-black/80 fixed inset-0 z-50 p-4">
      <Card className="w-full max-w-2xl text-center p-8 lg:p-12 border-t-8 border-t-purple-500">
        <h1 className={\`text-5xl font-black mb-4 \${spyWon ? 'text-red-500' : 'text-blue-500'}\`}>
          {spyWon ? '🕵️ Spy Wins!' : '🎉 Non-Spies Win!'}
        </h1>
        <p className="text-xl text-white mb-8">{result.reason}</p>
        
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <p className="text-gray-400 uppercase tracking-widest text-sm mb-2">The Location was</p>
          <p className="text-3xl font-bold text-white">{result.location}</p>
        </div>
        
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={onPlayAgain}>Play Again</Button>
          <Button size="lg" variant="secondary" onClick={onReturnLobby}>Return to Lobby</Button>
        </div>
      </Card>
    </motion.div>
  );
}`,
  'components/games/spyfall/GameTimer.tsx': `import { useEffect, useState } from 'react';

export function GameTimer({ expiresAt }: { expiresAt: number }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, expiresAt - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  const formatted = \`\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`;

  const isWarning = timeLeft < 60000;
  const isDanger = timeLeft < 30000;

  return (
    <div className={\`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full font-mono text-2xl font-bold z-40 bg-gray-900/80 backdrop-blur border \${isDanger ? 'text-red-500 border-red-500 animate-pulse' : isWarning ? 'text-yellow-400 border-yellow-500' : 'text-white border-gray-700'}\`}>
      {timeLeft === 0 ? "Time's Up!" : formatted}
    </div>
  );
}`,
  'components/friends/FriendList.tsx': `import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Avatar } from '../ui/Avatar';

export function FriendList({ onInvite }: { onInvite?: (id: string) => void }) {
  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    api.get('/api/friends').then(res => setFriends(res.data)).catch(() => {});
  }, []);

  if (friends.length === 0) return <div className="text-gray-500 p-4">No friends yet.</div>;

  return (
    <div className="divide-y divide-gray-800">
      {friends.map(f => (
        <div key={f.id} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Avatar fallback={f.displayName} src={f.avatarUrl} status={f.status} />
            <span className="text-white font-medium">{f.displayName}</span>
          </div>
          <span className="text-sm text-gray-400 capitalize">{f.status}</span>
        </div>
      ))}
    </div>
  );
}`,
  'components/friends/FriendSearch.tsx': `import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';

export function FriendSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim()) {
        api.get(\`/api/users/search?q=\${q}\`).then(res => setResults(res.data)).catch(() => {});
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const addFriend = (id: string) => {
    api.post('/api/friends/request', { targetUserId: id });
    alert('Request Sent!');
  };

  return (
    <div>
      <Input placeholder="Search users..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-4 space-y-2">
        {results.map(user => (
          <div key={user.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <Avatar fallback={user.displayName} />
              <div>
                <div className="text-white font-medium">{user.displayName}</div>
                <div className="text-gray-500 text-xs">@{user.username}</div>
              </div>
            </div>
            <Button size="sm" onClick={() => addFriend(user.id)}>Add</Button>
          </div>
        ))}
      </div>
    </div>
  );
}`,
  'components/friends/FriendRequests.tsx': `import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

export function FriendRequests() {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    api.get('/api/friends/requests').then(res => setRequests(res.data)).catch(() => {});
  }, []);

  const handleAction = (id: string, accept: boolean) => {
    api.post(\`/api/friends/\${accept ? 'accept' : 'reject'}\`, { requestId: id }).then(() => {
      setRequests(prev => prev.filter(r => r.id !== id));
    });
  };

  if (requests.length === 0) return <div className="text-gray-500 p-4">No pending requests.</div>;

  return (
    <div className="divide-y divide-gray-800">
      {requests.map(req => (
        <div key={req.id} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Avatar fallback={req.from.displayName} />
            <div>
              <div className="text-white font-medium">{req.from.displayName}</div>
              <div className="text-gray-500 text-xs">Wants to be friends</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-green-600 hover:bg-green-500" onClick={() => handleAction(req.id, true)}>Accept</Button>
            <Button size="sm" variant="danger" onClick={() => handleAction(req.id, false)}>Reject</Button>
          </div>
        </div>
      ))}
    </div>
  );
}`
};

for (const [relPath, content] of Object.entries(files)) {
  const fullPath = path.join(srcDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log('Created:', fullPath);
}
