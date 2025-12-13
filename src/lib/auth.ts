/**
 * NextAuth Configuration
 * 
 * Handles authentication using NextAuth v5 with credentials provider.
 * Supports role-based access control (admin/user) with JWT strategy.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/db/connect";
import User from "@/lib/db/models/user";
import type { UserRole } from "@/lib/db/models/user";

// ============================================================================
// Type Declarations
// ============================================================================

/**
 * Extend NextAuth Session interface to include user role
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: UserRole;
    };
  }

  interface User {
    role: UserRole;
  }
}

/**
 * Extend JWT interface to include user ID and role
 */
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

// ============================================================================
// NextAuth Configuration
// ============================================================================

/**
 * NextAuth instance with credentials provider
 * 
 * Exports:
 * - handlers: API route handlers for authentication
 * - signIn: Function to sign in users
 * - signOut: Function to sign out users
 * - auth: Function to get current session
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  // ============================================================================
  // Authentication Providers
  // ============================================================================
  
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      
      /**
       * Authorize function - validates user credentials
       * 
       * @param credentials - User email and password
       * @returns User object with id, name, email, and role
       * @throws Error if credentials are invalid or user not found
       */
      async authorize(credentials) {
        // Validate input
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Connect to database
        await connectToDatabase();

        // Find user by email (include password field for verification)
        const user = await User.findOne({
          email: credentials.email,
        }).select("+password");

        // Check if user exists
        if (!user) {
          throw new Error("Invalid credentials");
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(
          credentials.password as string
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        // Return user data for session
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  // ============================================================================
  // Session Configuration
  // ============================================================================
  
  session: {
    strategy: "jwt", // Use JWT for session management (stateless)
  },

  // ============================================================================
  // Custom Pages
  // ============================================================================
  
  pages: {
    signIn: "/login", // Custom login page route
  },

  // ============================================================================
  // Callbacks
  // ============================================================================
  
  callbacks: {
    /**
     * JWT callback - called when JWT is created or updated
     * Adds user ID and role to the token
     */
    async jwt({ token, user }) {
      // On initial sign in, add user data to token
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },

    /**
     * Session callback - called whenever a session is checked
     * Adds user ID and role from token to session
     */
    async session({ session, token }) {
      // Add user ID and role from token to session
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
