// Four-second kill chains reward aggressive movement; wave bonuses stay flat.
export function chainMultiplier(chain, now) {
  return chain.count > 0 && now <= chain.until ? Math.min(4, 1 + Math.floor((chain.count - 1) / 3)) : 1;
}
export function registerKill(chain, now, baseScore) {
  chain.count = now <= chain.until ? chain.count + 1 : 1;
  chain.until = now + 4;
  const multiplier = chainMultiplier(chain, now);
  chain.peak = Math.max(chain.peak, multiplier);
  return baseScore * multiplier;
}
export function resetChain(chain) { chain.count = 0; chain.until = 0; chain.peak = 1; }
