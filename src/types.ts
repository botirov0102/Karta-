/**
 * TYPES FOR THE PLAYING CARD DESIGNER
 */

export type Suit = 'H' | 'D' | 'C' | 'S'; // Hearts (Yurak), Diamonds (G'isht), Clubs (Chilla), Spades (Qora)
export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface CardState {
  id: string; // e.g., "H_A"
  suit: Suit;
  rank: Rank;
  imageSrc: string | null; // DataURL or object URL
  zoom: number; // Percentage, e.g. 100
  xOffset: number; // Pixels
  yOffset: number; // Pixels
  fit: 'cover' | 'contain' | 'fill';
}

export interface BackState {
  imageSrc: string | null;
  zoom: number;
  xOffset: number;
  yOffset: number;
  fit: 'cover' | 'contain' | 'fill';
}

export const SUITS_INFO: Record<Suit, { char: string; nameUz: string; colorClass: string; hexColor: string }> = {
  H: { char: '♥', nameUz: 'Yurak', colorClass: 'text-red-600', hexColor: '#dc2626' },
  D: { char: '♦', nameUz: 'G\'isht', colorClass: 'text-red-500', hexColor: '#ef4444' },
  C: { char: '♣', nameUz: 'Chilla', colorClass: 'text-neutral-800', hexColor: '#171717' },
  S: { char: '♠', nameUz: 'Qora', colorClass: 'text-neutral-900', hexColor: '#0a0a0a' },
};

export const RANKS_INFO: Record<Rank, { char: string; nameUz: string }> = {
  '6': { char: '6', nameUz: 'Olti' },
  '7': { char: '7', nameUz: 'Yetti' },
  '8': { char: '8', nameUz: 'Sakkiz' },
  '9': { char: '9', nameUz: 'To\'qqiz' },
  '10': { char: '10', nameUz: 'O\'n' },
  'J': { char: 'J', nameUz: 'Valet' },
  'Q': { char: 'Q', nameUz: 'Dama' },
  'K': { char: 'K', nameUz: 'Qirol' },
  'A': { char: 'A', nameUz: 'Tuz' },
};

// Standard 36 card deck generator
export function generateInitialDeck(): CardState[] {
  const suits: Suit[] = ['H', 'D', 'C', 'S'];
  const ranks: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: CardState[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        id: `${suit}_${rank}`,
        suit,
        rank,
        imageSrc: null,
        zoom: 100,
        xOffset: 0,
        yOffset: 0,
        fit: 'cover',
      });
    }
  }

  return deck;
}
