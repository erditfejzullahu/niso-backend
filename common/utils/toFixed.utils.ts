import Big from 'big.js'

export function toFixedNoRound(num: number, decimals: number) {
  return new Big(num).toFixed(decimals, Big.roundDown);
}