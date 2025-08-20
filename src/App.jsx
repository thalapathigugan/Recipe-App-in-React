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

function App() {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]); // New state for filtered results
  const [categories, setCategories] = useState([]);
  const [currentView, setCurrentView] = useState('home');
  const [currentCategory, setCurrentCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState(getLocal('cart', {}));
  const [favorites, setFavorites] = useState(getLocal('favorites', []));
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Fetch categories on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/categories.php`)
      .then(res => res.json())
      .then(data => setCategories(data.categories || []));
  }, []);

  // Fetch recipes based on view/search/category with category-specific search logic
  useEffect(() => {
    async function fetchRecipes() {
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
        result = recipes.filter(Boolean);
      } else {
        // For home/search/category views, only fetch from API if no search term
        // or if we're not in favorites/cart context
        if (currentCategory && !searchTerm) {
          const res = await fetch(`${API_BASE_URL}/filter.php?c=${currentCategory}`);
          const data = await res.json();
          result = data.meals || [];
        } else if (currentCategory && searchTerm) {
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
            
            // Filter search results to only include recipes from the selected category
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
        } else if (searchTerm && !currentCategory) {
          const res = await fetch(`${API_BASE_URL}/search.php?s=${searchTerm}`);
          const data = await res.json();
          result = data.meals || [];
        } else {
          const res = await fetch(`${API_BASE_URL}/search.php?s=`);
          const data = await res.json();
          result = data.meals || [];
        }
      }
      
      setRecipes(result);
    }
    
    fetchRecipes();
  }, [currentView, currentCategory, favorites, cart]); // Removed searchTerm from dependencies

  // New useEffect for context-aware filtering
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
      setToastMsg(exists ? 'Removed from Favorites' : 'Added to Favorites');
      if (exists) return prev.filter(r => r.idMeal !== recipe.idMeal);
      return [...prev, recipe];
    });
  };

  const handleCartAdd = (recipe) => {
    setCart(prev => {
      const qty = (prev[recipe.idMeal]?.qty || 0) + 1;
      return { ...prev, [recipe.idMeal]: { recipe, qty } };
    });
    setToastMsg('Added to Cart');
  };

  const handleCartRemove = (recipe) => {
    setCart(prev => {
      const qty = (prev[recipe.idMeal]?.qty || 0) - 1;
      if (qty > 0) return { ...prev, [recipe.idMeal]: { recipe, qty } };
      const { [recipe.idMeal]: _, ...rest } = prev;
      return rest;
    });
    setToastMsg('Removed from Cart');
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

  // UPDATED: Category change handler with category-specific search logic
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

  // UPDATED: Search handler with context-aware logic
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
          placeholder={searchPlaceholder} // Pass dynamic placeholder
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
        
        <RecipeList
          recipes={paginatedRecipes} // Using filtered and paginated recipes
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
        <Toaster message={toastMsg} onClose={() => setToastMsg(null)} />
        <MobileBottomBar onViewChange={handleViewChange} />
      </main>
    </div>
  );
}

export default App;