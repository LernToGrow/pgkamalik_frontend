import { createContext, useContext, useState } from 'react';

const PropertyContext = createContext(null);

export function PropertyProvider({ children }) {
  const [propertyId, setPropertyId] = useState('');
  return (
    <PropertyContext.Provider value={{ propertyId, setPropertyId }}>
      {children}
    </PropertyContext.Provider>
  );
}

export const useProperty = () => useContext(PropertyContext);
