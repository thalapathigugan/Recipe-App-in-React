import React, { useState, useEffect } from 'react';
import Pagination from './components/Pagination';
import RecipeDetails from './components/RecipeDetails';
import Toaster from './components/Toaster';
import MobileBottomBar from './components/MobileBottomBar';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import RecipeList from './components/RecipeList';

const API_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
const RECIPES_PER_PAGE = 20;
const MIN_HOME_RECIPES = 120; // Minimum 8 pages * 20 recipes per page

function getLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function setLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Context-aware search utility class
class ContextualSearchManager {
  static searchInContext(items, searchTerm, currentView) {
    if (!searchTerm || searchTerm.trim() === '') {
      return items; // Return all items if no search term
    }

    const query = searchTerm.toLowerCase().trim();

    return items.filter(recipe => {
      const searchableFields = [
        recipe.strMeal,
        recipe.strCategory,
        recipe.strArea,
        recipe.strTags,
        recipe.strInstructions
      ].filter(Boolean); // Remove undefined/null values

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

  static getResultsMessage(totalResults, filteredResults, searchTerm, currentView) {
    const context = currentView === 'cart' ? 'cart' :
                    currentView === 'favorites' ? 'favorites' : 'recipes';
    
    if (!searchTerm || searchTerm.trim() === '') {
      return `Showing all ${context} (${totalResults})`;
    }
    
    if (filteredResults === 0) {
      return `No results found in ${context} for "${searchTerm}"`;
    }
    
    return `Found ${filteredResults} result(s) in ${context} for "${searchTerm}"`;
  }
}

// Fixed home page recipe fetcher
class HomePageRecipeManager {
  // Fixed list of categories to ensure consistent results
  static FIXED_CATEGORIES = [
    'Beef', 'Chicken', 'Pork', 'Seafood', 'Vegetarian', 'Lamb',
    'Pasta', 'Dessert', 'Breakfast', 'Side', 'Starter', 'Vegan'
  ];

  // Fixed search terms to get consistent recipe sets
  static FIXED_SEARCH_TERMS = [
    'a', 'e', 'i', 'o', 'u', 'b', 'c', 'd', 'f', 'g', 'h', 'l', 'm', 'n', 'p', 'r', 's', 't'
  ];

  // Helper function to ensure recipes have category information
  static async enrichRecipeWithCategory(recipe, knownCategory = null) {
    // If recipe already has category info, return as is
    if (recipe.strCategory) {
      return recipe;
    }

    // If we know the category, add it
    if (knownCategory) {
      return { ...recipe, strCategory: knownCategory };
    }

    // Otherwise, fetch full details to get category
    try {
      const res = await fetch(`${API_BASE_URL}/lookup.php?i=${recipe.idMeal}`);
      const data = await res.json();
      if (data.meals && data.meals[0]) {
        return data.meals[0];
      }
    } catch (error) {
      console.error(`Error fetching details for recipe ${recipe.idMeal}:`, error);
    }

    // Return original recipe as fallback
    return recipe;
  }

  static async fetchFixedHomeRecipes() {
    const allRecipes = [];
    const seenIds = new Set();

    try {
      // First, fetch from fixed categories (consistent order)
      for (let i = 0; i < this.FIXED_CATEGORIES.length; i++) {
        const category = this.FIXED_CATEGORIES[i];
        try {
          const res = await fetch(`${API_BASE_URL}/filter.php?c=${category}`);
          const data = await res.json();
          const categoryRecipes = data.meals || [];
          
          // Take recipes in a consistent manner (not random)
          // Take every 2nd recipe to get variety but maintain consistency
          const selectedRecipes = categoryRecipes.filter((recipe, index) => {
            if (index % 2 === 0 && !seenIds.has(recipe.idMeal)) {
              seenIds.add(recipe.idMeal);
              return true;
            }
            return false;
          }).slice(0, 12); // Take up to 12 from each category
          
          // FORCE category information onto each recipe with validation
          const enrichedRecipes = selectedRecipes.map(recipe => {
            const recipeWithCategory = {
              ...recipe,
              strCategory: category // Explicitly set the category
            };
            
            // Debug log to verify category is set
            if (!recipeWithCategory.strCategory) {
              console.warn(`Failed to set category for recipe: ${recipe.strMeal}`);
            }
            
            return recipeWithCategory;
          });
          
          allRecipes.push(...enrichedRecipes);
          
          // Break early if we have enough recipes
          if (allRecipes.length >= MIN_HOME_RECIPES) break;
          
        } catch (error) {
          console.error(`Error fetching ${category} recipes:`, error);
        }
      }

      // If still need more recipes, fetch using fixed search terms
      if (allRecipes.length < MIN_HOME_RECIPES) {
        for (let i = 0; i < this.FIXED_SEARCH_TERMS.length && allRecipes.length < MIN_HOME_RECIPES; i++) {
          const searchTerm = this.FIXED_SEARCH_TERMS[i];
          try {
            const res = await fetch(`${API_BASE_URL}/search.php?s=${searchTerm}`);
            const data = await res.json();
            const searchRecipes = data.meals || [];
            
            // Add unique recipes (search API returns full details including category)
            searchRecipes.forEach(recipe => {
              if (!seenIds.has(recipe.idMeal) && allRecipes.length < MIN_HOME_RECIPES) {
                seenIds.add(recipe.idMeal);
                allRecipes.push(recipe);
              }
            });
          } catch (error) {
            console.error(`Error fetching search results for "${searchTerm}":`, error);
          }
        }
      }

      // If still need more, do a final fallback search
      if (allRecipes.length < MIN_HOME_RECIPES) {
        try {
          const res = await fetch(`${API_BASE_URL}/search.php?s=`);
          const data = await res.json();
          const fallbackRecipes = data.meals || [];
          
          fallbackRecipes.forEach(recipe => {
            if (!seenIds.has(recipe.idMeal) && allRecipes.length < MIN_HOME_RECIPES) {
              seenIds.add(recipe.idMeal);
              allRecipes.push(recipe);
            }
          });
        } catch (error) {
          console.error('Error fetching fallback recipes:', error);
        }
      }

      // Debug log to check final results
      const finalRecipes = allRecipes.sort((a, b) => a.strMeal.localeCompare(b.strMeal));
      
      // Verify all recipes have categories
      const recipesWithoutCategory = finalRecipes.filter(recipe => !recipe.strCategory);
      if (recipesWithoutCategory.length > 0) {
        console.warn(`${recipesWithoutCategory.length} recipes without categories:`, 
          recipesWithoutCategory.map(r => r.strMeal));
      }
      
      console.log(`Fetched ${finalRecipes.length} home recipes with categories:`, 
        finalRecipes.slice(0, 3).map(r => `${r.strMeal} (${r.strCategory})`));
      
      return finalRecipes;

    } catch (error) {
      console.error('Error in fetchFixedHomeRecipes:', error);
      // Final fallback
      try {
        const res = await fetch(`${API_BASE_URL}/search.php?s=`);
        const data = await res.json();
        const recipes = data.meals || [];
        return recipes.sort((a, b) => a.strMeal.localeCompare(b.strMeal));
      } catch (fallbackError) {
        console.error('Final fallback failed:', fallbackError);
        return [];
      }
    }
  }

  // Helper function to fetch recipes with full category details for category view
  static async fetchCategoryRecipesWithDetails(category) {
    try {
      // First get the list of recipes in the category
      const res = await fetch(`${API_BASE_URL}/filter.php?c=${category}`);
      const data = await res.json();
      const categoryRecipes = data.meals || [];

      // For category view, FORCE category info onto each recipe
      const enrichedRecipes = categoryRecipes.map(recipe => ({
        ...recipe,
        strCategory: category // Explicitly set the category
      }));

      return enrichedRecipes;

    } catch (error) {
      console.error(`Error fetching category recipes for ${category}:`, error);
      return [];
    }
  }
}

function App() {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentView, setCurrentView] = useState('home');
  const [currentCategory, setCurrentCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState(getLocal('cart', {}));
  const [favorites, setFavorites] = useState(getLocal('favorites', []));
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastKey, setToastKey] = useState(0);
  const [homeRecipes, setHomeRecipes] = useState([]);
  const [isLoadingHome, setIsLoadingHome] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to show toast messages with proper reset
  const showToast = (message) => {
    // First clear any existing toast
    setToastMsg(null);
    setToastKey(prev => prev + 1);
    
    // Then show the new toast after a brief delay
    setTimeout(() => {
      setToastMsg(message);
    }, 10);
  };

  // Helper function to hide toast
  const hideToast = () => {
    setToastMsg(null);
  };

  // Fetch categories on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/categories.php`)
      .then(res => res.json())
      .then(data => setCategories(data.categories || []));
  }, []);

