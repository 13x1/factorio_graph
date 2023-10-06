<script lang="ts">
    import { renderFlowchart } from '../mermaid.ts/graph.js';
    import {
        optimizeCraft, outputs, renderOptimizedCraft,
    } from './lookupCraft.js';
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    import AutoComplete from 'simple-svelte-autocomplete'

    let min = 1
    let max = 10
    let selected = 1;

    let ignored: string[] = []
    let ignoredStr = "water, crude-oil"
    $: ignored = ignoredStr.split(",").map(s => s.trim()).filter(s => s.length > 0)

    let zoom = 1

    let item = "military-science-pack"
    let json = "[Nothing yet]"
    let diag: string = ""
    let best = optimizeCraft(item, ignored, min, max).slice(0, 11);
    let selCraft = optimizeCraft(item, ignored, selected, selected)[0]
    let render = (async () => {try {
        best = optimizeCraft(item, ignored, min, max).slice(0, 11)
        selCraft = optimizeCraft(item, ignored, selected, selected)[0]
        json = JSON.stringify(selCraft, null, 4)
        diag = await renderFlowchart(renderOptimizedCraft(selCraft.stacks))
    } catch(e){
        json = "" + e
    }})

</script>

<div class="bg-base-200 min-h-screen p-2 flex flex-col gap-4">
    <div class="prose">
        <h1>Factorio recipe optimizer</h1>
    </div>
    <div class="flex">
        <table class="w-72">
            <tr>
                <td>Item:</td>
                <td class="autocomplete" colspan="3">
                    <AutoComplete bind:selectedItem={item} items={outputs}/>
                </td>
            </tr>
            <tr>
                <td>Min:</td>
                <td><input class="input w-full input-sm" type="number" bind:value={min}/></td>
                <td>&nbsp;Cur.:</td>
                <td><input class="input w-full input-sm" type="number" bind:value={selected}/></td>
            </tr>
            <tr>
                <td>Max:</td>
                <td><input class="input w-full input-sm" type="number" bind:value={max}/></td>
                <td>&nbsp;Effi.:</td>
                <td><input class="input w-full input-sm !bg-base-300" disabled value="{selCraft.efficiency}%"/></td>
            </tr>
        </table>
        <div class="divider divider-horizontal"></div>
        <div class="flex flex-col h-32 flex-wrap gap-2">
            <div>Best recipes:</div>
            {#each best as pos}
                <div><a href="##" class="link" on:click={() => {selected = pos.count; render()}}>
                    {pos.count}x @ {pos.efficiency}%
                </a></div>
            {/each}
        </div>
        <div class="divider divider-horizontal"></div>
        <div class="flex flex-col h-32 flex-wrap gap-2">
            <div>Ignored/input items:</div>
            <textarea class="textarea textarea-bordered resize-x h-20 w-72" bind:value={ignoredStr}/>
        </div>
        <div class="divider divider-horizontal"></div>
        <div class="flex flex-col justify-evenly">
            <button class="btn btn-primary" on:click={render}>Calculate!</button>
            Zoom:
            <div class="join">
                {#each [1, 2] as level}
                    <button class="btn btn-{(level === zoom) ? `primary` : `active`} btn-sm join-item"
                    on:click={() => zoom = level}>{level}x</button>
                {/each}
            </div>
        </div>
    </div>

    <div class="overflow-x-scroll">
        <div style="width: {zoom*95}vw; height: auto">
            {@html diag}
        </div>
    </div>

    <details>
        <summary>Raw JSON & Error messages</summary>
        <pre class="border-2 rounded w-[1000px]">{json}</pre>
    </details>
</div>

<style>
    .autocomplete > :global(*) {
        height: 2.125rem;
    }
    /* long sigh https://github.com/philipwalton/flexbugs#flexbug-14 */
    .flex.flex-col.flex-wrap {
        flex-direction: initial;
        writing-mode: vertical-lr;
    }
    .flex.flex-col.flex-wrap > * {
        writing-mode: initial;
    }
</style>
