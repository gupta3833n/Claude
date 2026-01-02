import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Company, UserRole, Permission } from '@/types';
import { db } from '@/lib/db/database';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  hasPermission: (resource: string, action: 'create' | 'read' | 'update' | 'delete') => boolean;
  isOwner: boolean;
  canViewProfits: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Simple hash function for PIN using Web Crypto API
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from local storage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUserId = localStorage.getItem('currentUserId');
        const savedCompanyId = localStorage.getItem('currentCompanyId');

        if (savedUserId && savedCompanyId) {
          const [loadedUser, loadedCompany] = await Promise.all([
            db.users.get(savedUserId),
            db.companies.get(savedCompanyId)
          ]);

          if (loadedUser && loadedCompany && loadedUser.isActive) {
            setUser(loadedUser as User);
            setCompany(loadedCompany as Company);
          } else {
            // Clear invalid session
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('currentCompanyId');
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      // In a real app, this would verify against a hashed password
      // For demo, we'll just check if user exists
      const users = await db.users
        .where('email')
        .equals(email.toLowerCase())
        .toArray();

      const foundUser = users.find(u => u.isActive && !u._deletedAt);

      if (!foundUser) {
        return false;
      }

      // Load company
      const foundCompany = await db.companies.get(foundUser.companyId);
      if (!foundCompany) {
        return false;
      }

      // Set session
      setUser(foundUser as User);
      setCompany(foundCompany as Company);
      localStorage.setItem('currentUserId', foundUser.id);
      localStorage.setItem('currentCompanyId', foundUser.companyId);

      // Log login
      await db.auditLogs.add({
        id: crypto.randomUUID(),
        companyId: foundUser.companyId,
        userId: foundUser.id,
        userName: foundUser.name,
        action: 'LOGIN',
        resource: 'session',
        resourceId: foundUser.id,
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    if (user && company) {
      // Log logout
      await db.auditLogs.add({
        id: crypto.randomUUID(),
        companyId: company.id,
        userId: user.id,
        userName: user.name,
        action: 'LOGOUT',
        resource: 'session',
        resourceId: user.id,
        timestamp: new Date()
      });
    }

    setUser(null);
    setCompany(null);
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentCompanyId');
  }, [user, company]);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!user || !user.pin) return false;
    const hashedPin = await hashPin(pin);
    return hashedPin === user.pin;
  }, [user]);

  const hasPermission = useCallback((resource: string, action: 'create' | 'read' | 'update' | 'delete'): boolean => {
    if (!user) return false;

    // Owner has all permissions
    if (user.role === UserRole.OWNER) return true;

    // Check specific permissions
    const permission = user.permissions?.find(p => p.resource === resource);
    if (!permission) return false;

    return permission.actions.includes(action);
  }, [user]);

  const isOwner = user?.role === UserRole.OWNER;
  const canViewProfits = isOwner || user?.role === UserRole.MANAGER;

  const value: AuthContextType = {
    user,
    company,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    verifyPin,
    hasPermission,
    isOwner,
    canViewProfits
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Default permissions by role
export const defaultPermissions: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: [
    { resource: '*', actions: ['create', 'read', 'update', 'delete'] }
  ],
  [UserRole.MANAGER]: [
    { resource: 'bookings', actions: ['create', 'read', 'update'] },
    { resource: 'invoices', actions: ['create', 'read', 'update'] },
    { resource: 'clients', actions: ['create', 'read', 'update'] },
    { resource: 'payments', actions: ['create', 'read', 'update'] },
    { resource: 'reports', actions: ['read'] },
    { resource: 'profits', actions: ['read'] }
  ],
  [UserRole.ACCOUNTANT]: [
    { resource: 'bookings', actions: ['create', 'read', 'update'] },
    { resource: 'invoices', actions: ['create', 'read', 'update'] },
    { resource: 'clients', actions: ['create', 'read'] },
    { resource: 'payments', actions: ['create', 'read', 'update'] },
    { resource: 'reports', actions: ['read'] }
  ],
  [UserRole.STAFF]: [
    { resource: 'bookings', actions: ['create', 'read'] },
    { resource: 'clients', actions: ['create', 'read'] }
  ],
  [UserRole.VIEWER]: [
    { resource: 'bookings', actions: ['read'] },
    { resource: 'invoices', actions: ['read'] },
    { resource: 'clients', actions: ['read'] },
    { resource: 'reports', actions: ['read'] }
  ]
};
