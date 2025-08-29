import React, { createContext, useContext, type ReactNode } from 'react';
import type { Services } from '@/composition-root';

// Create the context
const ServiceContext = createContext<Services | null>(null);

// Provider component props
interface ServiceProviderProps {
  services: Services;
  children: ReactNode;
}

// Provider component
export const ServiceProvider: React.FC<ServiceProviderProps> = ({ 
  services, 
  children 
}) => {
  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};

// Hook to use services
export const useServices = (): Services => {
  const services = useContext(ServiceContext);
  
  if (!services) {
    throw new Error(
      'useServices must be used within a ServiceProvider. ' +
      'Make sure to wrap your app with <ServiceProvider services={services}>'
    );
  }
  
  return services;
};

// Individual service hooks for convenience
export const useApiService = () => {
  const { apiService } = useServices();
  return apiService;
};

// Export context for testing
export { ServiceContext };