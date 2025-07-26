// src/types/User.ts (create this file)
export interface User {
  id: number;
  email: string;
  name?: string;
  role?: string;
  is_active?: boolean;
}
