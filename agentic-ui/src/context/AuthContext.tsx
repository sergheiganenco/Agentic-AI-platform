import { createContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { User } from "./authTypes";

export interface AuthContextProps {
  isLoggedIn: boolean;
  setIsLoggedIn: Dispatch<SetStateAction<boolean>>;
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  logout: () => void;
  loadingUser: boolean; // Indicates if user data is being loaded
}

export const AuthContext = createContext<AuthContextProps | undefined>(undefined);
