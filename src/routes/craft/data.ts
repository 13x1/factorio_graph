import data from "../../fact_recipe.json?raw";
import { recipeData } from './types.js';

export const factorioRecipes = recipeData.parse(JSON.parse(data))