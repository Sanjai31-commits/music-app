/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { SongCategory, Song, Artist, Album, Playlist, User } from "./src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Enable JSON parsing
app.use(express.json());

// Database file path
const DB_FILE = path.join(__dirname, "db.json");

// Static Tamil music database models
const INITIAL_ARTISTS: Artist[] = [
  {
    id: "a1",
    name: "Anirudh Ravichander",
    genre: "Modern Tamil/Mass",
    imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&auto=format&fit=crop&q=80",
    bio: "Anirudh Ravichander is an Indian music composer and singer who primarily works in Tamil cinema."
  },
  {
    id: "a2",
    name: "Santhosh Narayanan",
    genre: "Folk/Melody/Mass",
    imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80",
    bio: "Santhosh Narayanan is an Indian film composer and musician known for his unique folk-infused modern tunes."
  },
  {
    id: "a3",
    name: "Govind Vasantha",
    genre: "Melody/Love",
    imageUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&auto=format&fit=crop&q=80",
    bio: "Govind Vasantha is a violinist and composer, recognized globally for the soulful score of the movie '96."
  },
  {
    id: "a4",
    name: "Sulamangalam Sisters",
    genre: "Devotional",
    imageUrl: "https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=400&auto=format&fit=crop&q=80",
    bio: "Sulamangalam Jayalakshmi and Sulamangalam Rajalakshmi were popular Carnatic music sisters known for their devotional hymns."
  },
  {
    id: "a5",
    name: "A. R. Rahman",
    genre: "Melody/Love/Global",
    imageUrl: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&auto=format&fit=crop&q=80",
    bio: "Allah Rakha Rahman is an Academy Award-winning Indian composer, record producer, singer, and songwriter."
  },
  {
    id: "a6",
    name: "Ilayaraja",
    genre: "Classical/Melody/Folk",
    imageUrl: "https://images.unsplash.com/photo-1442504028989-ab58b5f29a4a?w=400&auto=format&fit=crop&q=80",
    bio: "Isaignani Ilaiyaraaja is a legendary Indian composer, singer, and lyricist with thousands of timeless melodies."
  },
  {
    id: "a7",
    name: "Yuvan Shankar Raja",
    genre: "Modern Melody/BGM/Mass",
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80",
    bio: "Yuvan Shankar Raja is an Indian music composer and singer who works primarily in Tamil films. Known for his pioneering work in electronic music."
  },
  {
    id: "a8",
    name: "Harris Jayaraj",
    genre: "Melody/Romance/Pop",
    imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80",
    bio: "Harris Jayaraj is an Indian composer who writes scores and soundtracks for Tamil, Telugu, and Hindi films, famous for his romantic hits."
  },
  {
    id: "a9",
    name: "G. V. Prakash",
    genre: "Melody/Folk/Drama",
    imageUrl: "https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=400&auto=format&fit=crop&q=80",
    bio: "G. V. Prakash Kumar is an Indian composer, singer, and actor who has composed timeless music for Tamil films."
  },
  {
    id: "a10",
    name: "Vidyasagar",
    genre: "Classical/Melody",
    imageUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&auto=format&fit=crop&q=80",
    bio: "Vidyasagar is a versatile Indian composer who has produced numerous award-winning soulful melodies in Tamil and Malayalam."
  }
];

