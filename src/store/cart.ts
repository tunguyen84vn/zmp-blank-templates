// src/store/cart.ts
import { atomWithStorage } from 'jotai/utils';

export interface Slot {
  id: number;
  time: string;
  available: boolean;
  price: number;
  date: string;
}

export const selectedSlotsAtom = atomWithStorage<Slot[]>('pickleball-cart', []);