import type { Flowchart, Node } from '../mermaid.ts/graph.js';
import { factorioRecipes } from './data.js';
import type { Recipe, Transform } from './types.js';

export function toTransform(recipe: Recipe): Transform {
    let from = recipe.ingredients.map(i => ({item: i.name, count: i.amount}))
    let to = recipe.products.map(p => ({item: p.name, count: p.amount}))
    let time = recipe.energy
    return {from, to, time}
}

let transforms: Array<Transform> = Object.keys(factorioRecipes).map(name => toTransform(factorioRecipes[name]))

export function getTransformByProduct(product: string): Transform | null {
    for (let transform of transforms) {
        if (transform.to.some(p => p.item == product)) return transform
    }
    return null
}

export function resolveItemTransforms(item: string, excluded: Array<string> = []): Flowchart {
    let diag: Flowchart = {
        direction: "BT",
        edges: [],
        nodes: []
    }

    function recurse(transform: Transform, parent: Array<Node> = []) {
        for (let output of transform.to) {
            let node = {
                id: crypto.randomUUID(),
                label: output.item + ' x' + output.count,
            }
            diag.nodes?.push(node)
            for (let out of parent) {
                diag.edges?.push({
                    to: out.id!,
                    from: node.id!,
                    label: transform.time + 's'
                })
            }
            for (let input of transform.from) {
                if (excluded.includes(input.item)) continue
                let sub = getTransformByProduct(input.item)
                if (!sub) continue
                recurse(sub, [node])
            }
        }
    }

    let transform = getTransformByProduct(item)
    if (!transform) return diag
    recurse(transform)


    return diag
}