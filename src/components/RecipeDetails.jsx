import React from 'react';

function RecipeDetails({ recipe, onClose }) {
  if (!recipe) return null;

  // Build ingredients list
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = recipe[`strIngredient${i}`];
    const measure = recipe[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push(`${measure ? measure : ''} ${ingredient}`.trim());
    }
  }

  return (
    <div className="recipe-details" style={{ display: 'block' }}>
      <button type="button" className="recipe-close-btn" onClick={onClose}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>
      </button>
      <div className="recipe-details-content">
        <h2 className="recipeName">{recipe.strMeal}</h2>
        <h3>Ingredients:</h3>
        <ul className="ingredientsList">
          {ingredients.map((item, idx) => <li key={idx}>{item}</li>)}
        </ul>
        <div>
          <h3>Instructions:</h3>
          <p className="recipeInstructions">{recipe.strInstructions}</p>
        </div>
      </div>
    </div>
  );
}

export default RecipeDetails;
