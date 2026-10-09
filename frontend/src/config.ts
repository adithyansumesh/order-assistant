/**
 * Application environment configuration.
 *
 * Supports VITE_API_BASE_URL for decoupled frontend/backend deployments
 * (e.g. Vercel frontend talking to Render/cloud backend), while gracefully
 * falling back to relative paths for local development and unified deployments.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}
