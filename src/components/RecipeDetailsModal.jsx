
import React from 'react';
import RecipeDetails from './RecipeDetails';
import ModalOverlay from './ModalOverlay';
import useScrollLock from './useScrollLock';


const RecipeDetailsModal = ({ recipe, onClose }) => {
  useScrollLock();
  if (!recipe) return null;
  return (
    <ModalOverlay onClose={onClose}>
      <RecipeDetails recipe={recipe} onClose={onClose} />
    </ModalOverlay>
  );
};

export default RecipeDetailsModal;