const INITIAL_ALBUMS: Album[] = [
  { id: "al1", title: "Leo", artistId: "a1", artistName: "Anirudh Ravichander", releaseYear: 2023, coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80" },
  { id: "al2", title: "Jailer", artistId: "a1", artistName: "Anirudh Ravichander", releaseYear: 2023, coverUrl: "https://images.unsplash.com/photo-1602491453979-04de4d446b85?w=400&auto=format&fit=crop&q=80" },
  { id: "al3", title: "Chithha", artistId: "a2", artistName: "Santhosh Narayanan", releaseYear: 2023, coverUrl: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&auto=format&fit=crop&q=80" },
  { id: "al4", title: "96", artistId: "a3", artistName: "Govind Vasantha", releaseYear: 2018, coverUrl: "https://images.unsplash.com/photo-1488866081807-ed1d4e8157a4?w=400&auto=format&fit=crop&q=80" },
  { id: "al5", title: "Minnale", artistId: "a8", artistName: "Harris Jayaraj", releaseYear: 2001, coverUrl: "https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?w=400&auto=format&fit=crop&q=80" },
  { id: "al6", title: "Thalapathi", artistId: "a6", artistName: "Ilayaraja", releaseYear: 1991, coverUrl: "https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=400&auto=format&fit=crop&q=80" },
  { id: "al7", title: "Murugan Devotional Hits", artistId: "a4", artistName: "Sulamangalam Sisters", releaseYear: 1980, coverUrl: "https://images.unsplash.com/photo-1615412704911-55d589229864?w=400&auto=format&fit=crop&q=80" },
  { id: "al8", title: "Aadukalam", artistId: "a9", artistName: "G. V. Prakash", releaseYear: 2011, coverUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&auto=format&fit=crop&q=80" },
  { id: "al9", title: "Sillunu Oru Kaadhal", artistId: "a5", artistName: "A. R. Rahman", releaseYear: 2006, coverUrl: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=400&auto=format&fit=crop&q=80" },
  { id: "al10", title: "Thunivu", artistId: "a1", artistName: "Anirudh Ravichander", releaseYear: 2023, coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80" },
  { id: "al11", title: "Billa", artistId: "a7", artistName: "Yuvan Shankar Raja", releaseYear: 2007, coverUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&auto=format&fit=crop&q=80" },
  { id: "al12", title: "Anbe Sivam", artistId: "a10", artistName: "Vidyasagar", releaseYear: 2003, coverUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&auto=format&fit=crop&q=80" },
  { id: "al13", title: "Kushi", artistId: "a7", artistName: "Yuvan Shankar Raja", releaseYear: 2000, coverUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&auto=format&fit=crop&q=80" }
];

const INITIAL_SONGS: Song[] = [
  // LATEST TAMIL SONGS
  {
    id: "s1",
    title: "Badass",
    artistId: "a1",
    artistName: "Anirudh Ravichander",
    albumId: "al1",
    albumName: "Leo",
    category: SongCategory.LATEST,
    duration: 228,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80",
    playCount: 15420
  },
  {
    id: "s2",
    title: "Kaavaalaa",
    artistId: "a1",
    artistName: "Anirudh Ravichander",
    albumId: "al2",
    albumName: "Jailer",
    category: SongCategory.LATEST,
    duration: 210,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80",
    playCount: 22450
  },
  {
    id: "s3",
    title: "Chilla Chilla",
    artistId: "a1",
    artistName: "Anirudh Ravichander",
    albumId: "al10",
    albumName: "Thunivu",
    category: SongCategory.LATEST,
    duration: 236,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80",
    playCount: 18900
  },
  // TRENDING TAMIL SONGS
  {
    id: "s4",
    title: "Naa Ready",
    artistId: "a1",
    artistName: "Anirudh Ravichander",
    albumId: "al1",
    albumName: "Leo",
    category: SongCategory.TRENDING,
    duration: 245,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    coverUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&auto=format&fit=crop&q=80",
    playCount: 34100
  },
  {
    id: "s5",
    title: "Hukum - Thalaivar Alappara",
    artistId: "a1",
    artistName: "Anirudh Ravichander",
    albumId: "al2",
    albumName: "Jailer",
    category: SongCategory.TRENDING,
    duration: 202,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    coverUrl: "https://images.unsplash.com/photo-1602491453979-04de4d446b85?w=400&auto=format&fit=crop&q=80",
    playCount: 45290
  },
  {
    id: "s6",
    title: "Bloody Sweet",
    artistId: "a1",
    artistName: "Anirudh Ravichander",
    albumId: "al1",
    albumName: "Leo",
    category: SongCategory.TRENDING,
    duration: 169,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    coverUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&auto=format&fit=crop&q=80",
    playCount: 28950
  },
  // TAMIL LOVE SONGS
  {
    id: "s7",
    title: "Unakku Thaan",
    artistId: "a2",
    artistName: "Santhosh Narayanan",
    albumId: "al3",
    albumName: "Chithha",
    category: SongCategory.LOVE,
    duration: 236,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    coverUrl: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&auto=format&fit=crop&q=80",
    playCount: 18450
  },
  {
    id: "s8",
    title: "Kadhale Kadhale",
    artistId: "a3",
    artistName: "Govind Vasantha",
    albumId: "al4",
    albumName: "96",
    category: SongCategory.LOVE,
    duration: 185,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    coverUrl: "https://images.unsplash.com/photo-1488866081807-ed1d4e8157a4?w=400&auto=format&fit=crop&q=80",
    playCount: 29500
  },
  {
    id: "s9",
    title: "Anbe Sivam",
    artistId: "a10",
    artistName: "Vidyasagar",
    albumId: "al12",
    albumName: "Anbe Sivam",
    category: SongCategory.LOVE,
    duration: 260,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    coverUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&auto=format&fit=crop&q=80",
    playCount: 15400
  },
  // TAMIL MELODY SONGS
  {
    id: "s10",
    title: "Vaseegara",
    artistId: "a8",
    artistName: "Harris Jayaraj",
    albumId: "al5",
    albumName: "Minnale",
    category: SongCategory.MELODY,
    duration: 301,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
    coverUrl: "https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?w=400&auto=format&fit=crop&q=80",
    playCount: 39510
  },
  {
    id: "s11",
    title: "Rakkamma Kaiya Thattu",
    artistId: "a6",
    artistName: "Ilayaraja",
    albumId: "al6",
    albumName: "Thalapathi",
    category: SongCategory.MELODY,
    duration: 285,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
    coverUrl: "https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=400&auto=format&fit=crop&q=80",
    playCount: 12500
  },
  {
    id: "s12",
    title: "Munbe Vaa",
    artistId: "a5",
    artistName: "A. R. Rahman",
    albumId: "al9",
    albumName: "Sillunu Oru Kaadhal",
    category: SongCategory.MELODY,
    duration: 358,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
    coverUrl: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=400&auto=format&fit=crop&q=80",
    playCount: 34120
  },
  // TAMIL MASS SONGS
  {
    id: "s13",
    title: "Aaluma Doluma",
    artistId: "a1",
    artistName: "Anirudh Ravichander",
    albumId: "al2",
    albumName: "Jailer",
    category: SongCategory.MASS,
    duration: 250,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3",
    coverUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&auto=format&fit=crop&q=80",
    playCount: 50890
  },
  {
    id: "s14",
    title: "Neruppu Da",
    artistId: "a2",
    artistName: "Santhosh Narayanan",
    albumId: "al3",
    albumName: "Chithha",
    category: SongCategory.MASS,
    duration: 218,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
    coverUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&auto=format&fit=crop&q=80",
    playCount: 42100
  },
  {
    id: "s15",
    title: "Billa Theme",
    artistId: "a7",
    artistName: "Yuvan Shankar Raja",
    albumId: "al11",
    albumName: "Billa",
    category: SongCategory.MASS,
    duration: 184,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
    coverUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&auto=format&fit=crop&q=80",
    playCount: 38700
  },
  // TAMIL DEVOTIONAL SONGS
  {
    id: "s16",
    title: "Kanda Sashti Kavacham",
    artistId: "a4",
    artistName: "Sulamangalam Sisters",
    albumId: "al7",
    albumName: "Murugan Devotional Hits",
    category: SongCategory.DEVOTIONAL,
    duration: 360,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3",
    coverUrl: "https://images.unsplash.com/photo-1615412704911-55d589229864?w=400&auto=format&fit=crop&q=80",
    playCount: 62400
  },
  {
    id: "s17",
    title: "Maruthamalai Maamani",
    artistId: "a4",
    artistName: "Sulamangalam Sisters",
    albumId: "al7",
    albumName: "Murugan Devotional Hits",
    category: SongCategory.DEVOTIONAL,
    duration: 290,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3",
    coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format&fit=crop&q=80",
    playCount: 31050
  },
  {
    id: "s18",
    title: "Pillayarpatti Herambe",
    artistId: "a6",
    artistName: "Ilayaraja",
    albumId: "al7",
    albumName: "Murugan Devotional Hits",
    category: SongCategory.DEVOTIONAL,
    duration: 310,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-18.mp3",
    coverUrl: "https://images.unsplash.com/photo-1545128485-c400e7702796?w=400&auto=format&fit=crop&q=80",
    playCount: 27400
  },
  // TAMIL FOLK SONGS
  {
    id: "s19",
    title: "Oththa Sollaala",
    artistId: "a9",
    artistName: "G. V. Prakash",
    albumId: "al8",
    albumName: "Aadukalam",
    category: SongCategory.FOLK,
    duration: 239,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-19.mp3",
    coverUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&auto=format&fit=crop&q=80",
    playCount: 19800
  },
  {
    id: "s20",
    title: "Kattipudi Kattipudida",
    artistId: "a7",
    artistName: "Yuvan Shankar Raja",
    albumId: "al13",
    albumName: "Kushi",
    category: SongCategory.FOLK,
    duration: 280,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-20.mp3",
    coverUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&auto=format&fit=crop&q=80",
    playCount: 14500
  }
];

// Helper to read and write db.json
interface LocalDB {
  users: User[];
  playlists: Playlist[];
}

const getDB = (): LocalDB => {
  if (!fs.existsSync(DB_FILE)) {
    const defaultDB: LocalDB = {
      users: [],
      playlists: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2), "utf-8");
    return defaultDB;
  }
  try {
    const content = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading database file, resetting:", err);
    return { users: [], playlists: [] };
  }
};

const saveDB = (db: LocalDB) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
};

// Simple custom auth token validator middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access: Token missing" });
  }
  const token = authHeader.split(" ")[1];
  const db = getDB();
  // Simplified session validation: the token is the user's ID
  const user = db.users.find(u => u.id === token);
  if (!user) {
    return res.status(401).json({ error: "Invalid token or session expired" });
  }
  (req as any).user = user;
  next();
};

// ==================== REST APIs ====================

// Register API
app.post("/api/auth/register", (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Please fill out all fields: Name, Email, Password" });
  }

  const db = getDB();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "An account with this email already exists" });
  }

  const newUser: User = {
    id: "user_" + Math.random().toString(36).substr(2, 9),
    email: email.toLowerCase(),
    password: password, // For simplicity, we are keeping plain passwords for this demo DB
    name: name,
    bio: "Tamil music lover! Listening to beautiful melodies and mass hits.",
    favoriteGenres: ["Melody", "Mass", "Love"],
    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  
  // Auto-generate default Favorite Playlist for the registered user
  const favoritePlaylist: Playlist = {
    id: "pl_fav_" + newUser.id,
    userId: newUser.id,
    name: "My Favorites ❤️",
    description: "Your absolute favorite Tamil tracks.",
    songIds: ["s1", "s6", "s7"], // Give some default starting songs
    createdAt: new Date().toISOString()
  };
  
  db.playlists.push(favoritePlaylist);
  saveDB(db);

  // Exclude password in response
  const { password: _, ...userSafe } = newUser;
  res.status(201).json({
    user: userSafe,
    token: newUser.id
  });
});

// Login API
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Please enter both Email and Password" });
  }

  const db = getDB();
  const user = db.users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(400).json({ error: "Invalid Email or Password. Please try again." });
  }

  const { password: _, ...userSafe } = user;
  res.json({
    user: userSafe,
    token: user.id
  });
});

