"use client";
import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import cytoscape, { Core } from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import type { GraphResponse, GraphNode } from "@/lib/types";
import { GENRE_COLORS } from "@/lib/constants";
import { useTheme } from "@/context/ThemeContext";

function graphPalette() {
  const css = getComputedStyle(document.documentElement);
  const color = (name: string) => `rgb(${css.getPropertyValue(name).trim().split(/\s+/).join(",")})`;
  return { edge: color("--graph-edge"), border: color("--strong"), accent: color("--link"), success: color("--success") };
}

// Register layout extension once
if (typeof window !== "undefined") {
  cytoscape.use(coseBilkent);
}

export interface SimilarityGraphHandle {
  cy: Core | null;
  runLayout: () => void;
}

interface Props {
  graph: GraphResponse;
  onNodeClick: (node: GraphNode) => void;
  onNodeDoubleClick: (bookId: string) => void;
  onDeselect?: () => void;
}

const SimilarityGraph = forwardRef<SimilarityGraphHandle, Props>(
  function SimilarityGraph({ graph, onNodeClick, onNodeDoubleClick, onDeselect }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<Core | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const prevCenterRef = useRef<string | null>(null);
    const { resolvedTheme } = useTheme();
    const palette = useRef({ edge: "#60749f", border: "#8b96a9", accent: "#1d4ed8", success: "#15803d" });

    const runLayout = useCallback(() => {
      if (!cyRef.current) return;
      const cy = cyRef.current;

      cy.layout({
        name: "cose-bilkent",
        animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        animationDuration: 1000,
        nodeRepulsion: 8000,
        idealEdgeLength: 120,
        edgeElasticity: 0.15,
        nestingFactor: 0.1,
        gravity: 0.25,
        gravityRange: 1.5,
        numIter: 3000,
        fit: true,
        padding: 60,
        randomize: true,
        ungrabifyWhileSimulating: false,
      } as any).run();
    }, []);

    // Expose cy instance and runLayout to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        get cy() {
          return cyRef.current;
        },
        runLayout,
      }),
      [runLayout]
    );

    useEffect(() => {
      if (!containerRef.current) return;
      palette.current = graphPalette();

      const currentCenter = graph.center_book.id;
      const isExpansion = prevCenterRef.current === currentCenter && cyRef.current !== null;
      prevCenterRef.current = currentCenter;

      // --- Expansion path: add new nodes/edges to existing instance ---
      if (isExpansion && cyRef.current) {
        const cy = cyRef.current;
        const existingIds = new Set(cy.nodes().map((n) => n.id()));

        // Collect new elements
        const newElements: cytoscape.ElementDefinition[] = [];
        const expandedNode = cy.getElementById(graph.center_book.id);
        const expandPos = expandedNode.length > 0
          ? expandedNode.position()
          : { x: cy.width() / 2, y: cy.height() / 2 };

        // Add new nodes (not already in graph)
        const newNodeIds: string[] = [];
        for (const node of graph.nodes) {
          if (!existingIds.has(node.id)) {
            newNodeIds.push(node.id);
            newElements.push({
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
        }

        // Add new edges (check both directions)
        const existingEdgeIds = new Set(cy.edges().map((e) => e.id()));
        for (const edge of graph.edges) {
          const edgeId = `${edge.source}-${edge.target}`;
          const reverseId = `${edge.target}-${edge.source}`;
          if (!existingEdgeIds.has(edgeId) && !existingEdgeIds.has(reverseId)) {
            newElements.push({
              data: {
                id: edgeId,
                source: edge.source,
                target: edge.target,
                weight: edge.weight,
              },
            });
          }
        }

        if (newElements.length === 0) return;

        // Position new nodes in a circle around the expanded node
        const radius = 150;
        const newNodes = newElements.filter((el) => !el.data.source);
        newNodes.forEach((el, i) => {
          const angle = (2 * Math.PI * i) / newNodes.length;
          el.position = {
            x: expandPos.x + radius * Math.cos(angle),
            y: expandPos.y + radius * Math.sin(angle),
          };
        });

        const added = cy.add(newElements);

        // Highlight newly added nodes with green border
        const addedNodes = added.filter("node");
        addedNodes.addClass("newly-added");
        setTimeout(() => {
          addedNodes.removeClass("newly-added");
        }, 1500);

        // Re-run layout with positions preserved
        runLayout();
        return;
        // No cleanup — we keep the same cy instance
      }

      // --- Full-reload path: destroy + recreate Cytoscape ---

      // Clean up previous instance
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }

      // Create tooltip element
      if (!tooltipRef.current) {
        const tip = document.createElement("div");
        tip.className = "graph-tooltip";
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
              "border-width": (ele: any) => (ele.data("isCenter") ? 1.5 : 0.5),
              "border-color": (ele: any) =>
                ele.data("isCenter") ? palette.current.accent : palette.current.border,
              "background-opacity": (ele: any) =>
                ele.data("isCenter") ? 1 : 0.85,
              "transition-property":
                "opacity, border-color, border-width",
              "transition-duration": "0.2s",
            } as any,
          },
          {
            selector: "edge",
            style: {
              width: (ele: any) => {
                const w = ele.data("weight") || 0.3;
                return 0.8 + w * 3.2;
              },
              "line-color": () => palette.current.edge,
              opacity: (ele: any) => {
                const w = ele.data("weight") || 0.3;
                return 0.3 + w * 0.55;
              },
              "curve-style": "bezier",
              "transition-property": "opacity",
              "transition-duration": "0.2s",
            } as any,
          },
          {
            selector: "node:active",
            style: { "overlay-opacity": 0 },
          },
          // Dimmed class — used for neighbor highlighting
          {
            selector: ".dimmed",
            style: {
              opacity: 0.15,
            },
          },
          // Highlighted class — neighbors of selected node
          {
            selector: ".highlighted",
            style: {
              opacity: 1,
              "border-color": () => palette.current.accent,
              "border-width": 1.5,
            } as any,
          },
          // Selected node
          {
            selector: "node.selected",
            style: {
              "border-color": () => palette.current.accent,
              "border-width": 2,
              opacity: 1,
            } as any,
          },
          // Newly added nodes — green border for expansion
          {
            selector: "node.newly-added",
            style: {
              "border-color": () => palette.current.success,
              "border-width": 2,
            } as any,
          },
        ],
        layout: { name: "preset" },
        minZoom: 0.2,
        maxZoom: 3,
      });

      cyRef.current = cy;

      // --- Node tap: highlight neighbors ---
      cy.on("tap", "node", (evt) => {
        const node = evt.target;
        const nodeData = node.data("nodeData");
        if (nodeData) onNodeClick(nodeData);

        // Clear previous highlighting
        cy.elements().removeClass("dimmed highlighted selected");

        // Dim everything, then highlight neighborhood
        cy.elements().addClass("dimmed");
        const neighborhood = node.closedNeighborhood();
        neighborhood.removeClass("dimmed").addClass("highlighted");
        node.removeClass("highlighted").addClass("selected");
      });

      // --- Background tap: clear highlighting ---
      cy.on("tap", (evt) => {
        if (evt.target === cy) {
          cy.elements().removeClass("dimmed highlighted selected");
          if (onDeselect) onDeselect();
        }
      });

      cy.on("dbltap", "node", (evt) => {
        onNodeDoubleClick(evt.target.id());
      });

      // --- Hover tooltip ---
      cy.on("mouseover", "node", (evt) => {
        const node = evt.target;
        const tip = tooltipRef.current;
        if (!tip) return;

        const title = node.data("label") || "";
        const author = node.data("author") || "";
        const sim = node.data("similarity");
        const isCenter = node.data("isCenter");

        // Build tooltip with safe textContent (no innerHTML/XSS)
        tip.textContent = "";
        const titleEl = document.createElement("div");
        titleEl.style.cssText = "font-weight:600;margin-bottom:2px";
        titleEl.textContent = title;
        tip.appendChild(titleEl);
        if (author) {
          const authorEl = document.createElement("div");
          authorEl.style.color = "rgb(var(--muted))";
          authorEl.textContent = author;
          tip.appendChild(authorEl);
        }
        if (!isCenter && sim) {
          const simEl = document.createElement("div");
          simEl.style.cssText = "color:rgb(var(--link));margin-top:3px";
          simEl.textContent = `${(sim * 100).toFixed(1)}% similar`;
          tip.appendChild(simEl);
        }
        tip.style.opacity = "1";

        const pos = node.renderedPosition();
        tip.style.left = `${Math.max(8, Math.min(pos.x + 20, cy.width() - tip.offsetWidth - 8))}px`;
        tip.style.top = `${Math.max(8, pos.y - 10)}px`;

        // Only apply hover border if not in highlighted/selected state
        if (!node.hasClass("highlighted") && !node.hasClass("selected")) {
          node.style({ "border-color": palette.current.accent, "border-width": 1.5 });
        }
        containerRef.current!.style.cursor = "grab";
      });

      cy.on("mouseout", "node", (evt) => {
        const tip = tooltipRef.current;
        if (tip) tip.style.opacity = "0";

        // Only reset border if not in highlighted/selected state
        if (
          !evt.target.hasClass("highlighted") &&
          !evt.target.hasClass("selected")
        ) {
          evt.target.removeStyle("border-color border-width");
        }
        containerRef.current!.style.cursor = "default";
      });

      // --- Drag cursors ---
      cy.on("grab", "node", () => {
        containerRef.current!.style.cursor = "grabbing";
      });

      cy.on("free", "node", () => {
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
    }, [graph, onNodeClick, onNodeDoubleClick, onDeselect, runLayout]);

    // Repaint the existing canvas without losing positions, zoom, or selection.
    useEffect(() => {
      palette.current = graphPalette();
      cyRef.current?.style().update();
    }, [resolvedTheme, graph]);

    useEffect(() => () => {
      tooltipRef.current?.remove();
      tooltipRef.current = null;
    }, []);

    return <div ref={containerRef} className="w-full h-full relative" />;
  }
);

export default SimilarityGraph;
