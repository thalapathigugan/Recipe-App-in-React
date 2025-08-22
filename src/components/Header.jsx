import React from 'react';

function Header({ cart, onViewChange }) {
    // Calculate cart count (sum of qty for each cart item)
    const cartCount = Object.values(cart).reduce((sum, item) => sum + (item.qty || 0), 0);

    return (
        <header>
        <nav className="header-nav">
            <div className="header-logo-container">
                        <div
                            className="header-logo-link"
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            onClick={() => onViewChange('home')}
                        >
                                {/* Replace with your logo image path */}
                                <img src="/public/logo.png" alt="Recipe App Logo" className="header-logo" />
                                <h1>TYSON RECIPES</h1>
                        </div>
            </div>
            <div className="nav-view-buttons">
                <button type="button" className="view-favorites-btn" onClick={() => onViewChange('favorites')}>View Favorites</button>
                <button type="button" className="view-cart-btn" onClick={() => onViewChange('cart')}>
                    View Cart
                    <span className="cart-count-badge">
                        {cartCount > 0 ? cartCount : ''}
                    </span>
                </button>
            </div>
        </nav>
        </header>
    );
}

export default Header;
