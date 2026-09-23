import type { CartLine } from '../catalog/types';
import { cartKey } from '../catalog/logic';

/** Consume only the submitted quantities, preserving additions made during a request. */
export function consumeCart(lines: CartLine[], ordered: CartLine[]): CartLine[] {
  return lines.flatMap(line => {
    const quantity = Math.round((line.quantity - (ordered.find(item => cartKey(item) === cartKey(line))?.quantity ?? 0)) * 1000) / 1000;
    return quantity > 0 ? [{ ...line, quantity }] : [];
  });
}
