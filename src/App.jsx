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

function App() {
  const [recipes, setRecipes] = useState([]);
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
        result = recipes;
      } else {
        // CATEGORY-SPECIFIC SEARCH LOGIC
        // If both category and search term are present, search within the category
        if (currentCategory && searchTerm) {
          // Step 1: Get all recipes from the selected category
          const categoryRes = await fetch(`${API_BASE_URL}/filter.php?c=${currentCategory}`);
          const categoryData = await categoryRes.json();
          const categoryRecipes = categoryData.meals || [];
          
          // Step 2: Search within category recipes by name
          // Since API doesn't support category + search together, we filter client-side
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
            // Use category-only results if search fails
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
    }
    
    fetchRecipes();
  }, [currentView, currentCategory, searchTerm, favorites, cart]);

  // Sync favorites/cart to localStorage
  useEffect(() => { setLocal('favorites', favorites); }, [favorites]);
  useEffect(() => { setLocal('cart', cart); }, [cart]);

  // Pagination logic
  const paginatedRecipes = recipes.slice((currentPage-1)*RECIPES_PER_PAGE, currentPage*RECIPES_PER_PAGE);
  const totalPages = Math.ceil(recipes.length / RECIPES_PER_PAGE);

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
    // Keep search term and category when changing views
    // This allows users to maintain their search context
    if (view !== 'search' && view !== 'category') {
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
      // Category + search: stay in search view but filter by category
      setCurrentView('search');
    } else if (newCategory && !searchTerm) {
      // Category only: switch to category view
      setCurrentView('category');
    } else if (!newCategory && searchTerm) {
      // Search only: stay in search view
      setCurrentView('search');
    } else {
      // Neither: go to home view
      setCurrentView('home');
    }
    
    setCurrentPage(1);
  };

  // UPDATED: Search handler with category-specific search logic
  const handleSearch = (term) => {
    setSearchTerm(term);
    
    // Update view based on search term and category
    if (term && currentCategory) {
      // Search within category: stay in search view
      setCurrentView('search');
    } else if (term && !currentCategory) {
      // Global search: switch to search view
      setCurrentView('search');
    } else if (!term && currentCategory) {
      // No search but category selected: switch to category view
      setCurrentView('category');
    } else {
      // No search and no category: go to home view
      setCurrentView('home');
    }
    
    setCurrentPage(1);
  };

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
        />
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
        <Toaster message={toastMsg} onClose={() => setToastMsg(null)} />
        <MobileBottomBar onViewChange={handleViewChange} />
      </main>
    </div>
  );
}

export default App;