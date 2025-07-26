// src/context/authTypes.ts

export interface User {
  email: string;
  name?: string;
  role?: string;
  avatarUrl?: string;
}

export interface AuthContextProps {
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
  loadingUser: boolean; 
}