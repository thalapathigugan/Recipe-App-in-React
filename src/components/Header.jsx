import React from 'react';

function Header({ cart, onViewChange }) {
  // Calculate cart count
    const cartCount = Object.values(cart).reduce((sum, count) => sum + count, 0);

    return (
        <header>
        <nav className="header-nav">
            <div className="header-logo-container">
            <a href="/">
                {/* Replace with your logo image path */}
                <img src="/public/logo.png" alt="Recipe App Logo" className="header-logo" />
                <h1>TYSON RECIPES</h1>
            </a>
            </div>
            <div className="nav-view-buttons">
            <button type="button" className="view-favorites-btn" onClick={() => onViewChange('favorites')}>View Favorites</button>
            <button type="button" className="view-cart-btn" onClick={() => onViewChange('cart')}>
                View Cart
                <span className="cart-count-badge">{cartCount > 0 ? cartCount : ''}</span>
            </button>
            </div>
        </nav>
        </header>
    );
}

export default Header;
