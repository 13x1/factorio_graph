import { z } from 'zod';

export const ingredient = z.object({
    type: z.string(),
    name: z.string(),
    amount: z.number()
})
export type Ingredient = z.infer<typeof ingredient>

export const product = z.object({
    type: z.string(),
    name: z.string(),
    probability: z.number(),
    amount: z.number()
})
export type Product = z.infer<typeof product>

export const recipe = z.object({
    name: z.string(),
    category: z.string(),
    order: z.string(),
    group: z.object({
        name: z.string(),
        type: z.literal("item-group")
    }),
    subgroup: z.object({
        name: z.string(),
        type: z.literal("item-subgroup")
    }),
    enabled: z.boolean(),
    hidden: z.boolean(),
    hidden_from_player_crafting: z.boolean(),
    emissions_multiplier: z.number(),
    energy: z.number(),
    ingredients: z.array(ingredient),
    products: z.array(product),
})
export type Recipe = z.infer<typeof recipe>

export const recipeData = z.record(z.string(), recipe)
export type RecipeData = z.infer<typeof recipeData>

export const itemStack = z.object({
    itemName: z.string(),
    count: z.number()
})
export type ItemStack = z.infer<typeof itemStack>

export const transform = z.object({
    from: z.array(itemStack),
    to: z.array(itemStack),
    time: z.number(),
})
export type Transform = z.infer<typeof transform>

export const fraction = z.number(); z.object({
    s: z.number(),
    n: z.number(),
    d: z.number(),
})

export const itemThroughput = z.object({
    item: itemStack,
    usedTP: fraction,
    unusedTP: fraction,
})
export type ItemRequirement = z.infer<typeof itemThroughput>

export const transformStack = z.object({
    from: z.array(itemThroughput),
    to: z.array(itemThroughput),
    time: z.number(),
    count: z.number(),
})
export type TransformStack = z.infer<typeof transformStack>

export const optimalCrafts = z.object({
    count: z.number(),
    efficiency: z.number(),
    stacks: z.array(transformStack),
})
export type OptimalCraft = z.infer<typeof optimalCrafts>
