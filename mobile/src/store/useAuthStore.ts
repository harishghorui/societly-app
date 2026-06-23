import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// (Keep your existing TypeScript interfaces intact: Society, Membership, User)
export interface Society {
  id: number;
  name: string;
  address: string;
  registrationCode: string;
}

export interface Membership {
  id: number;
  role: 'admin' | 'treasurer' | 'committee' | 'wing_admin' | 'owner' | 'tenant' | 'guard';
  designation: string;
  status: 'pending' | 'active' | 'exited';
  flatNumber: string | null;
  society: Society;
}

interface User {
  id: number;
  name: string;
  phone: string;
  memberships: Membership[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  activeMembership: Membership | null;
  setAuth: (token: string, user: User) => void;
  setActiveProfile: (membership: Membership) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      token: null,
      user: null,
      activeMembership: null,

      setAuth: (token, user) => {
        set({
          token,
          user,
          activeMembership:
            user.memberships.length === 1 ? user.memberships[0] : null,
        });
      },

      setActiveProfile: membership => {
        set({ activeMembership: membership });
      },

      logout: () => {
        set({ token: null, user: null, activeMembership: null });
      },
    }),
    {
      name: 'societly-auth-storage', // Key name for device storage mapping
      storage: createJSONStorage(() => AsyncStorage), // Binds native engine
    },
  ),
);
