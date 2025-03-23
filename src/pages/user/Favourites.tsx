// src/pages/user/Favourites.tsx
import React from "react";
import { useOutletContext } from "react-router-dom";

interface Favorite {
  id: string;
  title: string;
}

interface Context {
  favorites: Favorite[];
}

const UserFavorites: React.FC = () => {
  const { favorites } = useOutletContext<Context>();

  return (
    <section className="section">
      <h2 className="section-title">Favorite Products</h2>
      {favorites.length > 0 ? (
        <ul className="items-list">
          {favorites.map((favorite) => (
            <li key={favorite.id} className="item">
              <span className="item-title">{favorite.title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-items">No favorites added.</p>
      )}
    </section>
  );
};

export default UserFavorites;