  // Fetch and cache fixed home recipes on mount
  useEffect(() => {
    const fetchHomeRecipes = async () => {
      // Check if we have cached home recipes
      const cachedHomeRecipes = getLocal('homeRecipes', null);
      const cacheTimestamp = getLocal('homeRecipesTimestamp', 0);
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
      
      // Check if cached recipes have proper category information
      const hasValidCategories = cachedHomeRecipes && cachedHomeRecipes.length > 0 && 
        cachedHomeRecipes.every(recipe => recipe.strCategory && recipe.strCategory !== 'N/A');
      
      // Use cache if it's less than 1 hour old, has enough recipes, AND has valid categories
      if (cachedHomeRecipes && 
          cachedHomeRecipes.length >= MIN_HOME_RECIPES &&
          (Date.now() - cacheTimestamp < oneHour) &&
          hasValidCategories) {
        setHomeRecipes(cachedHomeRecipes);
        return;
      }

      // Fetch fresh recipes (cache is invalid or doesn't have categories)
      setIsLoadingHome(true);
      try {
        const fixedRecipes = await HomePageRecipeManager.fetchFixedHomeRecipes();
        
        // Double-check that all recipes have categories before setting
        const recipesWithCategories = fixedRecipes.map(recipe => {
          if (!recipe.strCategory || recipe.strCategory === 'N/A') {
            console.warn(`Recipe ${recipe.strMeal} missing category, attempting to fix...`);
            // Try to determine category from cached data or set a default
            return { ...recipe, strCategory: 'General' };
          }
          return recipe;
        });
        
        setHomeRecipes(recipesWithCategories);
        
        // Cache the results with categories
        setLocal('homeRecipes', recipesWithCategories);
        setLocal('homeRecipesTimestamp', Date.now());
      } catch (error) {
        console.error('Error fetching home recipes:', error);
        // Clear invalid cache and try a basic fetch
        setLocal('homeRecipes', []);
        setHomeRecipes([]);
      } finally {
        setIsLoadingHome(false);
      }
    };

    fetchHomeRecipes();
  }, []);

