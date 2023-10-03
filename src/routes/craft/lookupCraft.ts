import type { Flowchart, Node, Subgraph } from '../mermaid.ts/graph.js';
import { factorioRecipes } from './data.js';
import type { ItemRequirement } from './types.js';
import type { Recipe, Transform, TransformStack } from './types.js';
import * as m from "mathjs"

export function toTransform(recipe: Recipe): Transform {
    const from = recipe.ingredients.map(i => ({itemName: i.name, count: i.amount}))
    const to = recipe.products.map(p => ({itemName: p.name, count: p.amount}))
    const time = recipe.energy
    return {from, to, time}
}

export const transforms: Array<Transform> = Object.keys(factorioRecipes).map(name => toTransform(factorioRecipes[name]))
export const inputs = transforms.map(t => t.from).flat().map(i => i.itemName).filter((v, i, a) => a.indexOf(v) === i)
export const outputs = transforms.map(t => t.to).flat().map(i => i.itemName).filter((v, i, a) => a.indexOf(v) === i)

export function getTransformByProduct(product: string): Transform | null {

    // prioritize recipes with the same name as the product (eg empty-barrel instead of empty-[xyz]-barrel,
    // which empties an existing barrel and doesn't actually craft one)
    if (factorioRecipes[product]) return toTransform(factorioRecipes[product]);
    for (const transform of transforms) {
        if (transform.to.some(p => p.itemName == product)) return transform
    }
    return null
}

// export function resolveItemTransforms(item: string, excluded: Array<string> = []): Flowchart {
//     const diag: Flowchart = {
//         direction: "BT",
//         edges: [],
//         nodes: [],
//     }
//
//     function recurse(transform: Transform, parent: Array<Node> = []) {
//         for (const output of transform.to) {
//             const node = {
//                 id: crypto.randomUUID(),
//                 label: output.itemName + ' x' + output.count,
//             }
//             diag.nodes?.push(node)
//             for (const out of parent) {
//                 diag.edges?.push({
//                     to: out.id!,
//                     from: node.id!,
//                     label: transform.time + 's'
//                 })
//             }
//             for (const input of transform.from) {
//                 if (excluded.includes(input.itemName)) continue
//                 const sub = getTransformByProduct(input.itemName)
//                 if (!sub) continue
//                 recurse(sub, [node])
//             }
//         }
//     }
//
//     const transform = getTransformByProduct(item)
//     if (!transform) {
//         diag.nodes = [{label: "Item not found!"}]
//         return diag
//     }
//     recurse(transform)
//
//     return diag
// }

function getTransformStack(product: string): TransformStack | null {
    const transform = getTransformByProduct(product)
    if (!transform) return null
    return {
        from: transform.from.map(item => ({item, usedTP: 0, unusedTP: 0})),
        to: transform.to.map(item => ({item, usedTP: 0, unusedTP: 0})),
        time: transform.time,
        count: 0,
    }
}

function addToTransformStack(s: TransformStack, count: number) {
    s.count += count
    for (const input of s.from) {
        input.unusedTP += m.divide(m.multiply(input.item.count, count), s.time)
    }
    for (const output of s.to) {
        output.unusedTP += m.divide(m.multiply(output.item.count, count), s.time)
    }
}

function useFromRequirement(r: ItemRequirement, count: number) {
    r.unusedTP -= count
    r.usedTP += count
}

