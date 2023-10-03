import mermaid from 'mermaid';
import {z} from 'zod';

const M = {
    mdQuote(str: string, markdown: boolean) {return markdown ? `"\`${str}\`"` : `"${str}"`},
    escape(str: string) {
    return str
        .replaceAll('#', "&num;")
        .replaceAll('&', "&amp;")
        .replaceAll('<', "&lt;")
        .replaceAll('>', "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;")
        .replaceAll('`', "&grave;")
    },
    renderObj(obj: {label?: string, markdown: boolean}) {
        return this.mdQuote(this.escape(obj.label || ""), obj.markdown)
    },
    shapes: {
        square: "[x]",
        rounded: "(x)",
        round: "([x])",
        doubleBox: "[[x]]",
        cylinder: "[(x)]",
        circle: "((x))",
        asymmetric: ">x]",
        rhombus: "{x}",
        hexagon: "{{x}}",
        parallelogram: "[/x/]",
        trapezoid: "[\\x/]",
        trapezoidAlt: "[/x\\]",
        doubleCircle: "(((x)))", // not a fan of this one but wasn't my idea
    },
    edgeStyle: {
        solid: {char: '-', pad: '-'},
        thick: {char: '=', pad: '='},
        invisible: {char: '-', pad: '-'},
        dotted: {char: '-', pad: '.'},
    },
    arrStyle: {
        arrow: {from: '<', to: '>'},
        none: {from: '', to: ''},
        cross: {from: 'x', to: 'x'},
        circle: {from: 'o', to: 'o'},
    }
} as const

export const direction = z.enum(["TB", "BT", "LR", "RL"] as const)
export type Direction = z.infer<typeof direction>
export const node = z.object({
    id: z.string().default(() => "id" + crypto.randomUUID()),
    label: z.string().optional(),
    markdown: z.boolean().default(true),
    shape: zObjectKey(M.shapes).default("square"),
    subgraph: z.string().optional(),
    style: z.string().optional()
})
export type Node = z.input<typeof node>
export const edge = z.object({
    from: z.union([z.string(), node]),
    to: z.union([z.string(), node]),
    label: z.string().optional(),
    markdown: z.boolean().default(true),
    length: z.number().int().positive().default(1),
    line: zObjectKey(M.edgeStyle).default("solid"),
    fromArr: zObjectKey(M.arrStyle).default("none"),
    toArr: zObjectKey(M.arrStyle).default("arrow"),
});
export type Edge = z.input<typeof edge>
export const subgraph = z.object({
    id: z.string().default(() => crypto.randomUUID()),
    label: z.string().optional(),
    markdown: z.boolean().default(true),
    inside: z.string().optional(),
    direction: direction.optional()
})
export type Subgraph = z.input<typeof subgraph>
export const flowchart = z.object({
    direction: direction.default("TB"),
    nodes: z.array(node).default([]),
    edges: z.array(edge).default([]),
    subgraphs: z.array(subgraph).default([])
})
export type Flowchart = z.input<typeof flowchart>
export type FlowchartParsed = z.output<typeof flowchart>


export async function renderFlowchart(_data: Flowchart) {
    const data = flowchart.parse(_data)
    let str = ""
    str += "flowchart " + data.direction + "\n"
    for (const subgraph of data.subgraphs) {
        str += `subgraph ${subgraph.id}`
        if (subgraph.label) str += ` [${M.renderObj(subgraph)}]`
        str += "\n"
        if (subgraph.direction) str += `direction ${subgraph.direction}\n`
        str += "end\n"
    }
    for (const node of data.nodes) {
        let subgraphs = 0
        let current: {inside?: string} = {inside: node.subgraph}
        const subgraphCode: string[] = []
        while (current.inside) {
            subgraphs++
            subgraphCode.push("subgraph " + current.inside + "\n")
            current = data.subgraphs.find(s=>s.id == current.inside) || {}
        }
        for (const code of subgraphCode.reverse()) {
            str += code
        }
        str += node.id
        if (node.label) str += M.shapes[node.shape].replace('x', M.renderObj(node))
        str += "\n"
        if (node.style) str += `style ${node.id} ${node.style}\n`
        for (let i = 0; i < subgraphs; i++) {
            str += "end\n"
        }
    }
    for (const edge of data.edges) {
        // don't ask me why, ask the mermaid devs (what were they smoking?)
        if (edge.fromArr !== 'none' && edge.toArr === 'none') {
            edge.toArr = edge.fromArr
            edge.fromArr = 'none'
            const tmp = edge.from
            edge.from = edge.to
            edge.to = tmp
        }
        const from = id(edge.from)
        const to = id(edge.to)
        str += from
        const arr = M.edgeStyle[edge.line].char.repeat(2 + edge.length)
        // again, what on earth is this
        const arrLen = arr.length - Number(edge.toArr !== "none" && edge.line !== "dotted")
        const padNeeded = arrLen - 2
        // whoever greenlit this syntax is not seeing the gates of heaven
        str += ` ${M.arrStyle[edge.fromArr].from}${M.edgeStyle[edge.line].char}${M.edgeStyle[edge.line].pad.repeat(padNeeded)}` +
            `${M.edgeStyle[edge.line].char}${M.arrStyle[edge.toArr].to} `
        if (edge.label) str += "|" + M.renderObj(edge) + "| "
        str += to
        str += '\n'
    }

    mermaid.initialize({
        theme: "dark",
    })
    return (await mermaid.render('mermaid', str)).svg
}

function zObjectKey<T extends object>(object: T) {
    // swap keys and values
    const obj: Record<string, unknown> = {}
    Object.keys(object).map((k) => obj[k] = k)
    return z.nativeEnum(obj as { [key in keyof T]: key extends string ? key : "" })
}

function id<T extends string | {id: string}>(t: T): string {
    if (typeof t == "string") return t
    return t.id
}
