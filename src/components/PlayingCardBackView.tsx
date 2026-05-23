import { useEffect, useRef, useState } from 'react';
import { BackState } from '../types';
import { drawCardBack } from '../cardRenderer';
import { RefreshCw, Image as ImageIcon } from 'lucide-react';

interface PlayingCardBackViewProps {
  back: BackState;
  onClick?: () => void;
  className?: string;
}

export function PlayingCardBackView({ back, onClick, className = '' }: PlayingCardBackViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    // Draw card back
    drawCardBack(ctx, back, 550, 850)
      .catch((err) => console.error('Rasm chizishda xato:', err))
      .finally(() => setIsDrawing(false));
  }, [back]);

  return (
    <div 
      className={`group relative aspect-[5.5/8.5] w-full max-w-[150px] mx-auto select-none rounded-[1.25rem] bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        width={550}
        height={850}
        className="w-full h-full rounded-[1.125rem] border border-neutral-200/80 shadow-sm transition-all animate-fade-in"
      />

      {onClick && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[1.125rem] bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex flex-col items-center justify-center p-3 text-center text-white backdrop-blur-[2px] rounded-lg">
            <ImageIcon className="h-6 w-6 stroke-[2] drop-shadow-md mb-1 text-amber-300 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide drop-shadow-sm">O'zgartirish</span>
            <span className="text-[10px] text-neutral-300 font-mono mt-1 bg-black/30 px-1.5 py-0.5 rounded uppercase">
              ORQA DIZAYN
            </span>
          </div>
        </div>
      )}

      {isDrawing && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[1.125rem] bg-neutral-100">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-amber-500" />
        </div>
      )}
    </div>
  );
}
