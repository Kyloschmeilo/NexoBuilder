import { createContext, useContext } from 'react';
import type { AppServices } from './bootstrap';

/** The running services, provided by the shell's root once `bootstrap()` finished. */
export const ServicesContext = createContext<AppServices | null>(null);

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices() must be used below the ServicesContext provider');
  return services;
}
