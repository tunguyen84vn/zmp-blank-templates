// src/store/cart.ts
import { atom } from 'jotai'; 
import { atomWithStorage } from 'jotai/utils';

// --- Phần Giỏ hàng (Cũ) ---
export interface Slot {
  id: number;
  time: string;
  available: boolean;
  price: number;
  date: string;
}

export const selectedSlotsAtom = atomWithStorage<Slot[]>('pickleball-cart', []);

// --- Phần User (MỚI - Cần thêm đoạn này để hết lỗi) ---
export interface UserState {
  id: string;      
  name: string;    
  avatar: string;  
  phone?: string;  
}

export const userAtom = atom<UserState>({
  id: '',
  name: '',
  avatar: '',
});