// Get logged-in user profile
app.get("/api/auth/me", authenticate, (req, res) => {
  const user = (req as any).user;
  const { password: _, ...userSafe } = user;
  res.json(userSafe);
});

// Update profile API
app.put("/api/users/profile", authenticate, (req, res) => {
  const currentUser = (req as any).user;
  const { name, bio, favoriteGenres, avatarUrl } = req.body;

  const db = getDB();
  const userIdx = db.users.findIndex(u => u.id === currentUser.id);

  if (userIdx === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  if (name) db.users[userIdx].name = name;
  if (bio !== undefined) db.users[userIdx].bio = bio;
  if (favoriteGenres) db.users[userIdx].favoriteGenres = favoriteGenres;
  if (avatarUrl) db.users[userIdx].avatarUrl = avatarUrl;

  saveDB(db);

  const { password: _, ...userSafe } = db.users[userIdx];
  res.json(userSafe);
});

// Get songs API with searching & filtering
app.get("/api/songs", (req, res) => {
  const { category, search } = req.query;
  let filtered = [...INITIAL_SONGS];

  if (category) {
    filtered = filtered.filter(s => s.category.toLowerCase() === String(category).toLowerCase());
  }

  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.artistName.toLowerCase().includes(q) ||
        s.albumName.toLowerCase().includes(q)
    );
  }

  res.json(filtered);
});

