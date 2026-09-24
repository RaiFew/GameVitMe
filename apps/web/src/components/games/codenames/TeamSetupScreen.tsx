import type { CodenamesPlayerView, TeamColor, CodenamesRole } from '@party/codenames';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Shield, Users, Shuffle, Play, Eye, Crosshair, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  playerView: CodenamesPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

export function TeamSetupScreen({ playerView, onAction, isHost }: Props) {
  const { me, players, canStartMatch, wordSource } = playerView;

  const redSpymaster = players.find((p) => p.team === 'RED' && p.role === 'SPYMASTER');
  const redOperatives = players.filter((p) => p.team === 'RED' && p.role === 'OPERATIVE');

  const blueSpymaster = players.find((p) => p.team === 'BLUE' && p.role === 'SPYMASTER');
  const blueOperatives = players.filter((p) => p.team === 'BLUE' && p.role === 'OPERATIVE');

  const unassignedPlayers = players.filter((p) => !p.team || !p.role);

  const handleAssignRole = (team: TeamColor, role: CodenamesRole) => {
    onAction('ASSIGN_TEAM_ROLE', {
      targetPlayerId: me.id,
      team,
      role,
    });
  };

  const handleLeaveRole = () => {
    onAction('ASSIGN_TEAM_ROLE', {
      targetPlayerId: me.id,
      team: null,
      role: null,
    });
  };

  const handleRandomize = () => {
    onAction('RANDOMIZE_TEAMS');
  };

  const handleStartMatch = () => {
    onAction('START_MATCH');
  };

  const handleSwapRoles = () => {
    onAction('SWAP_ROLES');
  };

  if (playerView.gameMode === 'TWO_PLAYER') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="border border-emerald-600 bg-emerald-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
                2-Player Cooperative
              </span>
              <span className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
                Word Source: {wordSource === 'CUSTOM' ? 'Custom Word File' : 'Default Words'}
              </span>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-black dark:text-white flex items-center gap-3">
              <Users size={28} />
              2 Player Codenames
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              You are playing together on the same team to uncover all friendly agents.
            </p>
          </div>
        </div>

        {/* Players Card */}
        <Card className="p-6 border border-zinc-300 dark:border-zinc-800 space-y-6">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-black dark:text-white">
              Players
            </h2>
            <span className="text-xs font-mono font-bold text-zinc-500">
              Cooperative Team
            </span>
          </div>

          <div className="space-y-3">
            {players.map((player) => {
              const isPlayerSpymaster = player.role === 'SPYMASTER';
              const isMe = player.id === me.id;

              return (
                <div
                  key={player.id}
                  className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xs bg-white dark:bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-black dark:bg-white inline-block" />
                    <div>
                      <span className="font-bold text-sm text-black dark:text-white flex items-center gap-2">
                        {player.displayName}
                        {isMe && (
                          <span className="text-[10px] font-mono uppercase bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.2 rounded-xs">
                            You
                          </span>
                        )}
                        {player.isHost && (
                          <span className="text-[10px] font-mono uppercase text-zinc-400">
                            Host
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-mono text-zinc-500 block mt-0.5">
                        {isPlayerSpymaster
                          ? 'Gives one-word clues and numbers based on secret card colors.'
                          : 'Dedicates guesses to uncovering friendly cards based on clues.'}
                      </span>
                    </div>
                  </div>

                  <span className={`text-xs font-mono font-bold uppercase px-3 py-1 rounded-xs border text-center shrink-0 ${
                    isPlayerSpymaster
                      ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                      : 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
                  }`}>
                    [{player.role || 'Unassigned'}]
                  </span>
                </div>
              );
            })}
          </div>

          {/* Swap Roles Button */}
          <div className="pt-2 flex justify-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSwapRoles}
              className="text-xs font-mono font-bold uppercase"
            >
              <Shuffle size={14} className="mr-2" /> Swap Roles
            </Button>
          </div>
        </Card>

        {/* Start Game Row */}
        <div className="p-4 border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 rounded-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <span className="text-xs font-mono text-zinc-500 block">
              {canStartMatch
                ? 'Both roles assigned. Ready to start!'
                : '1 Spymaster and 1 Operative required.'}
            </span>
          </div>

          {isHost ? (
            <Button
              size="lg"
              variant="primary"
              onClick={handleStartMatch}
              disabled={!canStartMatch}
              className="w-full sm:w-auto font-bold uppercase text-xs"
            >
              Start Game <Play size={15} className="ml-2" />
            </Button>
          ) : (
            <span className="text-xs font-mono text-zinc-500">
              Waiting for Host to start game...
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
              Pre-Game Setup
            </span>
            <span className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
              Word Source: {wordSource === 'CUSTOM' ? 'Custom Word File' : 'Default Words'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black dark:text-white flex items-center gap-3">
            <Users size={32} />
            Codenames Team Selection
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Each team must assign exactly 1 Spymaster and at least 1 Operative to begin the match.
          </p>
        </div>

        {/* Host Actions */}
        {isHost && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRandomize}
              disabled={players.length < 4}
              className="text-xs font-mono font-bold"
            >
              <Shuffle size={14} className="mr-1.5" /> Randomize Teams
            </Button>
          </div>
        )}
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RED TEAM CARD */}
        <Card className="p-6 border-2 border-red-600 dark:border-red-500 bg-red-50/20 dark:bg-red-950/10 space-y-6">
          <div className="border-b border-red-200 dark:border-red-900/60 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
              <h2 className="text-xl font-black uppercase tracking-tight text-red-600 dark:text-red-400">
                Red Team
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-red-700 dark:text-red-400">
              {(redSpymaster ? 1 : 0) + redOperatives.length} Player(s)
            </span>
          </div>

          {/* Red Spymaster Slot */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Eye size={13} /> Spymaster (1 Player)
              </span>
              {me.team === 'RED' && me.role === 'SPYMASTER' && (
                <button
                  onClick={handleLeaveRole}
                  className="text-[10px] font-mono text-zinc-500 hover:text-red-600 underline"
                >
                  Leave Role
                </button>
              )}
            </div>

            {redSpymaster ? (
              <div className="p-3 border-2 border-red-600 dark:border-red-500 bg-white dark:bg-zinc-900 rounded-xs flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-black dark:text-white">
                    {redSpymaster.displayName} {redSpymaster.id === me.id && '(You)'}
                  </span>
                  {redSpymaster.isHost && (
                    <span className="text-[9px] font-mono border border-zinc-400 dark:border-zinc-600 px-1 rounded-xs">
                      Host
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400 uppercase">
                  Spymaster
                </span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAssignRole('RED', 'SPYMASTER')}
                className="w-full text-xs font-mono uppercase border-dashed border-red-400 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                + Claim Red Spymaster
              </Button>
            )}
          </div>

          {/* Red Operatives List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Crosshair size={13} /> Operatives (1+ Players)
              </span>
              {me.team === 'RED' && me.role === 'OPERATIVE' && (
                <button
                  onClick={handleLeaveRole}
                  className="text-[10px] font-mono text-zinc-500 hover:text-red-600 underline"
                >
                  Leave Role
                </button>
              )}
            </div>

            <div className="space-y-2">
              {redOperatives.map((p) => (
                <div
                  key={p.id}
                  className="p-3 border border-red-300 dark:border-red-900 bg-white dark:bg-zinc-900 rounded-xs flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-black dark:text-white">
                    {p.displayName} {p.id === me.id && '(You)'}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">
                    Operative
                  </span>
                </div>
              ))}

              {!(me.team === 'RED' && me.role === 'OPERATIVE') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAssignRole('RED', 'OPERATIVE')}
                  className="w-full text-xs font-mono uppercase"
                >
                  + Join as Red Operative
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* BLUE TEAM CARD */}
        <Card className="p-6 border-2 border-blue-600 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/10 space-y-6">
          <div className="border-b border-blue-200 dark:border-blue-900/60 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
              <h2 className="text-xl font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">
                Blue Team
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400">
              {(blueSpymaster ? 1 : 0) + blueOperatives.length} Player(s)
            </span>
          </div>

          {/* Blue Spymaster Slot */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Eye size={13} /> Spymaster (1 Player)
              </span>
              {me.team === 'BLUE' && me.role === 'SPYMASTER' && (
                <button
                  onClick={handleLeaveRole}
                  className="text-[10px] font-mono text-zinc-500 hover:text-blue-600 underline"
                >
                  Leave Role
                </button>
              )}
            </div>

            {blueSpymaster ? (
              <div className="p-3 border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-zinc-900 rounded-xs flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-black dark:text-white">
                    {blueSpymaster.displayName} {blueSpymaster.id === me.id && '(You)'}
                  </span>
                  {blueSpymaster.isHost && (
                    <span className="text-[9px] font-mono border border-zinc-400 dark:border-zinc-600 px-1 rounded-xs">
                      Host
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase">
                  Spymaster
                </span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAssignRole('BLUE', 'SPYMASTER')}
                className="w-full text-xs font-mono uppercase border-dashed border-blue-400 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                + Claim Blue Spymaster
              </Button>
            )}
          </div>

          {/* Blue Operatives List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Crosshair size={13} /> Operatives (1+ Players)
              </span>
              {me.team === 'BLUE' && me.role === 'OPERATIVE' && (
                <button
                  onClick={handleLeaveRole}
                  className="text-[10px] font-mono text-zinc-500 hover:text-blue-600 underline"
                >
                  Leave Role
                </button>
              )}
            </div>

            <div className="space-y-2">
              {blueOperatives.map((p) => (
                <div
                  key={p.id}
                  className="p-3 border border-blue-300 dark:border-blue-900 bg-white dark:bg-zinc-900 rounded-xs flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-black dark:text-white">
                    {p.displayName} {p.id === me.id && '(You)'}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">
                    Operative
                  </span>
                </div>
              ))}

              {!(me.team === 'BLUE' && me.role === 'OPERATIVE') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAssignRole('BLUE', 'OPERATIVE')}
                  className="w-full text-xs font-mono uppercase"
                >
                  + Join as Blue Operative
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Unassigned Players List */}
      {unassignedPlayers.length > 0 && (
        <Card className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-500 block mb-2">
            Unassigned Players ({unassignedPlayers.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {unassignedPlayers.map((p) => (
              <span
                key={p.id}
                className="px-2.5 py-1 text-xs font-mono border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded-xs text-zinc-700 dark:text-zinc-300"
              >
                {p.displayName} {p.id === me.id && '(You)'}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Match Start Footer Bar */}
      <div className="border border-black dark:border-white p-6 rounded-xs bg-white dark:bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-sm font-black uppercase text-black dark:text-white flex items-center gap-2">
            {canStartMatch ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-500" />
                Both Teams Ready to Play
              </>
            ) : (
              <>
                <AlertCircle size={16} className="text-amber-500" />
                Awaiting Valid Team Configurations
              </>
            )}
          </h3>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            {!redSpymaster
              ? 'Red team requires 1 Spymaster.'
              : redOperatives.length === 0
              ? 'Red team requires at least 1 Operative.'
              : !blueSpymaster
              ? 'Blue team requires 1 Spymaster.'
              : blueOperatives.length === 0
              ? 'Blue team requires at least 1 Operative.'
              : isHost
              ? 'All requirements satisfied. You can now launch the match.'
              : 'Waiting for room host to start the match...'}
          </p>
        </div>

        {isHost && (
          <Button
            size="lg"
            variant="primary"
            onClick={handleStartMatch}
            disabled={!canStartMatch}
            className="w-full sm:w-auto min-w-[200px] font-bold uppercase tracking-wider text-xs"
          >
            Start Match <Play size={15} className="ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
