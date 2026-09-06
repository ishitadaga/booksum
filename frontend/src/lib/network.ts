import type { GraphEdge, GraphResponse } from "./types";

export const edgeKey = (edge: GraphEdge) => JSON.stringify([edge.source, edge.target].sort());

// A view filter, never a new similarity calculation. Preserve input weights.
export function networkLinks(graph: GraphResponse, all = false): GraphEdge[] {
  const ids = new Set([graph.center_book.id, ...graph.nodes.map(node => node.id)]);
  const unique = new Map<string, GraphEdge>();
  for (const edge of graph.edges) {
    if (edge.source === edge.target || !ids.has(edge.source) || !ids.has(edge.target) || !Number.isFinite(edge.weight)) continue;
    const key = edgeKey(edge);
    if (!unique.has(key) || unique.get(key)!.weight < edge.weight) unique.set(key, edge);
  }
  const sorted = [...unique.values()].sort((a, b) => b.weight - a.weight || edgeKey(a).localeCompare(edgeKey(b)));
  if (all) return sorted;
  const parent = new Map([...ids].map(id => [id, id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    while (id !== root) { const next = parent.get(id)!; parent.set(id, root); id = next; }
    return root;
  };
  const chosen: GraphEdge[] = [];
  const keys = new Set<string>();
  const degree = new Map<string, number>();
  const add = (edge: GraphEdge) => {
    chosen.push(edge); keys.add(edgeKey(edge));
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
  };
  // Maximum spanning forest retains reachability, including sparse/disconnected input.
  for (const edge of sorted) {
    const a = find(edge.source), b = find(edge.target);
    if (a !== b) { parent.set(a, b); add(edge); }
  }
  const budget = chosen.length + Math.ceil(ids.size / 3);
  for (const edge of sorted) {
    if (chosen.length >= budget) break;
    if (!keys.has(edgeKey(edge)) && (degree.get(edge.source) || 0) < 4 && (degree.get(edge.target) || 0) < 4) add(edge);
  }
  return chosen;
}
