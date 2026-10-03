import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

/**
 * Landing page for a shared invitation link.
 *
 * Claiming is an authorisation step, not the join itself: it records that this
 * user was let in, which is what the private-room check reads. The socket join
 * is then handed to the dashboard, which already owns that flow.
 */
export function JoinInvitePage() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [error, setError] = useState<string | null>(null);
  const claimed = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !token || claimed.current) return;
    claimed.current = true;

    api
      .get<{ roomCode: string }>(`/api/invitations/link/${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res?.roomCode) throw new Error('That invitation link did not name a room.');
        navigate(`/dashboard?join=${res.roomCode}`, { replace: true });
      })
      .catch((err: any) => {
        setError(err?.message || 'This invitation link could not be used.');
      });
  }, [isAuthenticated, token, navigate]);

  // A logged-out visitor has to sign in first. The destination goes on
  // location.state, which LoginPage already reads.
  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="flex-1 flex justify-center items-center p-4">
      <Card className="w-full max-w-md p-8 border border-rule text-center space-y-4">
        <div className="w-10 h-10 bg-ink text-canvas flex items-center justify-center font-mono font-bold text-sm mx-auto rounded-xs">
          PG
        </div>

        {error ? (
          <>
            <h1 className="text-lg font-black uppercase tracking-tight text-ink">
              Invitation Unusable
            </h1>
            <p className="text-xs font-mono text-ink-muted">{error}</p>
            <Button variant="secondary" onClick={() => navigate('/dashboard')} className="w-full">
              Back to Dashboard
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-lg font-black uppercase tracking-tight text-ink">
              Joining the room
            </h1>
            <p className="text-xs font-mono text-ink-muted">Checking your invitation...</p>
          </>
        )}
      </Card>
    </div>
  );
}

export default JoinInvitePage;