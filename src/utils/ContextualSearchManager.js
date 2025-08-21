class ContextualSearchManager {
  static searchInContext(items, searchTerm, currentView) {
    if (!searchTerm || searchTerm.trim() === '') {
      return items;
    }
    const query = searchTerm.toLowerCase().trim();
    return items.filter(recipe => {
      const searchableFields = [
        recipe.strMeal,
        recipe.strCategory,
        recipe.strArea,
        recipe.strTags,
        recipe.strInstructions
      ].filter(Boolean);
      return searchableFields.some(field =>
        field.toLowerCase().includes(query)
      );
    });
  }
  static getSearchPlaceholder(currentView) {
    switch (currentView) {
      case 'cart':
        return 'Search items in your cart...';
      case 'favorites':
        return 'Search your favorite recipes...';
      default:
        return 'Search recipes...';
    }
  }
}
export default ContextualSearchManager;
