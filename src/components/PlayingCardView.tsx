import { useEffect, useRef, useState } from 'react';
import { CardState, SUITS_INFO, RANKS_INFO } from '../types';
import { drawCardFront } from '../cardRenderer';
import { Sparkles, Image as ImageIcon } from 'lucide-react';

interface PlayingCardViewProps {
  card: CardState;
  onClick?: () => void;
  className?: string;
}

export function PlayingCardView({ card, onClick, className = '' }: PlayingCardViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    // Draw the card front onto the high-resolution canvas
    drawCardFront(ctx, card, 550, 850)
      .catch((err) => console.error('Rasm chizishda xato:', err))
      .finally(() => setIsDrawing(false));
  }, [card]);

  const suit = SUITS_INFO[card.suit];
  const rank = RANKS_INFO[card.rank];

  return (
    <div 
      className={`group relative aspect-[5.5/8.5] w-full max-w-[150px] mx-auto select-none rounded-[1.25rem] bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {/* High-res rendered Canvas, fitting completely with perfect aspect ratio */}
      <canvas
        ref={canvasRef}
        width={550}
        height={850}
        className="w-full h-full rounded-[1.125rem] border border-neutral-200/80 shadow-sm transition-all saturate-[1.02]"
      />

      {/* Modern Hover Overlay */}
      {onClick && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[1.125rem] bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex flex-col items-center justify-center p-3 text-center text-white backdrop-blur-[2px] rounded-lg">
            <ImageIcon className="h-6 w-6 stroke-[2] drop-shadow-md mb-1 animate-pulse text-amber-300" />
            <span className="text-xs font-semibold tracking-wide drop-shadow-sm">O'zgartirish</span>
            <span className="text-[10px] text-neutral-300 font-mono mt-0.5 mt-1 bg-black/30 px-1.5 py-0.5 rounded uppercase">
              {suit.char} {rank.char}
            </span>
          </div>
        </div>
      )}

      {/* Small marker badge if customized */}
      {card.imageSrc && (
        <div className="absolute right-2 top-2 pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md animate-bounce">
          <Sparkles className="h-3 w-3" />
        </div>
      )}

      {/* Loading Skeleton */}
      {isDrawing && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[1.125rem] bg-neutral-100">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-amber-500" />
        </div>
      )}
    </div>
  );
}
