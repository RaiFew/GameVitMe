import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function JoinRoomPage() {
  const { roomCode } = useParams<{ roomCode?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (roomCode) {
      navigate(`/dashboard?join=${roomCode.toUpperCase()}`, { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [roomCode, navigate]);

  return (
    <div className="flex h-screen items-center justify-center text-white">
      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export default JoinRoomPage;
