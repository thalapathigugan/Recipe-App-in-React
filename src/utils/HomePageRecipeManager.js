const API_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
const MIN_HOME_RECIPES = 120;
class HomePageRecipeManager {
  static FIXED_CATEGORIES = [
    'Beef', 'Chicken', 'Pork', 'Seafood', 'Vegetarian', 'Lamb',
    'Pasta', 'Dessert', 'Breakfast', 'Side', 'Starter', 'Vegan'
  ];
  static FIXED_SEARCH_TERMS = [
    'a', 'e', 'i', 'o', 'u', 'b', 'c', 'd', 'f', 'g', 'h', 'l', 'm', 'n', 'p', 'r', 's', 't'
  ];
  static async fetchFixedHomeRecipes() {
    const allRecipes = [];
    const seenIds = new Set();
    try {
      for (let i = 0; i < this.FIXED_CATEGORIES.length; i++) {
        const category = this.FIXED_CATEGORIES[i];
        const res = await fetch(`${API_BASE_URL}/filter.php?c=${category}`);
        const data = await res.json();
        const categoryRecipes = data.meals || [];
        const selectedRecipes = categoryRecipes.filter((recipe, index) => {
          if (index % 2 === 0 && !seenIds.has(recipe.idMeal)) {
            seenIds.add(recipe.idMeal);
            return true;
          }
          return false;
        }).slice(0, 12);
        const enrichedRecipes = selectedRecipes.map(recipe => ({
          ...recipe,
          strCategory: category
        }));
        allRecipes.push(...enrichedRecipes);
        if (allRecipes.length >= MIN_HOME_RECIPES) break;
      }
      if (allRecipes.length < MIN_HOME_RECIPES) {
        for (let i = 0; i < this.FIXED_SEARCH_TERMS.length && allRecipes.length < MIN_HOME_RECIPES; i++) {
          const searchTerm = this.FIXED_SEARCH_TERMS[i];
          const res = await fetch(`${API_BASE_URL}/search.php?s=${searchTerm}`);
          const data = await res.json();
          const searchRecipes = data.meals || [];
          searchRecipes.forEach(recipe => {
            if (!seenIds.has(recipe.idMeal) && allRecipes.length < MIN_HOME_RECIPES) {
              seenIds.add(recipe.idMeal);
              allRecipes.push(recipe);
            }
          });
        }
      }
      if (allRecipes.length < MIN_HOME_RECIPES) {
        const res = await fetch(`${API_BASE_URL}/search.php?s=`);
        const data = await res.json();
        const fallbackRecipes = data.meals || [];
        fallbackRecipes.forEach(recipe => {
          if (!seenIds.has(recipe.idMeal) && allRecipes.length < MIN_HOME_RECIPES) {
            seenIds.add(recipe.idMeal);
            allRecipes.push(recipe);
          }
        });
      }
      return allRecipes.sort((a, b) => a.strMeal.localeCompare(b.strMeal));
    } catch (error) {
      return [];
    }
  }
  static async fetchCategoryRecipesWithDetails(category) {
    const res = await fetch(`${API_BASE_URL}/filter.php?c=${category}`);
    const data = await res.json();
    const categoryRecipes = data.meals || [];
    return categoryRecipes.map(recipe => ({
      ...recipe,
      strCategory: category
    }));
  }
}
export default HomePageRecipeManager;
