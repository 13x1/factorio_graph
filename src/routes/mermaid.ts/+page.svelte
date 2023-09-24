<script lang="ts">
    import { onMount } from 'svelte';
    import { type Flowchart, renderFlowchart } from './graph.js';
    let svg = "Rendering..."
    onMount(async () => {
        let chart: Flowchart = {
            direction: "TB",
            nodes: [
                {
                    id: "t1",
                    label: "Test *1*",
                    subgraph: "outer"
                },
                {
                    id: "t2",
                    label: "Test 2\n(\"without\" *Markdown*)",
                    markdown: false,
                    shape: 'round',
                    subgraph: "inner",
                    style: "fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5"
                },
            ],
            edges: [
                {
                    from: "t1",
                    to: "t2",
                    label: "Test 1 -> 2"
                }
            ],
            subgraphs: [
                {
                    id: "outer",
                    label: "Outer",
                    direction: "LR"
                },
                {
                    id: "inner",
                    label: "Inner",
                    inside: "outer"
                }
            ]
        }

        svg = await renderFlowchart(chart);

        return null
    })
</script>

<div>
    {@html svg}
</div>