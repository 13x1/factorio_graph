import { z } from 'zod';

export let ingredient = z.object({
    type: z.string(),
    name: z.string(),
    amount: z.number()
})
export type Ingredient = z.infer<typeof ingredient>

export let product = z.object({
    type: z.string(),
    name: z.string(),
    probability: z.number(),
    amount: z.number()
})
export type Product = z.infer<typeof product>

export let recipe = z.object({
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

export let recipeData = z.record(z.string(), recipe)
export type RecipeData = z.infer<typeof recipeData>

export let itemStack = z.object({
    item: z.string(),
    count: z.number()
})
export type ItemStack = z.infer<typeof itemStack>

export let transform = z.object({
    from: z.array(itemStack),
    to: z.array(itemStack),
    time: z.number(),
})
export type Transform = z.infer<typeof transform>
