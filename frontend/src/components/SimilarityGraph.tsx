"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import cytoscape, { type Core, type ElementDefinition, type StylesheetJson } from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { useTheme } from "@/context/ThemeContext";
import { GENRE_COLORS } from "@/lib/constants";
import { edgeKey } from "@/lib/network";
import type { GraphResponse, GraphEdge } from "@/lib/types";

if (typeof window !== "undefined") cytoscape.use(coseBilkent);

export interface SimilarityGraphHandle {
  cy: Core | null;
  fit: () => void;
  zoom: (factor: number) => void;
}
interface Props {
  graph: GraphResponse;
  edges: GraphEdge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function paint(): StylesheetJson {
  const css = getComputedStyle(document.documentElement);
  const color = (name: string) => `rgb(${css.getPropertyValue(name).trim().split(/\s+/).join(",")})`;
  return [
    { selector: "node", style: {
      label: "data(shortLabel)", width: 16, height: 16,
      "background-color": ele => GENRE_COLORS[ele.data("genre")] || "#7c879c",
      "background-opacity": 1, "border-width": 2, "border-color": color("--canvas"),
      color: color("--secondary"), "font-size": 11, "font-family": "Inter, sans-serif",
      "text-wrap": "wrap", "text-max-width": "110px", "text-valign": "bottom", "text-margin-y": 9,
      "text-outline-color": color("--canvas"), "text-outline-width": 3,
      "overlay-opacity": 0, "transition-property": "opacity", "transition-duration": 160,
    }},
    { selector: "node.center", style: {
      width: 28, height: 28, "border-width": 3, "border-color": color("--accent"),
      "font-size": 13, "font-weight": 650, color: color("--primary"),
      "underlay-color": color("--accent"), "underlay-opacity": .09, "underlay-padding": 8,
    }},
    { selector: "edge", style: {
      width: 1, "line-color": color("--graph-edge"), opacity: .38,
      "curve-style": "straight", "overlay-opacity": 0,
    }},
    { selector: ".muted", style: { opacity: .12 }},
    { selector: "node.focused", style: { "border-color": color("--accent"), "border-width": 3, color: color("--primary"), "font-weight": 650 }},
    { selector: "edge.focused", style: { opacity: .8, width: 1.5, "line-color": color("--accent") }},
    { selector: "node:selected", style: { "border-color": color("--accent"), "border-width": 3 }},
  ];
}

const SimilarityGraph = forwardRef<SimilarityGraphHandle, Props>(function SimilarityGraph({graph, edges, selectedId, onSelect}, ref) {
  const element = useRef<HTMLDivElement>(null);
  const cy = useRef<Core | null>(null);
  const callback = useRef(onSelect);
  callback.current = onSelect;
  const selected = useRef(selectedId);
  selected.current = selectedId;
  const lastCenter = useRef<string | null>(null);
  const lastNodes = useRef("");
  const { resolvedTheme } = useTheme();
  const fit = useCallback(() => {
    if (!cy.current?.nodes().length) return;
    cy.current.fit(undefined, 64);
    // A fit-all on a phone makes every title illegible. Start close enough to
    // read, centered on the starting book; the full map remains pannable.
    if (cy.current.width() < 500 && cy.current.zoom() < 1) {
      cy.current.zoom(1);
      cy.current.center(cy.current.nodes(".center"));
      return;
    }
    if (cy.current.zoom() > 1.35) cy.current.zoom(1.35);
    cy.current.center();
  }, []);
  const focus = useCallback((id: string | null) => {
    const instance = cy.current;
    if (!instance) return;
    instance.elements().removeClass("muted focused");
    if (!id) return;
    const node = instance.getElementById(id);
    if (!node.length) return;
    instance.elements().addClass("muted");
    node.closedNeighborhood().removeClass("muted");
    node.addClass("focused");
    node.connectedEdges().addClass("focused");
  }, []);
  useImperativeHandle(ref, () => ({
    get cy() { return cy.current; },
    fit,
    zoom(factor) {
      const instance = cy.current;
      if (instance) instance.zoom({level: Math.max(.25, Math.min(2.5, instance.zoom() * factor)), renderedPosition: {x:instance.width()/2,y:instance.height()/2}});
    },
  }), [fit]);

  useEffect(() => {
    if (!element.current) return;
    const instance = cytoscape({
      container: element.current, elements: [], style: paint(), layout: {name:"preset"},
      minZoom: .25, maxZoom: 2.5, wheelSensitivity: .18,
      boxSelectionEnabled: false, autounselectify: true, touchTapThreshold: 10,
    });
    cy.current = instance;
    instance.on("tap", "node", event => callback.current(event.target.id()));
    instance.on("tap", event => { if (event.target === instance) callback.current(null); });
    instance.on("mouseover", "node", event => { if (!selected.current) focus(event.target.id()); element.current!.style.cursor="grab"; });
    instance.on("mouseout", "node", () => { focus(selected.current); element.current!.style.cursor="default"; });
    instance.on("grab", "node", () => { element.current!.style.cursor="grabbing"; });
    instance.on("free", "node", () => { element.current!.style.cursor="grab"; });
    let previousWidth = element.current.clientWidth;
    const observer = new ResizeObserver(() => {
      instance.resize();
      const width = element.current?.clientWidth || 0;
      if ((width < 500) !== (previousWidth < 500)) fit();
      previousWidth = width;
    });
    observer.observe(element.current);
    return () => { observer.disconnect(); instance.destroy(); cy.current=null; lastCenter.current=null; lastNodes.current=""; };
  }, [focus, fit]);

  useEffect(() => {
    const instance = cy.current;
    if (!instance) return;
    const nodes = [graph.center_book, ...graph.nodes.filter(n => n.id !== graph.center_book.id)];
    const signature = nodes.map(n=>n.id).sort().join("\u0000");
    const fresh = lastCenter.current !== graph.center_book.id;
    const changed = lastNodes.current !== signature;
    const wantedNodes = new Set(nodes.map(n=>n.id));
    const wantedEdges = new Set(edges.map(edge => "edge:" + edgeKey(edge)));
    instance.batch(() => {
      if (fresh) instance.elements().remove();
      instance.nodes().filter(n=>!wantedNodes.has(n.id())).remove();
      instance.edges().filter(e=>!wantedEdges.has(e.id())).remove();
      const additions: ElementDefinition[] = [];
      nodes.forEach((node, index) => {
        const data = {id:node.id, label:node.label, shortLabel:node.label.length > 48 ? node.label.slice(0,45)+"…" : node.label, genre:node.genre, nodeData:node};
        const existing = instance.getElementById(node.id);
        if (existing.length) existing.data(data);
        else {
          const angle = index * 2.399963;
          const radius = 60 + 45 * Math.sqrt(index);
          additions.push({data, classes:node.id===graph.center_book.id?"center":"",position:{x:Math.cos(angle)*radius,y:Math.sin(angle)*radius}});
        }
      });
      edges.forEach(edge => {
        const id = "edge:" + edgeKey(edge);
        if (!instance.getElementById(id).length) additions.push({data:{...edge,id}});
      });
      instance.add(additions);
    });
    lastCenter.current = graph.center_book.id;
    lastNodes.current = signature;
    focus(selected.current);
    if (fresh || changed) {
      // Compute settled positions once; dragging never restarts or randomizes the map.
      instance.layout({
        name:"cose-bilkent", animate:false, randomize:false, fit:false,
        nodeDimensionsIncludeLabels:true, nodeRepulsion:11000, idealEdgeLength:95,
        edgeElasticity:.18, gravity:.18, numIter:1600, quality:"default",
      } as cytoscape.LayoutOptions).run();
      fit();
    }
  }, [graph, edges, fit, focus]);

  useEffect(() => { cy.current?.style(paint()); }, [resolvedTheme]);
  useEffect(() => { focus(selectedId); }, [selectedId, focus]);

  return <div ref={element} className="w-full h-full" role="img" aria-label={`Book connection map for ${graph.center_book.label}. ${graph.nodes.length} related books. Use the book list to select a book with the keyboard.`} />;
});
export default SimilarityGraph;
