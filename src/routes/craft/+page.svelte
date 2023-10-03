<script lang="ts">
    import { renderFlowchart } from '../mermaid.ts/graph.js';
    import {
        optimizeCraft, outputs, renderOptimizedCraft,
    } from './lookupCraft.js';
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    import AutoComplete from 'simple-svelte-autocomplete'

    let item = "military-science-pack"
    let json = "[Nothing yet]"
    let diag: string = ""
    $: (async () => {try {
        let optimal = optimizeCraft(item, ["water"], 20)[0]
        json = JSON.stringify(optimal, null, 4)
        diag = await renderFlowchart(renderOptimizedCraft(optimal.stacks))
    } catch(e){
        json = "" + e
        throw e
    }})()

</script>

<div class="bg-base-200 min-h-screen p-2 flex flex-col gap-4">
    <div class="prose">
        <h1>Factorio recipe optimizer</h1>
    </div>
    <label>
        Item:<div class="input-sm p-0 inline"></div>
        <div class="join join-vertical bg-base-300 absolute pl-1">
            <input type="text" class="join-item input input-bordered input-sm" bind:value={item}/>
<!--            <button class="btn join-item btn-outline btn-sm">Button</button>-->
<!--            <button class="btn join-item btn-outline btn-sm">Button</button>-->
        </div>
    </label>
    <AutoComplete bind:selectedItem={item} items={outputs} />
    Under the label

    <div>
        {@html diag}
    </div>
    <pre class="border-2 rounded w-[1000px]">{json}</pre>
</div>