  // Fetch recipes based on view/search/category
  useEffect(() => {
    async function fetchRecipes() {
      setIsLoading(true);
      let result = [];
      if (currentView === 'favorites') {
        result = favorites;
      } else if (currentView === 'cart') {
        // Fetch full details for each cart item
        const ids = Object.keys(cart);
        const recipes = await Promise.all(ids.map(async id => {
          const r = cart[id].recipe;
          if (r.strInstructions) return r;
          const res = await fetch(`${API_BASE_URL}/lookup.php?i=${id}`);
          const data = await res.json();
          return data.meals ? data.meals[0] : null;
        }));
        result = recipes;
      } else {
        // CATEGORY-SPECIFIC SEARCH LOGIC
        if (currentCategory && searchTerm) {
          // Step 1: Get all recipes from the selected category
          const categoryRes = await fetch(`${API_BASE_URL}/filter.php?c=${currentCategory}`);
          const categoryData = await categoryRes.json();
          const categoryRecipes = categoryData.meals || [];
          // Step 2: Search within category recipes by name
          const searchLower = searchTerm.toLowerCase();
          result = categoryRecipes.filter(recipe =>
            recipe.strMeal.toLowerCase().includes(searchLower)
          );
          // Optional: Also fetch search results and filter by category for more comprehensive results
          try {
            const searchRes = await fetch(`${API_BASE_URL}/search.php?s=${searchTerm}`);
            const searchData = await searchRes.json();
            const searchRecipes = searchData.meals || [];
            const categoryFilteredSearch = searchRecipes.filter(recipe =>
              recipe.strCategory === currentCategory
            );
            // Merge and deduplicate results
            const mergedResults = [...result];
            categoryFilteredSearch.forEach(searchRecipe => {
              if (!mergedResults.some(recipe => recipe.idMeal === searchRecipe.idMeal)) {
                mergedResults.push(searchRecipe);
              }
            });
            result = mergedResults;
          } catch (error) {
            console.error('Error fetching search results:', error);
          }
        }
        // If only category is selected (no search term)
        else if (currentCategory && !searchTerm) {
          const res = await fetch(`${API_BASE_URL}/filter.php?c=${currentCategory}`);
          const data = await res.json();
          result = data.meals || [];
        }
        // If only search term is provided (no category filter)
        else if (searchTerm && !currentCategory) {
          const res = await fetch(`${API_BASE_URL}/search.php?s=${searchTerm}`);
          const data = await res.json();
          result = data.meals || [];
        }
        // Default: show all recipes (home view)
        else {
          const res = await fetch(`${API_BASE_URL}/search.php?s=`);
          const data = await res.json();
          result = data.meals || [];
        }
      }
      setRecipes(result.filter(Boolean));
      setIsLoading(false);
    }
    fetchRecipes();
  }, [currentView, currentCategory, searchTerm, favorites, cart]);

