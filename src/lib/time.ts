// Small time helpers kept outside component bodies (render must stay pure).
export function msAgo(ms: number) {
  return new Date(Date.now() - ms);
}

export function isPast(d: Date) {
  return d.getTime() < Date.now();
}
