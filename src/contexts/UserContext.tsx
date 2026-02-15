
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { UserContext, Location, ModuleKey } from '@/types/auth';

interface UserContextProviderType {
  // Current location
  currentLocation: Location | null;
  availableLocations: Location[];
  
  // User context from get_user_context() - THE CENTRAL SOURCE
  context: UserContext | null;
  
  // Loading states
  isLoading: boolean;
  isContextLoading: boolean;
  
  // Actions
  switchLocation: (locationId: string) => Promise<void>;
  refreshContext: () => Promise<void>;
  
  // Permission helpers (read from context, no new queries)
  hasPermission: (permission: string) => boolean;
  hasModule: (module: ModuleKey) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const UserContextContext = createContext<UserContextProviderType | undefined>(undefined);

// Storage key for last selected location
const LOCATION_STORAGE_KEY = 'nesto-current-location';

export function UserContextProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [context, setContext] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isContextLoading, setIsContextLoading] = useState(false);

  // Fetch available locations for user
  const fetchLocations = useCallback(async (userId: string) => {
    // Get locations where user has a role
    const { data: roles, error: rolesError } = await supabase
      .from('user_location_roles')
      .select('location_id')
      .eq('user_id', userId);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return [];
    }

    if (!roles || roles.length === 0) {
      return [];
    }

    const locationIds = roles.map(r => r.location_id);
    
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .in('id', locationIds)
      .eq('is_active', true);

    if (locationsError) {
      console.error('Error fetching locations:', locationsError);
      return [];
    }

    return (locations || []) as Location[];
  }, []);

  // Fetch user context for a location using get_user_context()
  const fetchContext = useCallback(async (userId: string, locationId: string) => {
    setIsContextLoading(true);
    
    const { data, error } = await supabase
      .rpc('get_user_context', {
        _user_id: userId,
        _location_id: locationId,
      });

    if (error) {
      console.error('Error fetching user context:', error);
      setIsContextLoading(false);
      return null;
    }

    setIsContextLoading(false);
    return data as unknown as UserContext;
  }, []);

  // Switch to a different location
  const switchLocation = useCallback(async (locationId: string) => {
    if (!user) return;
    
    const location = availableLocations.find(l => l.id === locationId);
    if (!location) {
      console.error('Location not found:', locationId);
      return;
    }

    setCurrentLocation(location);
    localStorage.setItem(LOCATION_STORAGE_KEY, locationId);
    
    const newContext = await fetchContext(user.id, locationId);
    setContext(newContext);
  }, [user, availableLocations, fetchContext]);

  // Refresh current context
  const refreshContext = useCallback(async () => {
    if (!user || !currentLocation) return;
    
    const newContext = await fetchContext(user.id, currentLocation.id);
    setContext(newContext);
  }, [user, currentLocation, fetchContext]);

  // Permission check (reads from context, no query)
  const hasPermission = useCallback((permission: string): boolean => {
    if (!context) return false;
    if (context.is_platform_admin) return true;
    return context.permissions.includes(permission);
  }, [context]);

  // Module entitlement check (reads from context, no query)
  const hasModule = useCallback((module: ModuleKey): boolean => {
    if (!context) return false;
    if (context.is_platform_admin) return true;
    
    const entitlement = context.entitlements.find(e => e.module === module);
    return entitlement?.enabled ?? false;
  }, [context]);

  // Check if user has any of the given permissions
  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!context) return false;
    if (context.is_platform_admin) return true;
    return permissions.some(p => context.permissions.includes(p));
  }, [context]);

  // Check if user has all of the given permissions
  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (!context) return false;
    if (context.is_platform_admin) return true;
    return permissions.every(p => context.permissions.includes(p));
  }, [context]);

  // Initialize on auth change
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setCurrentLocation(null);
      setAvailableLocations([]);
      setContext(null);
      setIsLoading(false);
      return;
    }

    const initialize = async () => {
      setIsLoading(true);
      
      // Fetch available locations
      const locations = await fetchLocations(user.id);
      setAvailableLocations(locations);

      if (locations.length === 0) {
        setIsLoading(false);
        return;
      }

      // Try to restore last selected location
      const savedLocationId = localStorage.getItem(LOCATION_STORAGE_KEY);
      let selectedLocation = locations.find(l => l.id === savedLocationId);
      
      // Fall back to first location
      if (!selectedLocation) {
        selectedLocation = locations[0];
      }

      setCurrentLocation(selectedLocation);
      localStorage.setItem(LOCATION_STORAGE_KEY, selectedLocation.id);

      // Fetch context for selected location
      const userContext = await fetchContext(user.id, selectedLocation.id);
      setContext(userContext);

      setIsLoading(false);
    };

    initialize();
  }, [isAuthenticated, user, fetchLocations, fetchContext]);

  const value: UserContextProviderType = {
    currentLocation,
    availableLocations,
    context,
    isLoading,
    isContextLoading,
    switchLocation,
    refreshContext,
    hasPermission,
    hasModule,
    hasAnyPermission,
    hasAllPermissions,
  };

  return (
    <UserContextContext.Provider value={value}>
      {children}
    </UserContextContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContextContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserContextProvider');
  }
  return context;
}
