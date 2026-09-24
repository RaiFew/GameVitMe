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
      <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xs p-6 sm:p-8">
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
            <div className="w-10 h-10 rounded-full border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 flex items-center justify-center font-black font-mono text-xs tracking-wider shadow-xs">
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
    <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xs p-4 sm:p-6 space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">
          Battle Arena ({players.length} Players)
        </span>
        <span className="text-[10px] font-mono text-zinc-400">
          {gameMode === 'BATTLE_ROYALE'
            ? `${players.filter((p) => p.isAlive).length} Survivors Remaining`
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
                  ? 'opacity-40 border-zinc-300 dark:border-zinc-800 bg-zinc-200/50 dark:bg-zinc-900/20'
                  : isWinner
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/30'
                  : isMe
                  ? 'border-black dark:border-white bg-white dark:bg-zinc-950'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
              }`}
            >
              {/* Me Badge */}
              {isMe && (
                <span className="absolute -top-2 left-2 px-1.5 py-0.2 bg-black dark:bg-white text-white dark:text-black text-[8px] font-mono font-bold uppercase rounded-xs">
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
                    <div className="w-12 h-12 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400 text-lg animate-pulse">
                      ?
                    </div>
                  )
                ) : (
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-2xl">
                    {getChoiceEmoji(player.choice)}
                  </div>
                )}
              </div>

              {/* Player Name */}
              <span className="font-bold text-xs truncate max-w-full text-black dark:text-white">
                {player.displayName}
              </span>

              {/* Score / Status */}
              <div className="mt-1 flex items-center gap-1">
                {gameMode !== 'BATTLE_ROYALE' ? (
                  <span className="text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400">
                    {player.score} pts
                  </span>
                ) : (
                  <span
                    className={`text-[9px] font-mono font-bold uppercase ${
                      isEliminated
                        ? 'text-red-500'
                        : isWinner
                        ? 'text-emerald-500'
                        : 'text-zinc-400'
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
          ? 'border-zinc-300 dark:border-zinc-800 opacity-60 bg-white dark:bg-zinc-950'
          : isMe
          ? 'border-black dark:border-white bg-white dark:bg-zinc-950 shadow-md'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
      }`}
    >
      {isMe && (
        <span className="absolute -top-2.5 px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black text-[9px] font-mono font-bold uppercase tracking-widest rounded-xs">
          YOU
        </span>
      )}

      {isWinner && (
        <span className="absolute -top-2.5 px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-mono font-bold uppercase tracking-widest rounded-xs shadow-xs">
          Round Winner 🏆
        </span>
      )}

      {/* Hand Display */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center my-3 shadow-inner bg-zinc-50 dark:bg-zinc-900">
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
              <span className="text-3xl text-zinc-400">💭</span>
              <span className="text-[10px] font-mono text-zinc-400 mt-1">Deciding...</span>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-5xl sm:text-6xl animate-bounce">{getChoiceEmoji(player.choice)}</span>
          </div>
        )}
      </div>

      {/* Player Details */}
      <h4 className="font-black text-base sm:text-lg text-black dark:text-white uppercase tracking-tight">
        {player.displayName}
      </h4>

      {!isChoosing && (
        <span className="text-xs font-mono font-bold text-zinc-500 mt-0.5">
          {getChoiceLabel(player.choice)}
        </span>
      )}

      {/* Score Badge */}
      <div className="mt-3 px-3 py-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 flex items-center gap-1.5 font-mono text-xs font-black">
        <span className="text-zinc-500 uppercase text-[10px]">Score:</span>
        <span className="text-black dark:text-white text-sm">{player.score}</span>
      </div>
    </div>
  );
}
