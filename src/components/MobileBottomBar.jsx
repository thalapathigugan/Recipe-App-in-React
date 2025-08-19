import React from 'react';

function MobileBottomBar({ onViewChange }) {
    return (
        <div className="mobile-bottom-bar">
        <button type="button" className="mobile-bottom-favorites-btn" onClick={() => onViewChange('favorites')}>
            Favorites
        </button>
        <button type="button" className="mobile-bottom-cart-btn" onClick={() => onViewChange('cart')}>
            Cart
        </button>
        </div>
    );
}

export default MobileBottomBar;
