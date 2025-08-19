import React from 'react';


function RecipeCard({ recipe, isFavorite, cartQuantity, onFavorite, onCartAdd, onCartRemove, onViewRecipe }) {
    return (
        <div className="recipe" data-recipe-id={recipe.idMeal}>
            <img src={recipe.strMealThumb} alt={recipe.strMeal} loading="lazy" />
            <h3>{recipe.strMeal}</h3>
            <p><span>{recipe.strArea || 'Various'}</span> Dish</p>
            <p>Category: <span>{recipe.strCategory || 'N/A'}</span></p>
            <div className="recipe-buttons">
                <button className="view-recipe-btn" onClick={onViewRecipe}>View Recipe</button>
            </div>
            <div className="favorite-cart-controls">
                <button className="favorite-btn" title="Toggle Favorite" onClick={onFavorite}>
                    {isFavorite ? (
                        <svg className='heart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#ff6b6b"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    ) : (
                        <svg className='heart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ff6b6b" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 .81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    )}
                </button>
                <div className="cart-counter">
                    <button className="cart-btn minus" onClick={onCartRemove} disabled={cartQuantity === 0}>-</button>
                    <span className="cart-count">{cartQuantity}</span>
                    <button className="cart-btn plus" onClick={onCartAdd}>+</button>
                </div>
            </div>
        </div>
    );
}

export default RecipeCard;
