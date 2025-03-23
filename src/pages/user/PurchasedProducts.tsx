// src/pages/user/PurchasedProducts.tsx
import React from "react";
import { useOutletContext } from "react-router-dom";

interface Purchase {
  id: string;
  productId: string;
  title: string;
  price: number;
  purchaseDate: string;
}

interface Context {
  purchases: Purchase[];
}

const PurchasedProducts: React.FC = () => {
  const { purchases } = useOutletContext<Context>();

  return (
    <section className="section">
      <h2 className="section-title">Purchased Products</h2>
      {purchases.length > 0 ? (
        <ul className="items-list">
          {purchases.map((purchase) => (
            <li key={purchase.id} className="item">
              <span className="item-title">{purchase.title}</span>
              <span className="item-price">${purchase.price.toFixed(2)}</span>
              <span className="item-date">
                Purchased: {new Date(purchase.purchaseDate).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-items">No purchases yet.</p>
      )}
    </section>
  );
};

export default PurchasedProducts;