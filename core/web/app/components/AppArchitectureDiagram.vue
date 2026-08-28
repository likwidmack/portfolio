<template lang="pug">
figure.architecture-diagram(role="img", :aria-label="ariaLabel")
  svg(viewBox="0 0 720 420", xmlns="http://www.w3.org/2000/svg", role="presentation")
    defs
      marker#arch-arrow(
        viewBox="0 0 10 10",
        refX="8",
        refY="5",
        markerWidth="6",
        markerHeight="6",
        orient="auto-start-reverse"
      )
        path(d="M 0 0 L 10 5 L 0 10 z", fill="currentColor")
    g(v-for="group in groups", :key="group.id")
      rect.architecture-diagram__group(
        :x="group.x",
        :y="group.y",
        :width="group.width",
        :height="group.height",
        rx="14"
      )
      text.architecture-diagram__group-label(:x="group.x + 16", :y="group.y + 28") {{ group.label }}
    g(v-for="node in nodes", :key="node.id")
      rect.architecture-diagram__node(:x="node.x", :y="node.y", :width="node.width", :height="node.height", rx="10")
      text.architecture-diagram__node-label(
        :x="node.x + node.width / 2",
        :y="node.y + node.height / 2 + 5",
        text-anchor="middle"
      ) {{ node.label }}
    g.architecture-diagram__edges
      path(
        v-for="(edge, index) in edgePaths",
        :key="`${edge.from}-${edge.to}-${index}`",
        :d="edge.d",
        fill="none",
        stroke="currentColor",
        stroke-width="2",
        marker-end="url(#arch-arrow)"
      )
  figcaption(v-if="caption") {{ caption }}
</template>

<script setup lang="ts">
/** Lightweight UML-style architecture diagram (SVG) — no Mermaid dependency. */

export type ArchitectureNode = {
  height: number;
  id: string;
  label: string;
  width: number;
  x: number;
  y: number;
};

export type ArchitectureGroup = {
  height: number;
  id: string;
  label: string;
  width: number;
  x: number;
  y: number;
};

export type ArchitectureEdge = {
  from: string;
  to: string;
};

const props = withDefaults(
  defineProps<{
    ariaLabel?: string;
    caption?: string;
    edges?: ArchitectureEdge[];
    groups?: ArchitectureGroup[];
    nodes?: ArchitectureNode[];
  }>(),
  {
    ariaLabel: 'Architecture diagram',
    caption: '',
    edges: () => [],
    groups: () => [],
    nodes: () => [],
  }
);

const nodeMap = computed(() => Object.fromEntries(props.nodes.map((node) => [node.id, node])));

const edgePaths = computed(() =>
  props.edges.flatMap((edge) => {
    const from = nodeMap.value[edge.from];
    const to = nodeMap.value[edge.to];
    if (!from || !to) {
      return [];
    }
    const x1 = from.x + from.width;
    const y1 = from.y + from.height / 2;
    const x2 = to.x;
    const y2 = to.y + to.height / 2;
    const mid = (x1 + x2) / 2;
    return [{ ...edge, d: `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}` }];
  })
);
</script>

<style lang="scss" scoped>
.architecture-diagram {
  margin: 0;
  padding: 0.75rem;
  overflow: auto;
  border: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
  border-radius: var(--border-radius-md, 0.5rem);
  background: color-mix(in srgb, var(--surface-color) 72%, transparent);
  color: var(--text-color);

  svg {
    display: block;
    width: min(100%, 720px);
    height: auto;
    margin-inline: auto;
  }

  figcaption {
    margin-top: 0.75rem;
    color: var(--text-secondary-color, var(--text-color));
    font-size: var(--font-size-sm);
    font-style: italic;
  }

  &__group {
    fill: color-mix(in srgb, var(--primary-color) 8%, transparent);
    stroke: color-mix(in srgb, var(--primary-color) 28%, transparent);
    stroke-width: 1.5;
  }

  &__group-label {
    fill: var(--secondary-color, var(--primary-color));
    font-size: 14px;
    font-weight: 700;
  }

  &__node {
    fill: color-mix(in srgb, var(--surface-color) 88%, transparent);
    stroke: color-mix(in srgb, var(--border-color) 80%, transparent);
    stroke-width: 1.5;
  }

  &__node-label {
    fill: var(--text-color);
    font-size: 13px;
    font-weight: 600;
  }

  &__edges {
    color: color-mix(in srgb, var(--primary-color) 70%, var(--text-color));
  }
}
</style>
