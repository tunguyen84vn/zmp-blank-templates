// src/store/cart.ts
import { atomWithStorage } from 'jotai/utils';

export interface Slot {
  id: number;
  time: string;
  available: boolean;
  price: number;
  date: string;
}

export const selectedSlotsAtom = atomWithStorage<Slot[]>(
  'pickleball-cart',
  [],
  {
    getItem: (key) => {
      const str = localStorage.getItem(key);
      if (!str) return [];
      try {
        const parsed = JSON.parse(str);
        if (!Array.isArray(parsed)) return [];

        // Validate cơ bản: lọc các slot hợp lệ
        return parsed.filter((slot: any) =>
          slot &&
          typeof slot.id === 'number' &&
          typeof slot.time === 'string' &&
          typeof slot.date === 'string' &&
          typeof slot.price === 'number' &&
          typeof slot.available === 'boolean'
        );
      } catch (e) {
        console.error('Lỗi parse pickleball-cart từ localStorage:', e);
        return [];
      }
    },
    setItem: (key, value) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    removeItem: (key) => {
      localStorage.removeItem(key);
    },
  }
);