// Get all Artists API
app.get("/api/artists", (req, res) => {
  res.json(INITIAL_ARTISTS);
});

// Get all Albums API
app.get("/api/albums", (req, res) => {
  res.json(INITIAL_ALBUMS);
});

// Get Playlists for authenticated user
app.get("/api/playlists", authenticate, (req, res) => {
  const user = (req as any).user;
  const db = getDB();
  const userPlaylists = db.playlists.filter(p => p.userId === user.id);
  res.json(userPlaylists);
});

// Create Playlist
app.post("/api/playlists", authenticate, (req, res) => {
  const user = (req as any).user;
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Playlist name is required" });
  }

  const db = getDB();
  const newPlaylist: Playlist = {
    id: "pl_" + Math.random().toString(36).substr(2, 9),
    userId: user.id,
    name,
    description: description || "Custom curated Tamil music playlist",
    songIds: [],
    createdAt: new Date().toISOString()
  };

  db.playlists.push(newPlaylist);
  saveDB(db);
  res.status(201).json(newPlaylist);
});

// Delete Playlist
app.delete("/api/playlists/:id", authenticate, (req, res) => {
  const user = (req as any).user;
  const playlistId = req.params.id;

  const db = getDB();
  const index = db.playlists.findIndex(p => p.id === playlistId && p.userId === user.id);

  if (index === -1) {
    return res.status(404).json({ error: "Playlist not found or access denied" });
  }

  db.playlists.splice(index, 1);
  saveDB(db);
  res.json({ message: "Playlist deleted successfully" });
});

