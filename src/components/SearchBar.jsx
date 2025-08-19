import React from 'react';

function SearchBar({ searchTerm, setSearchTerm, currentCategory, setCurrentCategory }) {
  // Example categories; replace with API data later
    const categories = [
        { value: '', label: 'Select Category' },
        { value: '__all__', label: 'All' },
        { value: 'starter', label: 'Starter' },
        { value: 'breakfast', label: 'Breakfast' },
        { value: 'chicken', label: 'Chicken' },
        { value: 'goat', label: 'Goat' },
        { value: 'beef', label: 'Beef' },
        { value: 'pork', label: 'Pork' },
        { value: 'seafood', label: 'Seafood' },
        { value: 'lamb', label: 'Lamb' },
        { value: 'miscellaneous', label: 'Miscellaneous' },
        { value: 'pasta', label: 'Pasta' },
        { value: 'side', label: 'Side' },
        { value: 'vegan', label: 'Vegan' },
        { value: 'vegetarian', label: 'Vegetarian' },
        { value: 'dessert', label: 'Dessert' },
        // Add more categories dynamically
    ];

    return (
        <div className="search-and-category-container">
        <form className="search-form" onSubmit={e => e.preventDefault()}>
            <div className="search-input-wrapper">
            <input
                type="text"
                className="search-box"
                placeholder="Search your favorite recipes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
            <span className="search-icon">
                {/* SVG icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            </div>
        </form>
        <div className="categories-container">
            <select
            className="categories-select"
            value={currentCategory || ''}
            onChange={e => setCurrentCategory(e.target.value)}
            >
            {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
            </select>
        </div>
        </div>
    );
}

export default SearchBar;
