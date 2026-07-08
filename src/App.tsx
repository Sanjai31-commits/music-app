/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Search,
  Plus,
  Heart,
  User as UserIcon,
  LogOut,
  FolderHeart,
  Music,
  Disc,
  Clock,
  Sparkles,
  ChevronRight,
  ListPlus,
  Trash2,
  Sliders,
  Check,
  Edit2
} from "lucide-react";
import { Song, Playlist, User, SongCategory, Artist, Album } from "./types";
import { api } from "./utils/api";
import AuthModal from "./components/AuthModal";

export default function App() {
  // Navigation state: "home" | "search" | "playlists" | "profile"
  const [activeTab, setActiveTab] = useState<"home" | "search" | "playlists" | "profile">("home");
  
  // App state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  // Auth state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Playlist detailed view
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  
  // Adding song to playlist state
  const [activePlaylistSelectSong, setActivePlaylistSelectSong] = useState<Song | null>(null);
  const [playlistDropdownOpen, setPlaylistDropdownOpen] = useState(false);

  // Player state
  const [currentTrack, setCurrentTrack] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentQueueIdx, setCurrentQueueIdx] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  // Recently Played State
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);

  // Profile Edit State
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileGenres, setProfileGenres] = useState<string[]>([]);
  const [allAvailableGenres] = useState(["Melody", "Mass", "Love", "Folk", "Classical", "Devotional", "Jazz", "Electronic"]);

  // Audio elements ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initial Boot: fetch user if exists, fetch initial songs
  useEffect(() => {
    const initData = async () => {
      try {
        const user = await api.getMe();
        if (user) {
          setCurrentUser(user);
          // Fetch user playlists
          const userPlaylists = await api.getPlaylists();
          setPlaylists(userPlaylists);
        }
      } catch (err) {
        console.error("Auth initialization failed", err);
      }

      try {
        const allSongs = await api.getSongs();
        setSongs(allSongs);
        setFilteredSongs(allSongs);
        if (allSongs.length > 0) {
          // Set initial track to the first song in Latest
          setCurrentTrack(allSongs[0]);
          setQueue(allSongs);
          setCurrentQueueIdx(0);
        }

        const allArtists = await api.getArtists();
        setArtists(allArtists);

        const allAlbums = await api.getAlbums();
        setAlbums(allAlbums);

        // Load recently played from localStorage
        const savedRecentIds = localStorage.getItem("recently_played_ids");
        if (savedRecentIds) {
          try {
            const parsedIds: string[] = JSON.parse(savedRecentIds);
            const recentSongs = parsedIds
              .map(id => allSongs.find(s => s.id === id))
              .filter((s): s is Song => !!s);
            setRecentlyPlayed(recentSongs.slice(0, 10));
          } catch (e) {
            console.error("Failed to parse recently played", e);
          }
        }
      } catch (err) {
        console.error("Failed to fetch library elements", err);
      }
    };

    initData();
  }, []);

  // Sync user's profile info when edit opens
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name);
      setProfileBio(currentUser.bio || "");
      setProfileGenres(currentUser.favoriteGenres || []);
    }
  }, [currentUser, profileEditOpen]);

  // Audio setup & synchronization
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const onEnded = () => {
      if (isLooping) {
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
      } else {
        handleNext();
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [queue, currentQueueIdx, isLooping]);

  // Handle Track Source change
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      const wasPlaying = isPlaying;
      audioRef.current.src = currentTrack.audioUrl;
      audioRef.current.load();
      if (wasPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  }, [currentTrack]);

  // Handle Playback State toggling
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
        if (currentTrack) {
          api.registerPlay(currentTrack.id).catch(() => {});
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Track recently played songs (limit to 10)
  useEffect(() => {
    if (currentTrack && isPlaying) {
      setRecentlyPlayed((prev) => {
        const filtered = prev.filter((s) => s.id !== currentTrack.id);
        const updated = [currentTrack, ...filtered].slice(0, 10);
        localStorage.setItem("recently_played_ids", JSON.stringify(updated.map(s => s.id)));
        return updated;
      });
    }
  }, [currentTrack, isPlaying]);

  // Handle Volume change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Fetch playlist on demand or refresh
  const refreshPlaylists = async () => {
    if (currentUser) {
      const updated = await api.getPlaylists();
      setPlaylists(updated);
      // Update currently viewing playlist if it changed
      if (selectedPlaylist) {
        const matching = updated.find(p => p.id === selectedPlaylist.id);
        if (matching) {
          setSelectedPlaylist(matching);
        } else {
          setSelectedPlaylist(null);
        }
      }
    }
  };

  // Searching logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSongs(songs);
    } else {
      const q = searchQuery.toLowerCase();
      const matched = songs.filter(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.artistName.toLowerCase().includes(q) ||
          s.albumName.toLowerCase().includes(q)
      );
      setFilteredSongs(matched);
    }
  }, [searchQuery, songs]);

  const handleAuthSuccess = async (user: User, token: string) => {
    setCurrentUser(user);
    const userPlaylists = await api.getPlaylists();
    setPlaylists(userPlaylists);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setPlaylists([]);
    setSelectedPlaylist(null);
  };

  // Play controls
  const handlePlaySong = (song: Song, targetQueue?: Song[]) => {
    const activeQueue = targetQueue || songs;
    setQueue(activeQueue);
    const idx = activeQueue.findIndex(s => s.id === song.id);
    setCurrentQueueIdx(idx >= 0 ? idx : 0);
    setCurrentTrack(song);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (queue.length === 0) return;
    let nextIdx = currentQueueIdx + 1;
    if (isShuffling) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (nextIdx >= queue.length) {
      nextIdx = 0;
    }
    setCurrentQueueIdx(nextIdx);
    setCurrentTrack(queue[nextIdx]);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (queue.length === 0) return;
    let prevIdx = currentQueueIdx - 1;
    if (prevIdx < 0) {
      prevIdx = queue.length - 1;
    }
    setCurrentQueueIdx(prevIdx);
    setCurrentTrack(queue[prevIdx]);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      await api.createPlaylist(newPlaylistName, newPlaylistDesc);
      setNewPlaylistName("");
      setNewPlaylistDesc("");
      setCreatePlaylistOpen(false);
      await refreshPlaylists();
    } catch (err: any) {
      alert(err.message || "Failed to create playlist");
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm("Are you sure you want to delete this playlist?")) return;
    try {
      await api.deletePlaylist(playlistId);
      await refreshPlaylists();
    } catch (err: any) {
      alert(err.message || "Failed to delete playlist");
    }
  };

  const handleAddSongToPlaylist = async (playlistId: string, songId: string) => {
    try {
      await api.addSongToPlaylist(playlistId, songId);
      setPlaylistDropdownOpen(false);
      setActivePlaylistSelectSong(null);
      await refreshPlaylists();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveSongFromPlaylist = async (playlistId: string, songId: string) => {
    try {
      await api.removeSongFromPlaylist(playlistId, songId);
      await refreshPlaylists();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateProfile({
        name: profileName,
        bio: profileBio,
        favoriteGenres: profileGenres
      });
      setCurrentUser(updated);
      setProfileEditOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to update profile");
    }
  };

  const toggleGenreSelection = (genre: string) => {
    if (profileGenres.includes(genre)) {
      setProfileGenres(profileGenres.filter(g => g !== genre));
    } else {
      setProfileGenres([...profileGenres, genre]);
    }
  };

  const formatTime = (timeInSecs: number) => {
    if (isNaN(timeInSecs)) return "0:00";
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Helper helper to filter songs by Category
  const getSongsByCategory = (cat: SongCategory) => {
    return songs.filter(s => s.category === cat);
  };

  return (
    <div className="h-screen w-full bg-[#0c0c0e] text-slate-200 font-sans flex flex-col overflow-hidden relative selection:bg-rose-600/30">
      {/* Ambient Mesh Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-900/10 blur-[140px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-900/10 blur-[160px] rounded-full pointer-events-none"></div>

      <div className="flex flex-1 overflow-hidden z-10">
        {/* ================= SIDEBAR NAV ================= */}
        <aside className="w-64 bg-white/5 backdrop-blur-2xl border-r border-white/5 flex flex-col shrink-0">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-2 mb-8">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-900/20">
                <Sparkles className="h-5 w-5 text-white animate-pulse" />
              </div>
              <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-rose-400 to-amber-500 bg-clip-text text-transparent">
                ISAIMIX
              </span>
            </div>

            <nav className="space-y-1.5">
              <button
                onClick={() => {
                  setActiveTab("home");
                  setSelectedPlaylist(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeTab === "home"
                    ? "text-white bg-white/10 shadow-sm border border-white/5"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
                id="nav-home"
              >
                <span>🏠</span> Home
              </button>
              
              <button
                onClick={() => {
                  setActiveTab("search");
                  setSelectedPlaylist(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeTab === "search"
                    ? "text-white bg-white/10 shadow-sm border border-white/5"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
                id="nav-search"
              >
                <span>🔍</span> Search Songs
              </button>

              <button
                onClick={() => {
                  if (!currentUser) {
                    setAuthModalOpen(true);
                  } else {
                    setActiveTab("playlists");
                    setSelectedPlaylist(null);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeTab === "playlists"
                    ? "text-white bg-white/10 shadow-sm border border-white/5"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
                id="nav-playlists"
              >
                <span>📚</span> Curated Playlists
              </button>

              <button
                onClick={() => {
                  if (!currentUser) {
                    setAuthModalOpen(true);
                  } else {
                    setActiveTab("profile");
                    setSelectedPlaylist(null);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeTab === "profile"
                    ? "text-white bg-white/10 shadow-sm border border-white/5"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
                id="nav-profile"
              >
                <span>👤</span> Profile View
              </button>
            </nav>
          </div>

          {/* Quick Mood Filters */}
          <div className="mt-4 px-6 overflow-y-auto flex-1">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-3 px-2">
              Tamil Melodies & Hits
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab("home");
                  const element = document.getElementById("category-love");
                  if (element) element.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full text-left flex items-center gap-2.5 text-slate-400 hover:text-rose-400 text-sm py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500/10" />
                <span>Tamil Love Hits</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("home");
                  const element = document.getElementById("category-melody");
                  if (element) element.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full text-left flex items-center gap-2.5 text-slate-400 hover:text-teal-400 text-sm py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Disc className="h-3.5 w-3.5 text-teal-400" />
                <span>Melody Magic</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("home");
                  const element = document.getElementById("category-mass");
                  if (element) element.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full text-left flex items-center gap-2.5 text-slate-400 hover:text-amber-400 text-sm py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Mass Anthems</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("home");
                  const element = document.getElementById("category-folk");
                  if (element) element.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full text-left flex items-center gap-2.5 text-slate-400 hover:text-orange-400 text-sm py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Music className="h-3.5 w-3.5 text-orange-500" />
                <span>Folk Beats</span>
              </button>
            </div>

            {/* Playlists sidebar list */}
            {currentUser && playlists.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-3 px-2 flex items-center justify-between">
                  <span>My Playlists</span>
                  <FolderHeart className="h-3.5 w-3.5 text-rose-500" />
                </h3>
                <div className="space-y-1">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => {
                        setSelectedPlaylist(playlist);
                        setActiveTab("playlists");
                      }}
                      className="w-full text-left text-xs truncate text-slate-400 hover:text-white py-1.5 px-3 rounded-lg hover:bg-white/5 transition-all block"
                    >
                      🎵 {playlist.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Create Playlist / Current User info in Sidebar bottom */}
          <div className="p-4 mt-auto border-t border-white/5 bg-black/20">
            {currentUser ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setCreatePlaylistOpen(true)}
                  className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                  id="btn-create-playlist-sidebar"
                >
                  <Plus className="h-3.5 w-3.5 text-rose-500" />
                  <span>Create Playlist</span>
                </button>

                <div className="flex items-center justify-between bg-white/5 rounded-xl p-2.5 border border-white/5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={currentUser.avatarUrl || "https://api.dicebear.com/7.x/adventurer/svg"}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full border border-white/10 shrink-0 bg-zinc-900"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">Tamil Premium</div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="Log Out"
                    id="btn-logout-sidebar"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 text-center mb-1">
                  Login to unlock custom playlists & favorites!
                </p>
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="w-full bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40"
                  id="btn-sidebar-login"
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>Get Started Now</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ================= MAIN CONTROLLER ================= */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-zinc-900/40 to-black/90">
          
          {/* HEADER BAR */}
          <header className="h-20 flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm border-b border-white/5 shrink-0 z-20">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder="Search Songs, Artists, Categories..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== "search") {
                    setActiveTab("search");
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/50 transition-all shadow-inner"
                id="search-input-header"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            </div>

            <div className="flex items-center gap-4">
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="text-right hidden md:block">
                    <div className="text-sm font-semibold text-white">வணக்கம், {currentUser.name}</div>
                    <div className="text-xs text-rose-400">வணக்கம்! (Welcome)</div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("profile");
                      setSelectedPlaylist(null);
                    }}
                    className="h-10 w-10 rounded-full overflow-hidden border-2 border-rose-500/30 hover:border-rose-500 transition-all cursor-pointer bg-zinc-900"
                    id="user-avatar-header"
                  >
                    <img
                      src={currentUser.avatarUrl || "https://api.dicebear.com/7.x/adventurer/svg"}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="text-sm font-semibold text-slate-400 hover:text-white transition-all px-4 py-2"
                    id="btn-login-header"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-white/5 hover:scale-105 active:scale-95 transition-all"
                    id="btn-register-header"
                  >
                    Join Now
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* SCROLLABLE SCENE CONTAINER */}
          <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar relative">
            
            {/* ================= VIEW: HOME ================= */}
            {activeTab === "home" && (
              <div className="space-y-8 animate-fadeIn">
                {/* Stunning Featured Banner */}
                <section className="relative h-64 rounded-3xl overflow-hidden bg-gradient-to-br from-rose-600/30 via-zinc-950 to-blue-900/40 border border-white/10 flex items-center px-10 shadow-2xl">
                  {/* Visual Background Pattern */}
                  <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-30 md:opacity-70 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-black to-transparent z-10"></div>
                    <img
                      src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80"
                      alt="Banner graphic"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-4 max-w-xl z-20">
                    <span className="text-[10px] bg-rose-600/80 text-white font-bold px-3 py-1 rounded-full tracking-widest uppercase">
                      Featured Album
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                      The Best of Leo & Jailer
                    </h1>
                    <p className="text-sm text-slate-300 line-clamp-2">
                      Experience the roaring beats of Anirudh Ravichander with our curated modern mass playlist including Hukum, Badass, Kaavaalaa and Naa Ready!
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => {
                          const featuredSongs = songs.filter(s => s.albumName === "Leo" || s.albumName === "Jailer");
                          if (featuredSongs.length > 0) {
                            handlePlaySong(featuredSongs[0], featuredSongs);
                          }
                        }}
                        className="bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold px-6 py-3 rounded-full text-sm flex items-center gap-2 shadow-lg shadow-rose-950/50 hover:scale-105 active:scale-95 transition-all"
                        id="play-featured-banner"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        <span>Play Special Hits</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* DYNAMIC ARTIST SPOTLIGHT BANNERS CAROUSEL */}
                <section className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <span className="text-rose-500">👑</span> Artist Spotlight
                      </h2>
                      <p className="text-xs text-slate-400 font-medium">Step into the musical worlds of Tamil Cinema's master composers</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x no-scrollbar">
                    {/* Banner 1: Anirudh */}
                    <div className="min-w-[280px] sm:min-w-[400px] md:min-w-[500px] h-48 rounded-2xl overflow-hidden relative border border-white/10 group shrink-0 snap-start shadow-xl">
                      <img
                        src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000&auto=format&fit=crop&q=80"
                        alt="Anirudh Ravichander Spotlight"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-5 md:p-6">
                        <span className="text-[9px] bg-rose-600 text-white font-bold px-2.5 py-1 rounded-full w-max mb-2 tracking-widest uppercase">
                          Mass BGM King
                        </span>
                        <h3 className="text-lg md:text-2xl font-black text-white">Anirudh Ravichander</h3>
                        <p className="text-xs text-slate-300 mt-1 line-clamp-1">Composer of Jailer, Leo & master of high-octane rock-electronic fusion beats.</p>
                        <button
                          onClick={() => {
                            setSearchQuery("Anirudh Ravichander");
                            setActiveTab("search");
                          }}
                          className="mt-3 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 w-max px-4 py-2 rounded-xl transition-all"
                        >
                          Explore Hits →
                        </button>
                      </div>
                    </div>

                    {/* Banner 2: A.R. Rahman */}
                    <div className="min-w-[280px] sm:min-w-[400px] md:min-w-[500px] h-48 rounded-2xl overflow-hidden relative border border-white/10 group shrink-0 snap-start shadow-xl">
                      <img
                        src="https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=1000&auto=format&fit=crop&q=80"
                        alt="A. R. Rahman Spotlight"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-5 md:p-6">
                        <span className="text-[9px] bg-amber-500 text-black font-bold px-2.5 py-1 rounded-full w-max mb-2 tracking-widest uppercase">
                          Isai Puyal (Musical Storm)
                        </span>
                        <h3 className="text-lg md:text-2xl font-black text-white">A. R. Rahman</h3>
                        <p className="text-xs text-slate-300 mt-1 line-clamp-1">Academy Award winner. Crafting soulful symphonies and globally adored melodies.</p>
                        <button
                          onClick={() => {
                            setSearchQuery("A. R. Rahman");
                            setActiveTab("search");
                          }}
                          className="mt-3 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 w-max px-4 py-2 rounded-xl transition-all"
                        >
                          Explore Hits →
                        </button>
                      </div>
                    </div>

                    {/* Banner 3: Ilayaraja */}
                    <div className="min-w-[280px] sm:min-w-[400px] md:min-w-[500px] h-48 rounded-2xl overflow-hidden relative border border-white/10 group shrink-0 snap-start shadow-xl">
                      <img
                        src="https://images.unsplash.com/photo-1442504028989-ab58b5f29a4a?w=1000&auto=format&fit=crop&q=80"
                        alt="Ilayaraja Spotlight"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-5 md:p-6">
                        <span className="text-[9px] bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-full w-max mb-2 tracking-widest uppercase">
                          Isaignani (Musical Sage)
                        </span>
                        <h3 className="text-lg md:text-2xl font-black text-white">Ilayaraja</h3>
                        <p className="text-xs text-slate-300 mt-1 line-clamp-1">Legendary maestro of orchestration, rustic folk, and timeless classical structures.</p>
                        <button
                          onClick={() => {
                            setSearchQuery("Ilayaraja");
                            setActiveTab("search");
                          }}
                          className="mt-3 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 w-max px-4 py-2 rounded-xl transition-all"
                        >
                          Explore Hits →
                        </button>
                      </div>
                    </div>
                    
                    {/* Banner 4: Yuvan Shankar Raja */}
                    <div className="min-w-[280px] sm:min-w-[400px] md:min-w-[500px] h-48 rounded-2xl overflow-hidden relative border border-white/10 group shrink-0 snap-start shadow-xl">
                      <img
                        src="https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1000&auto=format&fit=crop&q=80"
                        alt="Yuvan Spotlight"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-5 md:p-6">
                        <span className="text-[9px] bg-purple-600 text-white font-bold px-2.5 py-1 rounded-full w-max mb-2 tracking-widest uppercase">
                          BGM King of Youth
                        </span>
                        <h3 className="text-lg md:text-2xl font-black text-white">Yuvan Shankar Raja</h3>
                        <p className="text-xs text-slate-300 mt-1 line-clamp-1">Pioneer of electronic pop and heart-melting romantic melodies in modern Tamil cinema.</p>
                        <button
                          onClick={() => {
                            setSearchQuery("Yuvan Shankar Raja");
                            setActiveTab("search");
                          }}
                          className="mt-3 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 w-max px-4 py-2 rounded-xl transition-all"
                        >
                          Explore Hits →
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* POPULAR ARTISTS ON HOME PAGE */}
                <section className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                      <span className="text-rose-500">🌟</span> Popular Artists
                    </h2>
                    <p className="text-xs text-slate-400">Click on any Tamil master artist to view their full catalog</p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {artists.slice(0, 6).map((artist) => (
                      <div
                        key={artist.id}
                        onClick={() => {
                          setSearchQuery(artist.name);
                          setActiveTab("search");
                        }}
                        className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-rose-500/30 transition-all text-center cursor-pointer group hover:shadow-[0_10px_25px_rgba(244,63,94,0.1)] duration-300 animate-fadeIn"
                      >
                        <div className="relative w-24 h-24 mx-auto mb-3 overflow-hidden rounded-full border border-white/10 group-hover:border-rose-500/50 transition-colors duration-300 shadow-md">
                          <img
                            src={artist.imageUrl}
                            alt={artist.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <h4 className="text-sm font-bold text-white truncate group-hover:text-rose-400 transition-colors">{artist.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{artist.genre}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* RECENTLY PLAYED SECTION */}
                {recentlyPlayed.length > 0 && (
                  <section id="category-recently-played" className="space-y-4 animate-fadeIn">
                    <div className="flex justify-between items-end">
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                          <span className="text-rose-500">🕒</span> Recently Played
                        </h2>
                        <p className="text-xs text-slate-400 font-medium">Jump back in and resume your previous sessions</p>
                      </div>
                      <button
                        onClick={() => {
                          setRecentlyPlayed([]);
                          localStorage.removeItem("recently_played_ids");
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-all bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/5 active:scale-95"
                      >
                        Clear History
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                      {recentlyPlayed.map((song) => (
                        <SongCard
                          key={`recent-${song.id}`}
                          song={song}
                          onPlay={() => handlePlaySong(song, songs)}
                          currentTrack={currentTrack}
                          isPlaying={isPlaying}
                          onAddToPlaylist={() => {
                            setActivePlaylistSelectSong(song);
                            setPlaylistDropdownOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* 1. LATEST SONGS SECTION */}
                <section id="category-latest">
                  <div className="flex justify-between items-end mb-5">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <span className="text-rose-500">✨</span> {SongCategory.LATEST}
                      </h2>
                      <p className="text-xs text-slate-400">Freshly arrived Tamil melodies & hits</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {getSongsByCategory(SongCategory.LATEST).map((song) => (
                      <SongCard key={song.id} song={song} onPlay={() => handlePlaySong(song, songs)} currentTrack={currentTrack} isPlaying={isPlaying} onAddToPlaylist={() => {
                        setActivePlaylistSelectSong(song);
                        setPlaylistDropdownOpen(true);
                      }} />
                    ))}
                  </div>
                </section>

                {/* 2. TRENDING SONGS SECTION */}
                <section id="category-trending">
                  <div className="flex justify-between items-end mb-5">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <span className="text-amber-500">🔥</span> {SongCategory.TRENDING}
                      </h2>
                      <p className="text-xs text-slate-400">The most played tracks across Tamil Nadu right now</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {getSongsByCategory(SongCategory.TRENDING).map((song) => (
                      <SongCard key={song.id} song={song} onPlay={() => handlePlaySong(song, songs)} currentTrack={currentTrack} isPlaying={isPlaying} onAddToPlaylist={() => {
                        setActivePlaylistSelectSong(song);
                        setPlaylistDropdownOpen(true);
                      }} />
                    ))}
                  </div>
                </section>

                {/* 3. TAMIL LOVE SONGS SECTION */}
                <section id="category-love">
                  <div className="flex justify-between items-end mb-5">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <span className="text-rose-500">❤️</span> {SongCategory.LOVE}
                      </h2>
                      <p className="text-xs text-slate-400">Romantic anthems to touch your heart strings</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {getSongsByCategory(SongCategory.LOVE).map((song) => (
                      <SongCard key={song.id} song={song} onPlay={() => handlePlaySong(song, songs)} currentTrack={currentTrack} isPlaying={isPlaying} onAddToPlaylist={() => {
                        setActivePlaylistSelectSong(song);
                        setPlaylistDropdownOpen(true);
                      }} />
                    ))}
                  </div>
                </section>

                {/* 4. TAMIL MELODY SONGS SECTION */}
                <section id="category-melody">
                  <div className="flex justify-between items-end mb-5">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <span className="text-emerald-400">🍃</span> {SongCategory.MELODY}
                      </h2>
                      <p className="text-xs text-slate-400">Classic and contemporary soulful melodies</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {getSongsByCategory(SongCategory.MELODY).map((song) => (
                      <SongCard key={song.id} song={song} onPlay={() => handlePlaySong(song, songs)} currentTrack={currentTrack} isPlaying={isPlaying} onAddToPlaylist={() => {
                        setActivePlaylistSelectSong(song);
                        setPlaylistDropdownOpen(true);
                      }} />
                    ))}
                  </div>
                </section>

                {/* 5. TAMIL MASS SONGS SECTION */}
                <section id="category-mass">
                  <div className="flex justify-between items-end mb-5">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <span className="text-purple-400">🎸</span> {SongCategory.MASS}
                      </h2>
                      <p className="text-xs text-slate-400">High-energy mass commercial anthems</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {getSongsByCategory(SongCategory.MASS).map((song) => (
                      <SongCard key={song.id} song={song} onPlay={() => handlePlaySong(song, songs)} currentTrack={currentTrack} isPlaying={isPlaying} onAddToPlaylist={() => {
                        setActivePlaylistSelectSong(song);
                        setPlaylistDropdownOpen(true);
                      }} />
                    ))}
                  </div>
                </section>

                {/* 6. DEVOTIONAL SONGS SECTION */}
                <section id="category-devotional">
                  <div className="flex justify-between items-end mb-5">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <span className="text-amber-500">🕉️</span> {SongCategory.DEVOTIONAL}
                      </h2>
                      <p className="text-xs text-slate-400">Divine hymns & classic spiritual hits</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {getSongsByCategory(SongCategory.DEVOTIONAL).map((song) => (
                      <SongCard key={song.id} song={song} onPlay={() => handlePlaySong(song, songs)} currentTrack={currentTrack} isPlaying={isPlaying} onAddToPlaylist={() => {
                        setActivePlaylistSelectSong(song);
                        setPlaylistDropdownOpen(true);
                      }} />
                    ))}
                  </div>
                </section>

                {/* 7. FOLK SONGS SECTION */}
                <section id="category-folk">
                  <div className="flex justify-between items-end mb-5">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <span className="text-orange-500">🥁</span> {SongCategory.FOLK}
                      </h2>
                      <p className="text-xs text-slate-400">Rustic rhythm and traditional folk melodies</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {getSongsByCategory(SongCategory.FOLK).map((song) => (
                      <SongCard key={song.id} song={song} onPlay={() => handlePlaySong(song, songs)} currentTrack={currentTrack} isPlaying={isPlaying} onAddToPlaylist={() => {
                        setActivePlaylistSelectSong(song);
                        setPlaylistDropdownOpen(true);
                      }} />
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* ================= VIEW: SEARCH & ALL RESULTS ================= */}
            {activeTab === "search" && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-white">Search Tamil Music</h2>
                  <p className="text-sm text-slate-400">Discover songs, master artists, and unforgettable albums</p>
                </div>

                {searchQuery ? (
                  <div className="space-y-8">
                    {/* Songs Result */}
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Matched Tamil Songs ({filteredSongs.length})</h3>
                      {filteredSongs.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                          {filteredSongs.map((song) => (
                            <SongCard key={song.id} song={song} onPlay={() => handlePlaySong(song, filteredSongs)} currentTrack={currentTrack} isPlaying={isPlaying} onAddToPlaylist={() => {
                              setActivePlaylistSelectSong(song);
                              setPlaylistDropdownOpen(true);
                            }} />
                          ))}
                        </div>
                      ) : (
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-8 text-center">
                          <Music className="h-8 w-8 text-slate-500 mx-auto mb-3" />
                          <p className="text-sm text-slate-400">No songs match your search phrase "{searchQuery}"</p>
                        </div>
                      )}
                    </div>

                    {/* Artist match */}
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Featured Artists</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                        {artists
                          .filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map(artist => (
                            <div key={artist.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all text-center">
                              <img src={artist.imageUrl} alt={artist.name} referrerPolicy="no-referrer" className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border border-white/10" />
                              <h4 className="text-sm font-bold text-white truncate">{artist.name}</h4>
                              <p className="text-xs text-rose-400 truncate">{artist.genre}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {/* Search Suggestions Default UI */}
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Top Artists</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                        {artists.map(artist => (
                          <div
                            key={artist.id}
                            onClick={() => setSearchQuery(artist.name)}
                            className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all text-center cursor-pointer group"
                          >
                            <div className="relative w-20 h-20 mx-auto mb-3 overflow-hidden rounded-full border border-white/10">
                              <img src={artist.imageUrl} alt={artist.name} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            </div>
                            <h4 className="text-sm font-bold text-white truncate">{artist.name}</h4>
                            <p className="text-xs text-slate-400 truncate">{artist.genre}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Trending Albums</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                        {albums.map(album => (
                          <div
                            key={album.id}
                            onClick={() => setSearchQuery(album.title)}
                            className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all text-center cursor-pointer group"
                          >
                            <div className="relative aspect-square rounded-xl overflow-hidden mb-3 border border-white/10">
                              <img src={album.coverUrl} alt={album.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <h4 className="text-sm font-bold text-white truncate">{album.title}</h4>
                            <p className="text-xs text-slate-400 truncate">{album.artistName}</p>
                            <span className="text-[10px] text-rose-400 font-semibold">{album.releaseYear}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================= VIEW: PLAYLISTS ================= */}
            {activeTab === "playlists" && (
              <div className="space-y-8 animate-fadeIn">
                {selectedPlaylist ? (
                  // PLAYLIST SPECIFIC SONGS VIEW
                  <div className="space-y-6">
                    <button
                      onClick={() => setSelectedPlaylist(null)}
                      className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-semibold transition-colors"
                    >
                      ← Back to Playlists
                    </button>

                    <div className="bg-gradient-to-br from-rose-900/30 to-black/40 border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
                      <div className="h-36 w-36 bg-gradient-to-tr from-rose-600 to-amber-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden border border-white/10">
                        <Music className="h-16 w-16 text-white" />
                      </div>

                      <div className="flex-1 text-center md:text-left space-y-2">
                        <span className="text-[10px] bg-rose-600 text-white px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                          User Playlist
                        </span>
                        <h2 className="text-3xl md:text-4xl font-black text-white">{selectedPlaylist.name}</h2>
                        <p className="text-sm text-slate-300">{selectedPlaylist.description}</p>
                        <div className="text-xs text-slate-400 flex items-center justify-center md:justify-start gap-3">
                          <span>Created by {currentUser?.name}</span>
                          <span>•</span>
                          <span>{selectedPlaylist.songIds.length} tracks</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            // Find all songs in this playlist
                            const pSongs = songs.filter(s => selectedPlaylist.songIds.includes(s.id));
                            if (pSongs.length > 0) {
                              handlePlaySong(pSongs[0], pSongs);
                            } else {
                              alert("Add songs to this playlist first!");
                            }
                          }}
                          className="bg-white hover:bg-slate-200 text-black font-bold px-6 py-3 rounded-full text-sm flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/40"
                        >
                          <Play className="h-4 w-4 fill-current" /> Play Selection
                        </button>
                        <button
                          onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                          className="bg-rose-600/10 hover:bg-rose-600/30 text-rose-500 hover:text-rose-400 p-3 rounded-full transition-colors border border-rose-500/10"
                          title="Delete Playlist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Playlist Tracklist Table */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>Songs List</span>
                        <span className="text-sm font-medium text-slate-500">({selectedPlaylist.songIds.length})</span>
                      </h3>

                      <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                        {songs.filter(s => selectedPlaylist.songIds.includes(s.id)).length > 0 ? (
                          <div className="divide-y divide-white/5">
                            {songs
                              .filter(s => selectedPlaylist.songIds.includes(s.id))
                              .map((song, index) => (
                                <div
                                  key={song.id}
                                  className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                                >
                                  <div className="flex items-center gap-4 min-w-0">
                                    <span className="text-slate-500 text-sm font-bold w-5 text-center group-hover:text-rose-500">
                                      {index + 1}
                                    </span>
                                    <img
                                      src={song.coverUrl}
                                      alt={song.title}
                                      className="w-11 h-11 rounded-lg object-cover border border-white/10 shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <h4 className="text-sm font-bold text-white truncate">{song.title}</h4>
                                      <p className="text-xs text-slate-400 truncate">{song.artistName} • {song.albumName}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <button
                                      onClick={() => handlePlaySong(song, songs.filter(s => selectedPlaylist.songIds.includes(s.id)))}
                                      className="h-8 w-8 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors"
                                    >
                                      <Play className="h-3 w-3 fill-current ml-0.5" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveSongFromPlaylist(selectedPlaylist.id, song.id)}
                                      className="text-slate-500 hover:text-rose-500 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                                      title="Remove track"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="p-12 text-center">
                            <Music className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm mb-2">No songs added yet</p>
                            <p className="text-xs text-slate-500">Go to home page to add tracks to your playlist</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // ALL PLAYLISTS GALLERY
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-white">Curated Playlists</h2>
                        <p className="text-sm text-slate-400">Handcrafted lists tailored for every mood and event</p>
                      </div>
                      <button
                        onClick={() => setCreatePlaylistOpen(true)}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg"
                        id="btn-create-playlist-main"
                      >
                        <Plus className="h-4 w-4" /> Create Playlist
                      </button>
                    </div>

                    {playlists.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {playlists.map((playlist) => (
                          <div
                            key={playlist.id}
                            className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:bg-white/10 transition-all flex flex-col justify-between group"
                          >
                            <div>
                              <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-rose-600/20 to-amber-500/20 flex items-center justify-center border border-white/10 mb-4 text-rose-500 group-hover:scale-110 transition-transform">
                                <Music className="h-6 w-6" />
                              </div>
                              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-rose-400 transition-colors">
                                {playlist.name}
                              </h3>
                              <p className="text-xs text-slate-400 line-clamp-2 mb-4">{playlist.description}</p>
                            </div>

                            <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                                {playlist.songIds.length} Songs
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedPlaylist(playlist)}
                                  className="text-xs font-bold text-rose-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                                >
                                  <span>View Tracks</span>
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white/5 border border-white/5 rounded-3xl p-16 text-center max-w-xl mx-auto shadow-xl">
                        <FolderHeart className="h-14 w-14 text-rose-500 mx-auto mb-4 animate-bounce" />
                        <h3 className="text-xl font-bold text-white mb-2">Create Your First Tamil Playlist</h3>
                        <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                          Keep your favorite Tamil melodies, classical and mass hits perfectly organized in one place.
                        </p>
                        <button
                          onClick={() => setCreatePlaylistOpen(true)}
                          className="bg-white text-black font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 mx-auto hover:scale-105 active:scale-95 transition-all"
                        >
                          <Plus className="h-4 w-4" /> Assemble Playlist
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ================= VIEW: PROFILE ================= */}
            {activeTab === "profile" && currentUser && (
              <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
                <div className="bg-gradient-to-br from-rose-900/20 via-zinc-950 to-zinc-900/40 border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
                  <div className="relative group">
                    <img
                      src={currentUser.avatarUrl || "https://api.dicebear.com/7.x/adventurer/svg"}
                      alt={currentUser.name}
                      className="w-28 h-28 rounded-full border-4 border-rose-500/30 shadow-xl object-cover bg-zinc-900"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white cursor-pointer" onClick={() => setProfileEditOpen(true)}>
                      <Edit2 className="h-4 w-4 mr-1" /> Edit
                    </div>
                  </div>

                  <div className="flex-1 text-center md:text-left space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <h2 className="text-3xl font-black text-white tracking-tight">{currentUser.name}</h2>
                      <span className="inline-block bg-rose-600/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mx-auto md:mx-0">
                        Isai Premium Enthusiast
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 italic max-w-md">
                      "{currentUser.bio || "No bio added yet! Add some words describing your musical devotion!"}"
                    </p>

                    <div className="text-xs text-slate-400 flex items-center justify-center md:justify-start gap-4 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-500" /> Joined {new Date(currentUser.createdAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-rose-400 font-medium">
                        <Heart className="h-3.5 w-3.5 fill-current" /> Custom Curated Lists ({playlists.length})
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setProfileEditOpen(true)}
                    className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all shrink-0"
                    id="btn-edit-profile-trigger"
                  >
                    <Sliders className="h-4 w-4" /> Edit Profile
                  </button>
                </div>

                {/* Favorite Genres card */}
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 md:p-8 space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-rose-500" /> Favorite Tamil Genres
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {currentUser.favoriteGenres && currentUser.favoriteGenres.length > 0 ? (
                      currentUser.favoriteGenres.map((genre, i) => (
                        <span
                          key={i}
                          className="px-4 py-2 bg-rose-600/10 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold"
                        >
                          🎵 {genre}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">No genres selected yet. Edit your profile to pick yours!</p>
                    )}
                  </div>
                </div>

                {/* Premium Account stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Listen-Time</h4>
                    <span className="text-3xl font-black text-white">42 hrs 15 mins</span>
                    <p className="text-xs text-rose-400 mt-2">Active listener since registration</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Favorite Artist</h4>
                    <span className="text-3xl font-black text-white">Anirudh Ravichander</span>
                    <p className="text-xs text-slate-400 mt-2">Playing latest mass beats constantly</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ================= FIXED GLASS MUSIC PLAYER FOOTER ================= */}
      <footer className="h-[96px] bg-black/60 backdrop-blur-3xl border-t border-white/10 flex items-center px-8 z-30 justify-between shrink-0 select-none">
        {/* Track info on left */}
        <div className="w-1/3 flex items-center gap-4 min-w-0">
          {currentTrack ? (
            <>
              <div className="w-14 h-14 rounded-xl border border-white/10 shrink-0 overflow-hidden shadow-lg shadow-black/40 relative group">
                <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Disc className={`h-6 w-6 text-white ${isPlaying ? "animate-spin" : ""}`} />
                </div>
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="text-sm font-bold text-white truncate hover:text-rose-400 cursor-pointer transition-colors" title={currentTrack.title}>
                  {currentTrack.title}
                </div>
                <div className="text-xs text-slate-400 truncate hover:text-white cursor-pointer transition-colors">
                  {currentTrack.artistName} • {currentTrack.albumName}
                </div>
              </div>
              {currentUser && (
                <button
                  onClick={async () => {
                    // Quick add to user favorites playlist if logged in
                    const favList = playlists.find(p => p.name.includes("Favorites"));
                    if (favList) {
                      try {
                        if (favList.songIds.includes(currentTrack.id)) {
                          await api.removeSongFromPlaylist(favList.id, currentTrack.id);
                        } else {
                          await api.addSongToPlaylist(favList.id, currentTrack.id);
                        }
                        await refreshPlaylists();
                      } catch (err: any) {
                        alert(err.message);
                      }
                    } else {
                      // Trigger normal playlist select
                      setActivePlaylistSelectSong(currentTrack);
                      setPlaylistDropdownOpen(true);
                    }
                  }}
                  className="text-rose-500 hover:text-rose-400 p-1.5 rounded-full transition-colors ml-2 hover:bg-white/5 shrink-0"
                >
                  <Heart
                    className={`h-4.5 w-4.5 ${
                      playlists.some(p => p.name.includes("Favorites") && p.songIds.includes(currentTrack.id))
                        ? "fill-current"
                        : ""
                    }`}
                  />
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/5">
                <Music className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-500">No Track Selected</div>
                <div className="text-xs text-slate-600">Select a Tamil song to start playing</div>
              </div>
            </div>
          )}
        </div>

        {/* Center Main Controls */}
        <div className="flex-1 flex flex-col items-center gap-1.5 px-4 max-w-xl">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsShuffling(!isShuffling)}
              className={`text-slate-400 hover:text-white transition-all text-xs ${isShuffling ? "text-rose-500" : ""}`}
              title="Shuffle queue"
            >
              🔀
            </button>
            
            <button
              onClick={handlePrev}
              className="text-slate-200 hover:text-white transition-all p-1 hover:bg-white/5 rounded-full"
              title="Previous song"
            >
              <SkipBack className="h-5 w-5 fill-current" />
            </button>

            <button
              onClick={handlePlayPause}
              disabled={!currentTrack}
              className="w-11 h-11 bg-white text-black rounded-full flex items-center justify-center pl-0.5 hover:scale-110 active:scale-95 transition-all shadow-md shadow-black/30 disabled:opacity-50"
              title={isPlaying ? "Pause" : "Play"}
              id="player-play-pause-btn"
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            </button>

            <button
              onClick={handleNext}
              className="text-slate-200 hover:text-white transition-all p-1 hover:bg-white/5 rounded-full"
              title="Next song"
            >
              <SkipForward className="h-5 w-5 fill-current" />
            </button>

            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`text-slate-400 hover:text-white transition-all text-xs ${isLooping ? "text-rose-500" : ""}`}
              title="Repeat current song"
            >
              🔁
            </button>
          </div>

          <div className="w-full flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-mono w-8 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={!currentTrack}
              className="flex-1 h-1 bg-white/10 hover:bg-white/20 rounded-full appearance-none cursor-pointer accent-rose-500 transition-colors focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 font-mono w-8 text-left">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Extras on Right (Volume & Category display) */}
        <div className="w-1/3 flex items-center justify-end gap-4">
          {currentTrack && (
            <span className="text-[10px] bg-white/5 px-2.5 py-1 border border-white/5 rounded text-rose-400 font-bold hidden lg:inline-block truncate max-w-40">
              🏷️ {currentTrack.category}
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="w-20 sm:w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-rose-500 focus:outline-none"
            />
          </div>
        </div>
      </footer>

      {/* ================= MODAL: CREATE PLAYLIST ================= */}
      <AnimatePresence>
        {createPlaylistOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreatePlaylistOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl p-6 shadow-2xl text-slate-100 z-10"
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-rose-500">
                <ListPlus className="h-5 w-5" /> Curate New Playlist
              </h3>
              <form onSubmit={handleCreatePlaylist} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Playlist Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. My Late Night Melodies"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="e.g. Peaceful melodies for study sessions or stargazing..."
                    value={newPlaylistDesc}
                    onChange={(e) => setNewPlaylistDesc(e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all resize-none"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setCreatePlaylistOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-lg"
                  >
                    Build Playlist
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: EDIT USER PROFILE ================= */}
      <AnimatePresence>
        {profileEditOpen && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileEditOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl p-6 shadow-2xl text-slate-100 z-10"
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-rose-500">
                <Sliders className="h-5 w-5" /> Adjust Profile Preferences
              </h3>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Display Name</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Short Bio</label>
                  <textarea
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Favorite Genres (Click to Select)</label>
                  <div className="flex flex-wrap gap-2">
                    {allAvailableGenres.map((genre) => {
                      const isSelected = profileGenres.includes(genre);
                      return (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => toggleGenreSelection(genre)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                            isSelected
                              ? "bg-rose-600/20 text-rose-400 border-rose-500/40 shadow-inner"
                              : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                          <span>{genre}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setProfileEditOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-lg"
                  >
                    Commit Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: CHOOSE PLAYLIST TO ADD SONG TO ================= */}
      <AnimatePresence>
        {playlistDropdownOpen && activePlaylistSelectSong && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setPlaylistDropdownOpen(false);
                setActivePlaylistSelectSong(null);
              }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl p-6 shadow-2xl text-slate-100 z-10"
            >
              <h3 className="text-xl font-bold mb-2 text-rose-500 flex items-center gap-2">
                <ListPlus className="h-5 w-5" /> Add to Playlist
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Choose which of your collections to add <strong className="text-slate-200">"{activePlaylistSelectSong.title}"</strong> to:
              </p>

              {playlists.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-1">
                  {playlists.map((playlist) => {
                    const hasSong = playlist.songIds.includes(activePlaylistSelectSong.id);
                    return (
                      <button
                        key={playlist.id}
                        disabled={hasSong}
                        onClick={() => handleAddSongToPlaylist(playlist.id, activePlaylistSelectSong.id)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5 text-left transition-all"
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-white block truncate">{playlist.name}</span>
                          <span className="text-[10px] text-slate-400">{playlist.songIds.length} tracks current</span>
                        </div>
                        {hasSong ? (
                          <span className="text-[10px] bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                            Already Added
                          </span>
                        ) : (
                          <span className="text-xs text-rose-400 font-semibold flex items-center gap-0.5">
                            <Plus className="h-3.5 w-3.5" /> Add
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-6 border border-dashed border-white/10 rounded-xl mb-4">
                  <p className="text-slate-400 text-sm mb-3">You don't have any playlists created yet!</p>
                  <button
                    onClick={() => {
                      setPlaylistDropdownOpen(false);
                      setCreatePlaylistOpen(true);
                    }}
                    className="bg-rose-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg hover:bg-rose-500 transition-colors"
                  >
                    Create One Now
                  </button>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPlaylistDropdownOpen(false);
                    setActivePlaylistSelectSong(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Authentic Auth Modal overlay */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

// Reusable elegant Song Card Component matching "Frosted Glass" theme rules
interface SongCardProps {
  key?: string;
  song: Song;
  onPlay: () => void;
  currentTrack: Song | null;
  isPlaying: boolean;
  onAddToPlaylist: () => void;
}

function SongCard({ song, onPlay, currentTrack, isPlaying, onAddToPlaylist }: SongCardProps) {
  const isSelected = currentTrack?.id === song.id;
  
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-rose-500/30 hover:shadow-[0_15px_30px_rgba(244,63,94,0.15)] transition-all cursor-pointer group flex flex-col justify-between h-full duration-300"
    >
      <div>
        {/* Cover Art container */}
        <div className="aspect-square bg-zinc-900 rounded-xl mb-3 relative overflow-hidden border border-white/10 shadow-md">
          <img
            src={song.coverUrl}
            alt={song.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-transform duration-500"
          />

          {/* Frosted Play Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[4px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
              className="w-11 h-11 bg-rose-600 text-white rounded-full flex items-center justify-center pl-0.5 text-md hover:scale-110 active:scale-95 transition-all shadow-xl shadow-rose-950/40"
              title="Play song"
            >
              {isSelected && isPlaying ? (
                <Pause className="h-5 w-5 fill-current text-white" />
              ) : (
                <Play className="h-5 w-5 fill-current text-white" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToPlaylist();
              }}
              className="w-9 h-9 bg-white/15 hover:bg-white/25 text-white rounded-full flex items-center justify-center text-sm transition-all hover:scale-105 active:scale-95"
              title="Add to Playlist"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Active audio playing signal animation tag */}
          {isSelected && isPlaying && (
            <div className="absolute top-2.5 right-2.5 bg-rose-600/95 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-bold tracking-widest text-white flex items-center gap-1 shadow-md">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
              <span>LIVE</span>
            </div>
          )}
        </div>

        {/* Title and artist */}
        <h4 className={`text-sm font-bold truncate leading-snug mb-0.5 ${isSelected ? "text-rose-400 font-extrabold" : "text-white group-hover:text-rose-400 transition-colors"}`}>
          {song.title}
        </h4>
        <p className="text-xs text-slate-400 truncate mb-1">
          {song.artistName}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-2 text-[10px] text-slate-500">
        <span className="truncate max-w-28 font-medium">💿 {song.albumName}</span>
        <span className="font-mono">{Math.floor(song.duration / 60)}:{(song.duration % 60) < 10 ? "0" : ""}{song.duration % 60}</span>
      </div>
    </motion.div>
  );
}
