// src/pages/user/CartItems.tsx
import React from "react";
import { useOutletContext } from "react-router-dom";

interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
}

interface Context {
  cartItems: CartItem[];
}

const CartItems: React.FC = () => {
  const { cartItems } = useOutletContext<Context>();

  return (
    <section className="section">
      <h2 className="section-title">Cart Items</h2>
      {cartItems.length > 0 ? (
        <ul className="items-list">
          {cartItems.map((item) => (
            <li key={item.id} className="item">
              <span className="item-title">{item.title}</span>
              <span className="item-price">${item.price.toFixed(2)}</span>
              <span className="item-quantity">Qty: {item.quantity}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-items">Your cart is empty.</p>
      )}
    </section>
  );
};

export default CartItems;