import type { Flowchart, Node, Subgraph } from '../mermaid.ts/graph.js';
import { factorioRecipes } from './data.js';
import type { ItemRequirement } from './types.js';
import type { Recipe, Transform, TransformStack } from './types.js';
// import * as m from "mathjs"
import Fraction from "fraction.js"

function F(n: number | Fraction, m?: number): Fraction {
    return new Fraction(n, m)
}

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
        from: transform.from.map(item => ({item, usedTP: F(0), unusedTP: F(0)})),
        to: transform.to.map(item => ({item, usedTP: F(0), unusedTP: F(0)})),
        time: transform.time,
        count: 0,
    }
}

function addToTransformStack(s: TransformStack, count: number) {
    s.count += count
    for (const input of s.from) {
        // input.unusedTP = m.add(input.unusedTP, m.divide(m.multiply(input.item.count, count), s.time))
        input.unusedTP = input.unusedTP.add(F(input.item.count).mul(F(count)).div(F(s.time)))
    }
    for (const output of s.to) {
        // output.unusedTP += m.divide(m.multiply(output.item.count, count), s.time)
        output.unusedTP = output.unusedTP.add(F(output.item.count).mul(F(count)).div(F(s.time)))
    }
}

function useFromRequirement(r: ItemRequirement, count: Fraction) {
    // r.unusedTP -= count
    // r.usedTP += count
    r.unusedTP = r.unusedTP.sub(F(count))
    r.usedTP = r.usedTP.add(F(count))
}

export function optimizeCraft(product: string, inputs: Array<string>, min: number, max: number):
    Array<{count: number, efficiency: number, stacks: Array<TransformStack>}>
{
    const results = []
    for (let count = min; count <= max; count++) {
        const trans = getTransformByProduct(product)!
console.log(trans)
        // insert seed (owo)
        const stacks: Array<TransformStack> = [{
            from: [{
                item: {itemName: product, count: 1},
                usedTP: F(0),
                unusedTP: F(trans.to[0].count).div(trans.time).mul(count),
            }],
            to: [],
            time: 0,
            count: 1,
        }]
        // const seed = getTransformStack(product)!
        // console.log({product, seed})
        // addToTransformStack(seed, count)
        // seed.to.map(o => {o.usedTP = o.unusedTP; o.unusedTP = 0})
        // stacks.push(seed)

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
                    if (input.unusedTP.compare(0) > 0) {
                        // try to find producer in the stacks
                        let producer = stacks.find(s => s.to.some(o => o.item.itemName == input.item.itemName))!
                        // check if in inputs or primary resource, if yes just pretend it is a producer from thin air
                        if ((!producer && getTransformByProduct(input.item.itemName) === null) || inputs.includes(input.item.itemName)) {
                            producer = { from: [], to: [{item: {itemName: input.item.itemName, count: 1}, unusedTP: F(0), usedTP: F(0)}], time: 1, count: 0 }
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

                        // register the input throughput as used
                        useFromRequirement(produced, input.unusedTP)
                        useFromRequirement(input, input.unusedTP)

                        // mark the stack as unbalanced (because we did not cover for the inputs of our output producer)
                        balanced = false
                    }
                }
            }
        }

        // calculate efficiency
        let wasted = F(0);
        for (const stack of stacks) {
            for (const output of stack.to) {
                // if this is an input, "wasted" material just means that it wants an integer as the input
                // throughput, which isn't the case because it is an input
                if (stack.from.length === 0) {
                    output.unusedTP = F(0)
                    stack.count = output.usedTP.round(2).valueOf()
                }
                wasted = wasted.add(output.unusedTP)
            }
        }
        let used = F(0);
        for (const stack of stacks) {
            for (const input of stack.from) {
                used = used.add(input.usedTP)
            }
        }

        // const efficiency = Math.round(used / (used + wasted) * 100_00) / 100
        const efficiency = used.div(used.add(wasted)).mul(100).round(2).valueOf()

        for (const stack of stacks) {
            for (const output of stack.to) {
                output.unusedTP = output.unusedTP.round(2)
                output.usedTP = output.usedTP.round(2)
            }
            for (const input of stack.from) {
                input.unusedTP = input.unusedTP.round(2)
                input.usedTP = input.usedTP.round(2)
            }
        }

        results.push({count, efficiency, stacks})
    }
    return results.sort((a, b) => b.efficiency - a.efficiency)
}

export function renderOptimizedCraft(stacks: Array<TransformStack>) {
    const diag: Flowchart = {
        direction: "LR",
        edges: [],
        nodes: [],
        subgraphs: [],
    }

    // 0 = output recipe
    // 1 = final recipe
    const final_transform = stacks[1]

    for (const stack of stacks) {
        const subgraph: Subgraph = {
            id: crypto.randomUUID(),
            // label: stack.from.length === 0 ? `${stack.count}/s input` : `${stack.count} crafts, ${stack.time}s each`,
            label: `${stack.count} crafts, ${stack.time}s each`,
        }
        if (stack.from.length === 0) subgraph.label = `${stack.to[0].usedTP.mul(final_transform.time).div(final_transform.count)} in (${stack.to[0].usedTP.mul(final_transform.time)} i/b)`
        if (stack.to.length === 0) subgraph.label = `${stack.from[0].usedTP.mul(final_transform.time).div(final_transform.count)} out (${stack.from[0].usedTP.mul(final_transform.time)} i/b)`
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
                label: `${input.usedTP} i/s`,
                length: 2,
            })
        }
        for (const output of stack.to) {
            const node: Node = {
                id: `output-${output.item.itemName}`,
                label: output.item.itemName + ' x' + output.item.count,
                subgraph: subgraph.id,
                shape: 'parallelogram'
            }
            diag.nodes?.push(node)
            for (const inNode of inNodes) {
                diag.edges?.push({
                    from: inNode.id!,
                    to: node.id!,
                })
            }
            if (output.unusedTP.compare(0) > 0) {
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
