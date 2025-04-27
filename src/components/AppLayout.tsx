import React from 'react';
import ShoppingAssistant from './ShoppingAssistant';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <>
      {children}
      <ShoppingAssistant />
    </>
  );
};

export default AppLayout; 