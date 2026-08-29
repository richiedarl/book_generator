/**
 * Authentication utilities for The Shelf
 * Handles user registration, login, JWT tokens, and access control
 * Uses SQLite database for persistence
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import {
  getAllUsers,
  getUserById,
  getUserByEmail,
  getUserByAccessToken,
  createUser,
  updateUser,
  deleteUser,
  authenticateUser,
  generateAccessToken,
  getAuthConfig,
  setTokenRequired,
  getJwtSecret,
  hashPassword,
} from '@/lib/db';

export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  accessToken?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuthConfig {
  tokenRequired: boolean;
  jwtSecret: string;
}

// Convert database user to app user format
function mapUser(dbUser: any): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    isAdmin: dbUser.is_admin === 1,
    accessToken: dbUser.access_token || undefined,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
  };
}

export function getAuthConfigApp(): AuthConfig {
  const config = getAuthConfig();
  return {
    tokenRequired: config.token_required === 1,
    jwtSecret: config.jwt_secret,
  };
}

export function setTokenRequiredApp(required: boolean) {
  setTokenRequired(required);
}

export async function createUserApp(
  email: string,
  password: string,
  name: string,
  isAdmin = false
): Promise<User> {
  const dbUser = await createUser(email, password, name, isAdmin);
  return mapUser(dbUser);
}

export function getAllUsersApp(): User[] {
  return getAllUsers().map(mapUser);
}

export function getUserByIdApp(id: string): User | undefined {
  const user = getUserById(id);
  return user ? mapUser(user) : undefined;
}

export function getUserByEmailApp(email: string): User | undefined {
  const user = getUserByEmail(email);
  return user ? mapUser(user) : undefined;
}

export function getUserByAccessTokenApp(token: string): User | undefined {
  const user = getUserByAccessToken(token);
  return user ? mapUser(user) : undefined;
}

export async function authenticateUserApp(email: string, password: string): Promise<User | null> {
  const user = await authenticateUser(email, password);
  return user ? mapUser(user) : null;
}

export function updateUserApp(id: string, updates: Partial<User>): User | null {
  const dbUpdates: any = {};
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.isAdmin !== undefined) dbUpdates.is_admin = updates.isAdmin ? 1 : 0;
  if (updates.accessToken !== undefined) dbUpdates.access_token = updates.accessToken;

  const user = updateUser(id, dbUpdates);
  return user ? mapUser(user) : null;
}

export function deleteUserApp(id: string): boolean {
  return deleteUser(id);
}

// JWT Token functions
export async function createSessionToken(user: User): Promise<string> {
  const secret = getJwtSecret();
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(secret));

  return token;
}

export async function verifySessionToken(token: string): Promise<{ sub: string; email: string; name: string; isAdmin: boolean } | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    return payload as { sub: string; email: string; name: string; isAdmin: boolean };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  return getUserByIdApp(payload.sub) || null;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

// Access token validation for book generation
export function validateAccessToken(token: string): User | null {
  return getUserByAccessTokenApp(token) || null;
}

export function isTokenRequired(): boolean {
  return getAuthConfigApp().tokenRequired;
}

// Re-export hashPassword for use in other places if needed
export { hashPassword, generateAccessToken };