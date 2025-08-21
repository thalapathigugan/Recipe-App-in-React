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
const MIN_HOME_RECIPES = 120; // Minimum 6 pages * 20 recipes per page

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

      // Sort alphabetically for consistency
      const finalRecipes = allRecipes.sort((a, b) => a.strMeal.localeCompare(b.strMeal));
      
      console.log(`Fetched ${finalRecipes.length} home recipes`);
      
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
  const [isSearching, setIsSearching] = useState(false);

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
      
      // Use cache if it's less than 1 hour old and has enough recipes
      if (cachedHomeRecipes && 
          cachedHomeRecipes.length >= MIN_HOME_RECIPES &&
          (Date.now() - cacheTimestamp < oneHour)) {
        setHomeRecipes(cachedHomeRecipes);
        return;
      }

      // Fetch fresh recipes
      setIsLoadingHome(true);
      try {
        const fixedRecipes = await HomePageRecipeManager.fetchFixedHomeRecipes();
        setHomeRecipes(fixedRecipes);
        
        // Cache the results
        setLocal('homeRecipes', fixedRecipes);
        setLocal('homeRecipesTimestamp', Date.now());
      } catch (error) {
        console.error('Error fetching home recipes:', error);
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
      setIsSearching(true);
      let result = [];
      
      try {
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
          result = recipes.filter(Boolean);
        } else if (currentView === 'home' && !currentCategory && !searchTerm) {
          // HOME PAGE: Use fixed cached recipes
          result = homeRecipes;
        } else if (currentCategory && !searchTerm) {
          // Category view without search
          result = await HomePageRecipeManager.fetchCategoryRecipesWithDetails(currentCategory);
        } else if (searchTerm) {
          // Search operations
          if (currentCategory) {
            // CATEGORY-SPECIFIC SEARCH - This is the key fix
            try {
              // Get all recipes in the category first
              const categoryRecipes = await HomePageRecipeManager.fetchCategoryRecipesWithDetails(currentCategory);
              
              // Then filter them by search term
              const searchLower = searchTerm.toLowerCase();
              const filteredResults = categoryRecipes.filter(recipe => 
                recipe.strMeal.toLowerCase().includes(searchLower) ||
                (recipe.strInstructions && recipe.strInstructions.toLowerCase().includes(searchLower)) ||
                (recipe.strArea && recipe.strArea.toLowerCase().includes(searchLower)) ||
                (recipe.strTags && recipe.strTags.toLowerCase().includes(searchLower))
              );
              
              // Also try global search and filter by category as backup
              try {
                const searchRes = await fetch(`${API_BASE_URL}/search.php?s=${searchTerm}`);
                const searchData = await searchRes.json();
                const globalSearchResults = (searchData.meals || []).filter(recipe => 
                  recipe.strCategory === currentCategory
                );
                
                // Merge results, avoiding duplicates
                globalSearchResults.forEach(searchRecipe => {
                  if (!filteredResults.some(recipe => recipe.idMeal === searchRecipe.idMeal)) {
                    filteredResults.push(searchRecipe);
                  }
                });
              } catch (globalSearchError) {
                console.log('Global search fallback failed:', globalSearchError);
                // Continue with just filtered results
              }
              
              result = filteredResults;
              
            } catch (error) {
              console.error('Category-specific search failed:', error);
              result = []; // Explicitly set empty array on error
            }
          } else {
            // GLOBAL SEARCH (no category selected)
            try {
              const res = await fetch(`${API_BASE_URL}/search.php?s=${searchTerm}`);
              const data = await res.json();
              result = data.meals || [];
            } catch (error) {
              console.error('Global search failed:', error);
              result = [];
            }
          }
        } else {
          // Default fallback - use home recipes
          result = homeRecipes;
        }
        
      } catch (error) {
        console.error('Error in fetchRecipes:', error);
        result = [];
      } finally {
        setIsSearching(false);
      }
      
      setRecipes(result);
      setFilteredRecipes(result); // Set both at the same time for simplicity
    }
    
    fetchRecipes();
  }, [currentView, currentCategory, searchTerm, favorites, cart, homeRecipes]);

  // Sync favorites/cart to localStorage
  useEffect(() => { setLocal('favorites', favorites); }, [favorites]);
  useEffect(() => { setLocal('cart', cart); }, [cart]);

  // Pagination logic - use filteredRecipes
  const paginatedRecipes = filteredRecipes.slice((currentPage-1)*RECIPES_PER_PAGE, currentPage*RECIPES_PER_PAGE);
  const totalPages = Math.ceil(filteredRecipes.length / RECIPES_PER_PAGE);

  // Handlers
  const handleFavorite = (recipe) => {
    setFavorites(prev => {
      const exists = prev.some(r => r.idMeal === recipe.idMeal);
      const message = exists ? 'Removed from Favorites' : 'Added to Favorites';
      
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
    
    showToast('Added to Cart');
  };

  const handleCartRemove = (recipe) => {
    setCart(prev => {
      const qty = (prev[recipe.idMeal]?.qty || 0) - 1;
      if (qty > 0) return { ...prev, [recipe.idMeal]: { recipe, qty } };
      const { [recipe.idMeal]: _, ...rest } = prev;
      return rest;
    });
    
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
    // Clear search when changing to non-contextual views
    if (view === 'home') {
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
    setCurrentPage(1);
    
    // For favorites and cart views, don't change the view - just filter in context
    if (currentView === 'favorites' || currentView === 'cart') {
      return; // Stay in the same view, filtering will happen in useEffect
    }
    
    // For other views, update view based on search term and category
    if (term && currentCategory) {
      setCurrentView('search');
    } else if (term && !currentCategory) {
      setCurrentView('search');
    } else if (!term && currentCategory) {
      setCurrentView('category');
    } else {
      setCurrentView('home');
    }
  };

  // Get search placeholder based on current context
  const searchPlaceholder = ContextualSearchManager.getSearchPlaceholder(currentView);

  // Determine what message to show
  const getDisplayMessage = () => {
    if (isLoadingHome && currentView === 'home') {
      return { type: 'loading', message: 'Loading recipes...' };
    }
    
    if (isSearching && searchTerm) {
      return { type: 'loading', message: 'Searching...' };
    }
    
    if (filteredRecipes.length === 0 && searchTerm) {
      const context = currentCategory ? ` in ${currentCategory} category` : '';
      return { 
        type: 'no-results', 
        message: `No recipes found${context} for "${searchTerm}"`,
        showClearButton: true
      };
    }
    
    if (filteredRecipes.length === 0 && !searchTerm && currentCategory) {
      return { 
        type: 'no-results', 
        message: `No recipes found in ${currentCategory} category`,
        showClearButton: false
      };
    }
    
    return null;
  };

  const displayMessage = getDisplayMessage();

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
        
        {/* Show search results info */}
        {searchTerm && !displayMessage && (
          <div className="search-results-message" style={{ 
            padding: '10px 20px', 
            fontSize: '14px', 
            color: '#666',
            borderBottom: '1px solid #eee',
            backgroundColor: 'transparent'
          }}>
            Found {filteredRecipes.length} result(s){currentCategory ? ` in ${currentCategory}` : ''} for "{searchTerm}"
          </div>
        )}

        {/* Show loading, no results, or recipe list */}
        {displayMessage ? (
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            fontSize: '16px', 
            color: displayMessage.type === 'loading' ? '#666' : '#e74c3c'
          }}>
            <div style={{ marginBottom: displayMessage.showClearButton ? '20px' : '0' }}>
              {displayMessage.message}
            </div>
            {displayMessage.showClearButton && (
              <div>
                <button 
                  onClick={() => setSearchTerm('')}
                  style={{ 
                    padding: '10px 20px', 
                    backgroundColor: '#3498db', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#2980b9'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#3498db'}
                >
                  Clear Search
                </button>
                {currentCategory && (
                  <div style={{ 
                    marginTop: '10px', 
                    fontSize: '12px', 
                    color: '#7f8c8d' 
                  }}>
                    Try a different search term or clear the search to see all {currentCategory} recipes.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <RecipeList
              recipes={paginatedRecipes}
              favorites={favorites}
              cart={cart}
              onFavorite={handleFavorite}
              onCartAdd={handleCartAdd}
              onCartRemove={handleCartRemove}
              onViewRecipe={handleViewRecipe}
            />
            
            {/* Show pagination only if there are recipes */}
            {filteredRecipes.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}

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