// Add Song to Playlist
app.post("/api/playlists/:id/songs", authenticate, (req, res) => {
  const user = (req as any).user;
  const playlistId = req.params.id;
  const { songId } = req.body;

  if (!songId) {
    return res.status(400).json({ error: "Song ID is required" });
  }

  const db = getDB();
  const playlistIdx = db.playlists.findIndex(p => p.id === playlistId && p.userId === user.id);

  if (playlistIdx === -1) {
    return res.status(404).json({ error: "Playlist not found or access denied" });
  }

  // Check if song exists in static songs database
  const songExists = INITIAL_SONGS.some(s => s.id === songId);
  if (!songExists) {
    return res.status(404).json({ error: "Selected song does not exist" });
  }

  const playlist = db.playlists[playlistIdx];
  if (playlist.songIds.includes(songId)) {
    return res.status(400).json({ error: "This song is already in your playlist" });
  }

  playlist.songIds.push(songId);
  saveDB(db);
  res.json(playlist);
});

// Remove Song from Playlist
app.delete("/api/playlists/:id/songs/:songId", authenticate, (req, res) => {
  const user = (req as any).user;
  const playlistId = req.params.id;
  const songId = req.params.songId;

  const db = getDB();
  const playlistIdx = db.playlists.findIndex(p => p.id === playlistId && p.userId === user.id);

  if (playlistIdx === -1) {
    return res.status(404).json({ error: "Playlist not found or access denied" });
  }

  const playlist = db.playlists[playlistIdx];
  const songIdx = playlist.songIds.indexOf(songId);

  if (songIdx === -1) {
    return res.status(404).json({ error: "Song is not in this playlist" });
  }

  playlist.songIds.splice(songIdx, 1);
  saveDB(db);
  res.json(playlist);
});

// Increment Song Playcount API (Dynamic increment)
app.post("/api/songs/:id/play", (req, res) => {
  const songId = req.params.id;
  const song = INITIAL_SONGS.find(s => s.id === songId);
  if (song) {
    song.playCount += 1;
    return res.json({ success: true, playCount: song.playCount });
  }
  res.status(404).json({ error: "Song not found" });
});

// ==================== VITE MIDDLEWARE SETUP ====================

// Check for production vs development mode
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Start Server on host 0.0.0.0 and Port 3000
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Tamil Music Streaming backend running at http://0.0.0.0:${PORT}`);
});
