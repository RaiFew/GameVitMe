import type {
  RPSChoice,
  RPSGameMode,
  RPSPhase,
  RPSPlayerViewItem,
} from '@party/rock-paper-scissors';

interface Props {
  gameMode: RPSGameMode;
  phase: RPSPhase;
  players: RPSPlayerViewItem[];
  myId: string;
  winnerIds: string[];
  eliminatedIds: string[];
}

function getChoiceEmoji(choice: RPSChoice | null): string {
  switch (choice) {
    case 'ROCK':
      return '🪨';
    case 'PAPER':
      return '📄';
    case 'SCISSORS':
      return '✂️';
    default:
      return '❓';
  }
}

function getChoiceLabel(choice: RPSChoice | null): string {
  switch (choice) {
    case 'ROCK':
      return 'Rock (ค้อน)';
    case 'PAPER':
      return 'Paper (กระดาษ)';
    case 'SCISSORS':
      return 'Scissors (กรรไกร)';
    default:
      return 'Hidden';
  }
}

export function RPSArena({
  gameMode,
  phase,
  players,
  myId,
  winnerIds,
  eliminatedIds,
}: Props) {
  const isChoosing = phase === 'CHOOSING';
  const isDuel = gameMode === 'DUEL' && players.length === 2;

  if (isDuel) {
    const playerA = players[0]!;
    const playerB = players[1]!;

    return (
      <div className="bg-canvas-sunk/50 border border-rule rounded-xs p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6 items-center">
          {/* Player A Card */}
          <div className="md:col-span-3 flex flex-col items-center text-center">
            <DuelPlayerCard
              player={playerA}
              isChoosing={isChoosing}
              isMe={playerA.id === myId}
              isWinner={winnerIds.includes(playerA.id)}
              isLoser={!isChoosing && winnerIds.length > 0 && !winnerIds.includes(playerA.id)}
            />
          </div>

          {/* VS Divider */}
          <div className="md:col-span-1 flex flex-col items-center justify-center my-2 md:my-0">
            <div className="w-10 h-10 rounded-full border-2 border-rule bg-canvas flex items-center justify-center font-black font-mono text-xs tracking-wider shadow-xs">
              VS
            </div>
          </div>

          {/* Player B Card */}
          <div className="md:col-span-3 flex flex-col items-center text-center">
            <DuelPlayerCard
              player={playerB}
              isChoosing={isChoosing}
              isMe={playerB.id === myId}
              isWinner={winnerIds.includes(playerB.id)}
              isLoser={!isChoosing && winnerIds.length > 0 && !winnerIds.includes(playerB.id)}
            />
          </div>
        </div>
      </div>
    );
  }

  // Multi-player Grid Layout (Battle Royale / Points Race)
  return (
    <div className="bg-canvas-sunk/50 border border-rule rounded-xs p-4 sm:p-6 space-y-3">
      <div className="flex items-center justify-between border-b border-rule pb-2">
        <span className="text-xs font-mono uppercase tracking-wider text-ink-muted font-bold">
          Battle Arena ({players.length} Players)
        </span>
        <span className="text-[10px] font-mono text-ink-faint">
          {gameMode === 'BATTLE_ROYALE'
            ? `${players.filter((p) => p.isAlive).length} Survivors Remaining`
            : gameMode === 'TOURNAMENT'
            ? 'Lives to Zero'
            : 'Race to Target Points'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {players.map((player) => {
          const isMe = player.id === myId;
          const isWinner = winnerIds.includes(player.id);
          const isEliminated = eliminatedIds.includes(player.id) || !player.isAlive;

          return (
            <div
              key={player.id}
              className={`p-3 rounded-xs border-2 transition-all flex flex-col items-center text-center relative ${
                isEliminated
                  ? 'opacity-40 border-rule bg-canvas-sunk/50'
                  : isWinner
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/30'
                  : isMe
                  ? 'border-rule-strong bg-canvas'
                  : 'border-rule bg-canvas'
              }`}
            >
              {/* Me Badge */}
              {isMe && (
                <span className="absolute -top-2 left-2 px-1.5 py-0.2 bg-ink text-canvas text-[8px] font-mono font-bold uppercase rounded-xs">
                  YOU
                </span>
              )}

              {/* Status Badge */}
              {isEliminated ? (
                <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-red-600 text-white text-[8px] font-mono font-bold uppercase rounded-xs">
                  OUT
                </span>
              ) : isWinner ? (
                <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-emerald-600 text-white text-[8px] font-mono font-bold uppercase rounded-xs">
                  WIN
                </span>
              ) : null}

              {/* Hand Icon / Choice */}
              <div className="my-2">
                {isChoosing ? (
                  player.hasChosen ? (
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold">
                      {isMe && player.choice ? getChoiceEmoji(player.choice) : '✓'}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full border border-dashed border-rule flex items-center justify-center text-ink-faint text-lg animate-pulse">
                      ?
                    </div>
                  )
                ) : (
                  <div className="w-12 h-12 rounded-full bg-canvas-sunk border border-rule flex items-center justify-center text-2xl">
                    {getChoiceEmoji(player.choice)}
                  </div>
                )}
              </div>

              {/* Player Name */}
              <span className="font-bold text-xs truncate max-w-full text-ink">
                {player.displayName}
              </span>

              {/* Score / Status */}
              <div className="mt-1 flex items-center gap-1">
                {gameMode === 'TOURNAMENT' ? (
                  <span className="text-[10px] font-mono font-bold text-ink-muted">
                    {player.lives} {player.lives === 1 ? 'life' : 'lives'}
                  </span>
                ) : gameMode !== 'BATTLE_ROYALE' ? (
                  <span className="text-[10px] font-mono font-bold text-ink-muted">
                    {player.score} pts
                  </span>
                ) : (
                  <span
                    className={`text-[9px] font-mono font-bold uppercase ${
                      isEliminated
                        ? 'text-red-500'
                        : isWinner
                        ? 'text-emerald-500'
                        : 'text-ink-faint'
                    }`}
                  >
                    {isEliminated ? 'Eliminated' : 'Alive'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DuelPlayerCard({
  player,
  isChoosing,
  isMe,
  isWinner,
  isLoser,
}: {
  player: RPSPlayerViewItem;
  isChoosing: boolean;
  isMe: boolean;
  isWinner: boolean;
  isLoser: boolean;
}) {
  return (
    <div
      className={`w-full p-6 rounded-xs border-2 transition-all flex flex-col items-center relative ${
        isWinner
          ? 'border-emerald-500 bg-emerald-500/10 shadow-lg ring-4 ring-emerald-500/20'
          : isLoser
          ? 'border-rule opacity-60 bg-canvas'
          : isMe
          ? 'border-rule-strong bg-canvas shadow-md'
          : 'border-rule bg-canvas'
      }`}
    >
      {isMe && (
        <span className="absolute -top-2.5 px-2 py-0.5 bg-ink text-canvas text-[9px] font-mono font-bold uppercase tracking-widest rounded-xs">
          YOU
        </span>
      )}

      {isWinner && (
        <span className="absolute -top-2.5 px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-mono font-bold uppercase tracking-widest rounded-xs shadow-xs">
          Round Winner 🏆
        </span>
      )}

      {/* Hand Display */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-rule flex items-center justify-center my-3 shadow-inner bg-canvas-sunk">
        {isChoosing ? (
          player.hasChosen ? (
            <div className="flex flex-col items-center">
              {isMe && player.choice ? (
                <>
                  <span className="text-4xl">{getChoiceEmoji(player.choice)}</span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    Ready
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl text-emerald-500 font-black font-mono">✓</span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    Locked In
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center animate-pulse">
              <span className="text-3xl text-ink-faint">💭</span>
              <span className="text-[10px] font-mono text-ink-faint mt-1">Deciding...</span>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-5xl sm:text-6xl animate-bounce">{getChoiceEmoji(player.choice)}</span>
          </div>
        )}
      </div>

      {/* Player Details */}
      <h4 className="font-black text-base sm:text-lg text-ink uppercase tracking-tight">
        {player.displayName}
      </h4>

      {!isChoosing && (
        <span className="text-xs font-mono font-bold text-ink-muted mt-0.5">
          {getChoiceLabel(player.choice)}
        </span>
      )}

      {/* Score Badge */}
      <div className="mt-3 px-3 py-1 rounded-full border border-rule bg-canvas-sunk flex items-center gap-1.5 font-mono text-xs font-black">
        <span className="text-ink-muted uppercase text-[10px]">Score:</span>
        <span className="text-ink text-sm">{player.score}</span>
      </div>
    </div>
  );
}
