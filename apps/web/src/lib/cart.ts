'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

const SESSION_KEY = 'sessionId';
const CHANGED_EVENT = 'cart:changed';

/** The guest cart id kept in this browser. `create` makes one the first time something is added. */
export function getSessionId(create = false): string | null {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id && create) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id || null;
  } catch {
    return null;
  }
}

/** Tells the header badge (and any open cart page) that the cart changed. */
export function notifyCartChanged() {
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export async function addToCart(productId: string, quantity = 1) {
  const sessionId = getSessionId(true);
  if (!sessionId) throw new Error('Cart storage is unavailable');
  await apiPost(`/cart/items?sessionId=${sessionId}`, { productId, quantity });
  notifyCartChanged();
}

/** Total number of units in the cart, kept in sync across the page. Stays 0 until something has been added. */
export function useCartCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const refresh = () => {
      const sessionId = getSessionId();
      if (!sessionId) return; // never asks the API (and never creates a cart) for visitors who have not added anything
      apiGet(`/cart?sessionId=${sessionId}`)
        .then((cart) => setCount((cart?.items ?? []).reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0)))
        .catch(() => undefined);
    };
    refresh();
    window.addEventListener(CHANGED_EVENT, refresh);
    window.addEventListener('pageshow', refresh);
    return () => {
      window.removeEventListener(CHANGED_EVENT, refresh);
      window.removeEventListener('pageshow', refresh);
    };
  }, []);
  return count;
}

export type CartItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
    sku: string;
    partCode?: string | null;
    price: string | number;
    translations?: { locale: string; name: string }[];
    images?: { url: string }[];
    inventory?: { stock: number; reserved?: number } | null;
  };
};

/** The current cart. Resolves to an empty cart without calling the API when nothing was ever added in this browser. */
export function fetchCart(): Promise<{ items: CartItem[] }> {
  const sessionId = getSessionId();
  if (!sessionId) return Promise.resolve({ items: [] });
  return apiGet(`/cart?sessionId=${sessionId}`);
}
