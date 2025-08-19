
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

  // Fetch recipes based on view/search/category
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
      } else if (currentView === 'category' && currentCategory) {
        const res = await fetch(`${API_BASE_URL}/filter.php?c=${currentCategory}`);
        const data = await res.json();
        result = data.meals || [];
      } else if (currentView === 'search' && searchTerm) {
        const res = await fetch(`${API_BASE_URL}/search.php?s=${searchTerm}`);
        const data = await res.json();
        result = data.meals || [];
      } else {
        const res = await fetch(`${API_BASE_URL}/search.php?s=`);
        const data = await res.json();
        result = data.meals || [];
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
    setSearchTerm('');
    setCurrentCategory(null);
  };
  const handleCategoryChange = (cat) => {
    setCurrentCategory(cat === '__all__' ? null : cat);
    setCurrentView(cat ? 'category' : 'home');
    setCurrentPage(1);
    setSearchTerm('');
  };
  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentView(term ? 'search' : (currentCategory ? 'category' : 'home'));
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
