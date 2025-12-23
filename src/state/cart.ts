import { atom } from 'jotai';

export interface Slot {
  id: number;
  time: string;
  available: boolean;
  price: number;
}

export const cartAtom = atom<Slot[]>([]);  // Global cart state