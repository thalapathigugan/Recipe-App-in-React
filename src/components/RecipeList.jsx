import React from 'react';
import RecipeCard from './RecipeCard';


function RecipeList({ recipes, favorites, cart, onFavorite, onCartAdd, onCartRemove, onViewRecipe }) {
    if (!recipes || recipes.length === 0) {
        return <div className="center-message"><h2>No recipes found.</h2></div>;
    }

    return (
        <div className="recipe-container">
        {recipes.map(recipe => (
            <RecipeCard
            key={recipe.idMeal}
            recipe={recipe}
            isFavorite={favorites.some(r => r.idMeal === recipe.idMeal)}
            cartQuantity={cart[recipe.idMeal]?.qty || 0}
            onFavorite={() => onFavorite(recipe)}
            onCartAdd={() => onCartAdd(recipe)}
            onCartRemove={() => onCartRemove(recipe)}
            onViewRecipe={() => onViewRecipe(recipe)}
            />
        ))}
        </div>
    );
}

export default RecipeList;
