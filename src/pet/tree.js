function selector(nodes) {
  return (ctx) => {
    for (const node of nodes) {
      const result = node(ctx);
      if (result) {
        return result;
      }
    }
    return null;
  };
}

const petTree = selector([
  (ctx) => (ctx.holding ? 'dragging' : null),
  (ctx) => (ctx.phase === 'ragdoll' ? 'ragdoll' : null),
  (ctx) => (ctx.phase === 'glance' ? 'glance' : null),
  (ctx) => (ctx.falling ? 'fall' : null),
  (ctx) => (ctx.wander ? 'walk' : null),
  (ctx) => (ctx.calm > ctx.idleWait ? 'wander' : null),
  () => 'idle',
]);

export function choosePetAction(ctx) {
  return petTree(ctx);
}