export function optimizeCraft(product: string, inputs: Array<string>, maxProduct = 100):
    Array<{count: number, efficiency: number, stacks: Array<TransformStack>}>
{
    const results = []
    for (let count = maxProduct; count <= maxProduct; count++) {
        // insert seed (owo)
        const stacks: Array<TransformStack> = []; [{
            from: [{
                item: {itemName: product, count: 1},
                usedTP: 0,
                unusedTP: count,
            }],
            to: [],
            time: 0,
            count: 0,
        }]
        const seed = getTransformStack(product)!
        console.log({product, seed})
        addToTransformStack(seed, count)
        seed.to.map(o => {o.usedTP = o.unusedTP; o.unusedTP = 0})
        stacks.push(seed)

        // basic algo: keep track of all throughput, and try to balance out unused output and input throughput
        // if not enough resources, add a new stack to produce more, and balance out again until its enough for everything

        // balance out
        let balanced = false;
        // just in case lol
        let loopProtection = 0;
        while (!balanced && loopProtection++ < 100) {
            // assume balanced
            balanced = true;
            for (const stack of stacks) {
                for (const input of stack.from) {
                    // if we have not already covered all input throughput:
                    if (input.unusedTP > 0) {
                        // try to find producer in the stacks
                        let producer = stacks.find(s => s.to.some(o => o.item.itemName == input.item.itemName))!
                        // check if in inputs or primary resource, if yes just pretend it is a producer from thin air
                        if ((!producer && getTransformByProduct(input.item.itemName) === null) || inputs.includes(input.item.itemName)) {
                            producer = { from: [], to: [{item: {itemName: input.item.itemName, count: 1}, unusedTP: 0, usedTP: 0}], time: 1, count: 0 }
                            stacks.push(producer)
                        // if not present yet and not in inputs, add it to the stacks
                        } else if (!producer) {
                            producer = getTransformStack(input.item.itemName)!
                            stacks.push(producer)
                        }
                        // find the output that produces the input
                        const produced = producer.to.find(o => o.item.itemName == input.item.itemName)!

                        const before = [produced.unusedTP, input.unusedTP]
                        
                        // add more transforms to the producer until it can cover the input throughput
                        while (produced.unusedTP < input.unusedTP) { addToTransformStack(producer, 1) } 

                        console.log("producing", stack.to[0]?.item.itemName, "from", input.item.itemName)
                        console.log("before", before)
                        console.log("after", [produced.unusedTP, input.unusedTP])
                        
                        // register the input throughput as used
                        useFromRequirement(produced, input.unusedTP)
                        useFromRequirement(input, input.unusedTP)

                        // mark the stack as unbalanced (because we did not cover for the inputs of our output producer)
                        balanced = false
                    }
                }
            }
        }

        const round = (n: number) => Math.round(n * 100) / 100

        // calculate efficiency
        let wasted = 0;
        for (const stack of stacks) {
            for (const output of stack.to) {
                // if this is an input, "wasted" material just means that it wants an integer as the input
                // throughput, which isn't the case because it is an input
                if (stack.from.length === 0) {
                    output.unusedTP = 0
                    stack.count = round(output.usedTP)
                }
                wasted += output.unusedTP
            }
        }
        let used = 0;
        for (const stack of stacks) {
            for (const input of stack.from) {
                used += input.usedTP
            }
        }
        const efficiency = Math.round(used / (used + wasted) * 100_00) / 100

        for (const stack of stacks) {
            for (const output of stack.to) {
                output.unusedTP = round(output.unusedTP)
                output.usedTP = round(output.usedTP)
            }
            for (const input of stack.from) {
                input.unusedTP = round(input.unusedTP)
                input.usedTP = round(input.usedTP)
            }
        }

        results.push({count, efficiency, stacks})
    }
    return results.sort((a, b) => b.efficiency - a.efficiency)
}

export function renderOptimizedCraft(stacks: Array<TransformStack>) {
    const diag: Flowchart = {
        direction: "TB",
        edges: [],
        nodes: [],
        subgraphs: [],
    }


    
    for (const stack of stacks) {
        const subgraph: Subgraph = {
            id: crypto.randomUUID(),
            label: stack.from.length === 0 ? `${stack.count}/s input` : `${stack.count} crafts, ${stack.time}s each`,
        }
        diag.subgraphs?.push(subgraph)
        const inNodes = []
        for (const input of stack.from) {
            const node: Node = {
                id: crypto.randomUUID(),
                label: input.item.itemName + ' x' + input.item.count,
                subgraph: subgraph.id,
            }
            diag.nodes?.push(node)
            inNodes.push(node)
            diag.edges?.push({
                to: node,
                from: `output-${input.item.itemName}`,
                label: `${input.usedTP}/s`,
                length: 2
            })
        }
        for (const output of stack.to) {
            const node: Node = {
                id: `output-${output.item.itemName}`,
                label: output.item.itemName + ' x' + output.item.count,
                subgraph: subgraph.id,
            }
            diag.nodes?.push(node)
            for (const inNode of inNodes) {
                diag.edges?.push({
                    from: inNode.id!,
                    to: node.id!,
                })
            }
            if (output.unusedTP > 0) {
                const wasteNode: Node = {
                    id: crypto.randomUUID(),
                    label: "Waste",
                    shape: "round",
                    subgraph: subgraph.id,
                }
                diag.nodes?.push(wasteNode)
                diag.edges?.push({
                    from: node,
                    to: wasteNode,
                    line: 'dotted',
                    label: `${output.unusedTP}/s`
                })
            }
        }
    }
    
    return diag
}