import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { useUserSettingsStore } from '../../stores/userSettingsStore';
import { api } from '../../lib/api';

export function QRCodeDisplay({ roomCode, canMintLink }: { roomCode: string; canMintLink: boolean }) {
  const streamerMode = useUserSettingsStore((s) => s.streamerMode);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(!streamerMode);
  const [linkState, setLinkState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const joinUrl = `${window.location.origin}/dashboard?join=${roomCode}`;

  useEffect(() => {
    if (streamerMode) {
      setShowCode(false);
    }
  }, [streamerMode]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Minted on demand rather than on mount: the token is a 24h bearer credential,
  // so it should not exist for every room the host ever opens.
  const copyInviteLink = async () => {
    setLinkState('busy');
    try {
      const res = await api.post<{ token: string }>('/api/invitations/link', { roomCode });
      await navigator.clipboard.writeText(`${window.location.origin}/join/invite/${res.token}`);
      setLinkState('done');
    } catch {
      setLinkState('error');
    }
    setTimeout(() => setLinkState('idle'), 2500);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* QR Code Container */}
      <div className="bg-white p-3 border border-rule rounded-xs mb-4 shadow-xs">
        {showCode ? (
          <QRCodeSVG value={joinUrl} size={180} />
        ) : (
          <div className="w-[180px] h-[180px] flex flex-col items-center justify-center bg-canvas-sunk text-ink-faint font-mono text-xs uppercase text-center p-4">
            <EyeOff size={28} className="mb-2 text-ink-muted" />
            <span>QR Hidden</span>
          </div>
        )}
      </div>

      {/* Room Code Box */}
      <div className="flex items-center justify-between w-full border border-rule-strong p-2.5 px-4 rounded-xs bg-canvas-sunk">
        <div className="flex flex-col text-left">
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink-muted font-bold">Room Code</span>
          <span className="text-2xl font-mono tracking-widest font-black text-ink uppercase select-all">
            {showCode ? roomCode : '•••••'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCode(!showCode)}
            className="h-8 px-2 text-xs"
            title={showCode ? 'Hide Room Code' : 'Show Room Code'}
            aria-label={showCode ? 'Hide Room Code' : 'Show Room Code'}
          >
            {showCode ? <EyeOff size={15} /> : <Eye size={15} />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="h-8 px-3 text-xs font-mono font-bold"
            title="Copy Code to Clipboard"
            aria-label="Copy Code to Clipboard"
          >
            {copied ? <Check size={14} className="text-emerald-500 mr-1" /> : <Copy size={14} className="mr-1" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      {canMintLink && (
      <Button
        variant="outline"
        size="sm"
        onClick={copyInviteLink}
        disabled={linkState === 'busy'}
        className="mt-3 w-full text-xs"
        title="Copy a link that lets anyone who opens it into this room"
      >
        {linkState === 'busy' ? 'Minting link...' : linkState === 'done' ? 'Invite Link Copied' : linkState === 'error' ? 'Could not create link' : 'Copy Invite Link'}
      </Button>
      )}
    </div>
  );
}
