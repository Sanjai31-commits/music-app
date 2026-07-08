/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  bio?: string;
  favoriteGenres?: string[];
  avatarUrl?: string;
  createdAt: string;
}

export interface Song {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  albumId: string;
  albumName: string;
  category: SongCategory;
  duration: number; // in seconds
  audioUrl: string;
  coverUrl: string;
  playCount: number;
}

export enum SongCategory {
  LATEST = "Latest Tamil Songs",
  TRENDING = "Trending Tamil Songs",
  LOVE = "Tamil Love Songs",
  MELODY = "Tamil Melody Songs",
  MASS = "Tamil Mass Songs",
  DEVOTIONAL = "Tamil Devotional Songs",
  FOLK = "Tamil Folk Songs"
}

export interface Artist {
  id: string;
  name: string;
  genre: string;
  imageUrl: string;
  bio: string;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  releaseYear: number;
  coverUrl: string;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description: string;
  songIds: string[];
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface AppState {
  currentUser: User | null;
  token: string | null;
  songs: Song[];
  playlists: Playlist[];
  currentTrack: Song | null;
  isPlaying: boolean;
  activePlaylist: Playlist | null;
  queue: Song[];
  history: Song[];
}