  // Context-aware filtering
  useEffect(() => {
    if (currentView === 'favorites' || currentView === 'cart') {
      // Apply contextual search for favorites and cart
      const filtered = ContextualSearchManager.searchInContext(recipes, searchTerm, currentView);
      setFilteredRecipes(filtered);
    } else {
      // For other views, handle search through API calls
      if (searchTerm && !currentCategory) {
        // Global search
        fetch(`${API_BASE_URL}/search.php?s=${searchTerm}`)
          .then(res => res.json())
          .then(data => {
            const result = data.meals || [];
            setRecipes(result);
            setFilteredRecipes(result);
          });
      } else if (searchTerm && currentCategory) {
        // Category-specific search (handled in main useEffect)
        setFilteredRecipes(recipes);
      } else {
        // No search term
        setFilteredRecipes(recipes);
      }
    }
  }, [searchTerm, recipes, currentView, currentCategory]);

  // Sync favorites/cart to localStorage
  useEffect(() => { setLocal('favorites', favorites); }, [favorites]);
  useEffect(() => { setLocal('cart', cart); }, [cart]);

  // Pagination logic - use filteredRecipes instead of recipes
  const paginatedRecipes = filteredRecipes.slice((currentPage-1)*RECIPES_PER_PAGE, currentPage*RECIPES_PER_PAGE);
  const totalPages = Math.ceil(filteredRecipes.length / RECIPES_PER_PAGE);

  // Handlers
  const handleFavorite = (recipe) => {
    setFavorites(prev => {
      const exists = prev.some(r => r.idMeal === recipe.idMeal);
      const message = exists ? 'Removed from Favorites' : 'Added to Favorites';
      
      // Show toast immediately
      showToast(message);
      
      if (exists) return prev.filter(r => r.idMeal !== recipe.idMeal);
      return [...prev, recipe];
    });
  };

  const handleCartAdd = (recipe) => {
    setCart(prev => {
      const qty = (prev[recipe.idMeal]?.qty || 0) + 1;
      return { ...prev, [recipe.idMeal]: { recipe, qty } };
    });
    
    // Show toast after state update
    showToast('Added to Cart');
  };

