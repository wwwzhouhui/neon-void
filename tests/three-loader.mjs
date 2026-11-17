export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return {url: new URL('../game/vendor/three/three.module.min.js', import.meta.url).href, shortCircuit: true};
  return nextResolve(specifier, context);
}
