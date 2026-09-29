import { Heart } from 'lucide-react';

interface HealthDisplayProps {
  hp: number;
  maxHp: number;
  isEliminated?: boolean;
}

export function HealthDisplay({ hp, maxHp, isEliminated = false }: HealthDisplayProps) {
  const safeHp = Math.max(0, hp);
  const safeMaxHp = Math.max(1, maxHp);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xs border border-rule bg-canvas/80 backdrop-blur-xs font-mono">
      <div className="flex items-center gap-1">
        {Array.from({ length: safeMaxHp }).map((_, i) => {
          const isAliveHeart = i < safeHp && !isEliminated;
          return (
            <Heart
              key={i}
              size={15}
              className={`transition-all duration-200 ${
                isAliveHeart
                  ? 'fill-red-500 text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.4)]'
                  : 'fill-transparent text-ink-faint'
              }`}
            />
          );
        })}
      </div>

      <span
        className={`text-xs font-black tracking-tight ${
          isEliminated || safeHp === 0
            ? 'text-red-500 line-through'
            : safeHp <= 1
            ? 'text-amber-500 animate-pulse'
            : 'text-ink'
        }`}
      >
        {isEliminated ? 'ELIMINATED' : `HP ${safeHp}/${safeMaxHp}`}
      </span>
    </div>
  );
}
