"use client";
import { useRef, useEffect, useCallback } from "react";
import cytoscape, { Core } from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import type { GraphResponse, GraphNode } from "@/lib/types";
import { GENRE_COLORS } from "@/lib/constants";

// Register layout extension once
if (typeof window !== "undefined") {
  cytoscape.use(coseBilkent);
}

interface Props {
  graph: GraphResponse;
  onNodeClick: (node: GraphNode) => void;
  onNodeDoubleClick: (bookId: string) => void;
}

export default function SimilarityGraph({ graph, onNodeClick, onNodeDoubleClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const runLayout = useCallback(() => {
    if (!cyRef.current) return;
    cyRef.current
      .layout({
        name: "cose-bilkent",
        animate: true,
        animationDuration: 800,
        nodeRepulsion: 6000,
        idealEdgeLength: 100,
        edgeElasticity: 0.1,
        nestingFactor: 0.1,
        gravity: 0.35,
        numIter: 2500,
        fit: true,
        padding: 50,
      } as any)
      .run();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create tooltip element
    if (!tooltipRef.current) {
      const tip = document.createElement("div");
      tip.style.cssText =
        "position:absolute;pointer-events:none;z-index:100;background:#1f2937;border:1px solid #374151;border-radius:8px;padding:8px 12px;color:#f9fafb;font-size:12px;max-width:220px;box-shadow:0 4px 12px rgba(0,0,0,0.4);opacity:0;transition:opacity 0.15s;line-height:1.4;";
      containerRef.current.parentElement!.appendChild(tip);
      tooltipRef.current = tip;
    }

    // Build elements
    const elements: cytoscape.ElementDefinition[] = [];

    const c = graph.center_book;
    elements.push({
      data: {
        id: c.id,
        label: c.label,
        author: c.author,
        genre: c.genre,
        similarity: 1,
        isCenter: true,
        nodeData: c,
      },
    });

    for (const node of graph.nodes) {
      elements.push({
        data: {
          id: node.id,
          label: node.label,
          author: node.author,
          genre: node.genre,
          similarity: node.similarity,
          isCenter: false,
          nodeData: node,
        },
      });
    }

    for (const edge of graph.edges) {
      elements.push({
        data: {
          id: `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          weight: edge.weight,
        },
      });
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            // No permanent label — title shown on hover via tooltip
            label: "",
            "background-color": (ele: any) => {
              const genre = ele.data("genre") || "Fiction";
              return GENRE_COLORS[genre] || "#666";
            },
            width: (ele: any) => {
              if (ele.data("isCenter")) return 40;
              const sim = ele.data("similarity") || 0.3;
              return 16 + sim * 16;
            },
            height: (ele: any) => {
              if (ele.data("isCenter")) return 40;
              const sim = ele.data("similarity") || 0.3;
              return 16 + sim * 16;
            },
            "border-width": (ele: any) => (ele.data("isCenter") ? 3 : 1.5),
            "border-color": (ele: any) => (ele.data("isCenter") ? "#93c5fd" : "#4b5563"),
            "background-opacity": (ele: any) => (ele.data("isCenter") ? 1 : 0.85),
          } as any,
        },
        {
          selector: "edge",
          style: {
            width: (ele: any) => {
              const w = ele.data("weight") || 0.3;
              return 0.3 + w * 1.2; // very thin baseline, scales up slightly
            },
            "line-color": (ele: any) => {
              // Similarity gradient: low=dim gray, high=bright blue
              const w = Math.min(Math.max(ele.data("weight") || 0.3, 0), 1);
              const r = Math.round(55 + (96 - 55) * w);   // 37 → 60
              const g = Math.round(65 + (165 - 65) * w);  // 41 → a5
              const b = Math.round(81 + (250 - 81) * w);  // 51 → fa
              return `rgb(${r},${g},${b})`;
            },
            opacity: (ele: any) => {
              const w = ele.data("weight") || 0.3;
              return 0.12 + w * 0.5; // low sim = nearly invisible, high sim = prominent
            },
            "curve-style": "bezier",
          } as any,
        },
        {
          selector: "node:active",
          style: { "overlay-opacity": 0 },
        },
      ],
      layout: { name: "preset" },
      minZoom: 0.2,
      maxZoom: 3,
    });

    cyRef.current = cy;

    // Click → open sidebar
    cy.on("tap", "node", (evt) => {
      const nodeData = evt.target.data("nodeData");
      if (nodeData) onNodeClick(nodeData);

      // Highlight clicked node
      cy.nodes().style({ "border-color": (e: any) => (e.data("isCenter") ? "#93c5fd" : "#4b5563") } as any);
      evt.target.style({ "border-color": "#60a5fa", "border-width": 3 });
    });

    cy.on("dbltap", "node", (evt) => {
      onNodeDoubleClick(evt.target.id());
    });

    // Hover → show tooltip with title
    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      const tip = tooltipRef.current;
      if (!tip) return;

      const title = node.data("label") || "";
      const author = node.data("author") || "";
      const sim = node.data("similarity");
      const isCenter = node.data("isCenter");

      let html = `<div style="font-weight:600;margin-bottom:2px">${title}</div>`;
      if (author) html += `<div style="color:#9ca3af">${author}</div>`;
      if (!isCenter && sim) html += `<div style="color:#60a5fa;margin-top:3px">${(sim * 100).toFixed(1)}% similar</div>`;

      tip.innerHTML = html;
      tip.style.opacity = "1";

      // Position tooltip near node
      const pos = node.renderedPosition();
      const container = containerRef.current!.getBoundingClientRect();
      tip.style.left = `${pos.x + container.left + 20}px`;
      tip.style.top = `${pos.y + container.top - 10}px`;

      // Highlight
      node.style({ "border-color": "#60a5fa", "border-width": 3 });
      containerRef.current!.style.cursor = "pointer";
    });

    cy.on("mouseout", "node", (evt) => {
      const tip = tooltipRef.current;
      if (tip) tip.style.opacity = "0";

      const isCenter = evt.target.data("isCenter");
      evt.target.style({
        "border-color": isCenter ? "#93c5fd" : "#4b5563",
        "border-width": isCenter ? 3 : 1.5,
      });
      containerRef.current!.style.cursor = "default";
    });

    // Hide tooltip on pan/zoom
    cy.on("viewport", () => {
      const tip = tooltipRef.current;
      if (tip) tip.style.opacity = "0";
    });

    runLayout();

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [graph, onNodeClick, onNodeDoubleClick, runLayout]);

  return <div ref={containerRef} className="w-full h-full relative" />;
}
