// Your existing localStorage functions
export function getLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

export function setLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Enhanced logic for recipe app with search persistence
class RecipeAppState {
  constructor() {
    this.SEARCH_KEY = 'recipe_search_term';
    this.SCROLL_KEY = 'recipe_scroll_position';
    this.PAGE_KEY = 'recipe_current_page';
    
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.restoreState());
    } else {
      this.restoreState();
    }

    // Save state before page unload
    window.addEventListener('beforeunload', () => this.saveState());
    
    // Save scroll position periodically
    let scrollTimer;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        this.saveScrollPosition();
      }, 100);
    });
  }

  // Restore all saved state
  restoreState() {
    this.restoreSearchTerm();
    this.restoreScrollPosition();
    this.restorePageState();
  }

  // Search term persistence
  restoreSearchTerm() {
    const savedSearch = getLocal(this.SEARCH_KEY, '');
    const searchInput = document.querySelector('#search-input, [name="search"], input[type="search"]');
    
    if (searchInput && savedSearch) {
      searchInput.value = savedSearch;
      // Trigger search if you have a search function
      this.triggerSearch(savedSearch);
    }
  }

  saveSearchTerm(searchTerm) {
    setLocal(this.SEARCH_KEY, searchTerm);
  }

  // Scroll position persistence
  restoreScrollPosition() {
    const savedPosition = getLocal(this.SCROLL_KEY, 0);
    if (savedPosition > 0) {
      // Use setTimeout to ensure page is fully loaded
      setTimeout(() => {
        window.scrollTo(0, savedPosition);
      }, 100);
    }
  }

  saveScrollPosition() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    setLocal(this.SCROLL_KEY, scrollPosition);
  }

  // Page state persistence (for pagination or filters)
  restorePageState() {
    const savedPage = getLocal(this.PAGE_KEY, 1);
    // Apply saved page state to your pagination component
    this.setCurrentPage(savedPage);
  }

  savePageState(pageNumber) {
    setLocal(this.PAGE_KEY, pageNumber);
  }

  // Search functionality with persistence
  setupSearchInput(searchInputSelector = '#search-input') {
    const searchInput = document.querySelector(searchInputSelector);
    if (!searchInput) return;

    // Save search term on input
    searchInput.addEventListener('input', (e) => {
      this.saveSearchTerm(e.target.value);
    });

    // Handle search on Enter key
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch(e.target.value);
      }
    });
  }

  // Pagination with persistence
  setupPagination() {
    document.addEventListener('click', (e) => {
      // Handle pagination clicks
      if (e.target.matches('.page-btn, .pagination-btn')) {
        const pageNum = parseInt(e.target.dataset.page) || 1;
        this.savePageState(pageNum);
      }
    });
  }

  // Custom search trigger function
  triggerSearch(searchTerm) {
    // Replace this with your actual search function
    if (window.performRecipeSearch && typeof window.performRecipeSearch === 'function') {
      window.performRecipeSearch(searchTerm);
    } else {
      console.log('Search term restored:', searchTerm);
      // You can dispatch a custom event instead
      document.dispatchEvent(new CustomEvent('searchRestored', { 
        detail: { searchTerm } 
      }));
    }
  }

  // Set current page (integrate with your pagination logic)
  setCurrentPage(pageNumber) {
    // Replace this with your actual pagination logic
    if (window.setRecipePage && typeof window.setRecipePage === 'function') {
      window.setRecipePage(pageNumber);
    } else {
      console.log('Page restored:', pageNumber);
      // You can dispatch a custom event instead
      document.dispatchEvent(new CustomEvent('pageRestored', { 
        detail: { pageNumber } 
      }));
    }
  }

  // Save complete state (call this when performing searches or navigation)
  saveState() {
    const searchInput = document.querySelector('#search-input, [name="search"], input[type="search"]');
    if (searchInput) {
      this.saveSearchTerm(searchInput.value);
    }
    this.saveScrollPosition();
  }

  // Clear all saved state
  clearState() {
    localStorage.removeItem(this.SEARCH_KEY);
    localStorage.removeItem(this.SCROLL_KEY);
    localStorage.removeItem(this.PAGE_KEY);
  }

  // Utility method to handle search with state saving
  handleSearch(searchTerm, pageNumber = 1) {
    this.saveSearchTerm(searchTerm);
    this.savePageState(pageNumber);
    // Reset scroll to top for new searches
    window.scrollTo(0, 0);
    setLocal(this.SCROLL_KEY, 0);
  }
}

// Initialize the recipe app state management
const recipeApp = new RecipeAppState();

// Export for use in other parts of your app
export { RecipeAppState, recipeApp };

// Usage examples:

// 1. Setup search input (call this after your search input is rendered)
// recipeApp.setupSearchInput('#your-search-input-id');

// 2. Setup pagination (call this once on page load)
// recipeApp.setupPagination();

// 3. Manual search handling
// recipeApp.handleSearch('chicken recipes', 1);

// 4. Listen for restored events in your components
/*
document.addEventListener('searchRestored', (e) => {
  const { searchTerm } = e.detail;
  // Perform your search with the restored term
  performYourSearch(searchTerm);
});

document.addEventListener('pageRestored', (e) => {
  const { pageNumber } = e.detail;
  // Set your pagination to the restored page
  setYourPagination(pageNumber);
});
*/