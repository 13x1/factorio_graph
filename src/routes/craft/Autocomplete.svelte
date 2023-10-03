<script lang="ts">
    export let classes = "input-sm"
    export let button_classes = "btn-outline btn-sm"
    export let items: string[] = []
    export let query = ""
    export let placeholder = "Search"
    export let count = 5
    $: suggestions = items.filter(item => item.toLowerCase().includes(query.toLowerCase()) && item !== query).slice(0, query !== "" ? count : 0)
</script>

<div>
    <div class="join join-vertical absolute">
        <input type="text" class="join-item input {classes}" bind:value={query} {placeholder}/>
        {#each suggestions as suggestion}
            <button class="join-item btn {button_classes}">{suggestion}</button>
        {/each}
    </div>
    <input tabindex="-1" aria-hidden="true" class="pointer-events-none opacity-0 input {classes}">
</div>



<style>
    :focus + .btn, .btn:focus {
        display: block !important;
    }
    .btn {
        display: none;
    }
</style>