<script lang="ts">
    import { renderFlowchart } from '../mermaid.ts/graph.js';
    import { getTransformByProduct, resolveItemTransforms } from './lookupCraft.js';

    let item = "automation-science-pack"
    let json = "[Nothing yet]"
    let diag: string = ""
    $: (async () => {try {
        json = JSON.stringify(getTransformByProduct(item), null, 4)
        diag = await renderFlowchart(resolveItemTransforms(item))
    } catch(e){
        json = e.message
    }})()
</script>

<div class="bg-base-200 min-h-screen p-2 flex flex-col gap-4">
    <label>
        Item:
        <input type="text" class="input input-bordered input-sm" bind:value={item}/>
    </label>
    <pre class="border-2 rounded w-[1000px]">{json}</pre>
    <div>
        {@html diag}
    </div>
</div>