  const handleCartRemove = (recipe) => {
    setCart(prev => {
      const qty = (prev[recipe.idMeal]?.qty || 0) - 1;
      if (qty > 0) return { ...prev, [recipe.idMeal]: { recipe, qty } };
      const { [recipe.idMeal]: _, ...rest } = prev;
      return rest;
    });
    
    // Show toast after state update
    showToast('Removed from Cart');
  };

  const handleViewRecipe = async (recipe) => {
    // If recipe has instructions, it's already full details
    if (recipe.strInstructions) {
      setSelectedRecipe(recipe);
    } else {
      // Fetch full details by ID
      const res = await fetch(`${API_BASE_URL}/lookup.php?i=${recipe.idMeal}`);
      const data = await res.json();
      if (data.meals && data.meals[0]) {
        setSelectedRecipe(data.meals[0]);
      }
    }
  };

  const handleCloseRecipe = () => setSelectedRecipe(null);
  
  const handlePageChange = (page) => setCurrentPage(page);

  const handleViewChange = (view) => {
    setCurrentView(view);
    setCurrentPage(1);
    // Only clear search/category if leaving search/category views
    if (view !== 'search' && view !== 'category') {
      setSearchTerm('');
      setCurrentCategory(null);
    }
  };

  const handleCategoryChange = (cat) => {
    const newCategory = cat === '__all__' ? null : cat;
    setCurrentCategory(newCategory);
    // Update view based on category and search term
    if (newCategory && searchTerm) {
      setCurrentView('search');
    } else if (newCategory && !searchTerm) {
      setCurrentView('category');
    } else if (!newCategory && searchTerm) {
      setCurrentView('search');
    } else {
      setCurrentView('home');
    }
    setCurrentPage(1);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    // Update view based on search term and category
    if (term && currentCategory) {
      setCurrentView('search');
    } else if (term && !currentCategory) {
      setCurrentView('search');
    } else if (!term && currentCategory) {
      setCurrentView('category');
    } else {
      setCurrentView('home');
    }
    setCurrentPage(1);
  };

  // Get search placeholder based on current context
  const searchPlaceholder = ContextualSearchManager.getSearchPlaceholder(currentView);
  
  // Get results message
  const resultsMessage = ContextualSearchManager.getResultsMessage(
    recipes.length, 
    filteredRecipes.length, 
    searchTerm, 
    currentView
  );

  return (
    <div className="app-container">
      <Header cart={cart} onViewChange={handleViewChange} />
      <main>
        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={handleSearch}
          currentCategory={currentCategory}
          setCurrentCategory={handleCategoryChange}
          categories={categories}
          placeholder={searchPlaceholder}
        />
        
        {/* Show results message */}
        {searchTerm && (
          <div className="search-results-message" style={{
            padding: '10px 20px',
            fontSize: '14px',
            color: '#666',
            borderBottom: '1px solid #eee'
          }}>
            {resultsMessage}
          </div>
        )}

        {/* Loading indicator for home page */}
        {currentView === 'home' && isLoadingHome && (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            fontSize: '16px',
            color: '#666'
          }}>
            Loading recipes...
          </div>
        )}

        <RecipeList
          recipes={paginatedRecipes}
          favorites={favorites}
          cart={cart}
          onFavorite={handleFavorite}
          onCartAdd={handleCartAdd}
          onCartRemove={handleCartRemove}
          onViewRecipe={handleViewRecipe}
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
        {selectedRecipe && (
          <RecipeDetails recipe={selectedRecipe} onClose={handleCloseRecipe} />
        )}

        {/* Render Toaster only when there's a message */}
        {toastMsg && (
          <Toaster
            key={toastKey}
            message={toastMsg}
            onClose={hideToast}
          />
        )}
        
        <MobileBottomBar onViewChange={handleViewChange} />
      </main>
    </div>
  );
}

export default App;