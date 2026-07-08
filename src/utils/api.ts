/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Song, Artist, Album, Playlist, AuthResponse } from "../types";

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem("tamil_music_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

export const api = {
  // Authentication
  async register(data: { email: string; name: string; password: string }): Promise<AuthResponse> {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Registration failed");
    localStorage.setItem("tamil_music_token", body.token);
    return body;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Login failed");
    localStorage.setItem("tamil_music_token", body.token);
    return body;
  },

  async getMe(): Promise<User | null> {
    const token = localStorage.getItem("tamil_music_token");
    if (!token) return null;
    
    try {
      const res = await fetch("/api/auth/me", {
        headers: getHeaders()
      });
      if (!res.ok) {
        localStorage.removeItem("tamil_music_token");
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem("tamil_music_token");
  },

  // Users
  async updateProfile(data: {
    name?: string;
    bio?: string;
    favoriteGenres?: string[];
    avatarUrl?: string;
  }): Promise<User> {
    const res = await fetch("/api/users/profile", {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to update profile");
    return body;
  },

  // Songs
  async getSongs(params?: { category?: string; search?: string }): Promise<Song[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append("category", params.category);
    if (params?.search) query.append("search", params.search);

    const res = await fetch(`/api/songs?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to load songs");
    return await res.json();
  },

  async registerPlay(songId: string): Promise<void> {
    await fetch(`/api/songs/${songId}/play`, { method: "POST" });
  },

  // Artists & Albums
  async getArtists(): Promise<Artist[]> {
    const res = await fetch("/api/artists");
    if (!res.ok) throw new Error("Failed to load artists");
    return await res.json();
  },

  async getAlbums(): Promise<Album[]> {
    const res = await fetch("/api/albums");
    if (!res.ok) throw new Error("Failed to load albums");
    return await res.json();
  },

  // Playlists
  async getPlaylists(): Promise<Playlist[]> {
    const token = localStorage.getItem("tamil_music_token");
    if (!token) return [];
    
    const res = await fetch("/api/playlists", {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  },

  async createPlaylist(name: string, description?: string): Promise<Playlist> {
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name, description })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to create playlist");
    return body;
  },

  async deletePlaylist(playlistId: string): Promise<void> {
    const res = await fetch(`/api/playlists/${playlistId}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || "Failed to delete playlist");
    }
  },

  async addSongToPlaylist(playlistId: string, songId: string): Promise<Playlist> {
    const res = await fetch(`/api/playlists/${playlistId}/songs`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ songId })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to add song to playlist");
    return body;
  },

  async removeSongFromPlaylist(playlistId: string, songId: string): Promise<Playlist> {
    const res = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to remove song from playlist");
    return body;
  }
};
