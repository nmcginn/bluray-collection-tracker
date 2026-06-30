-- Owned Blu-ray titles. One row per movie; imdb_id prevents duplicates.
CREATE TABLE movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  imdb_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  year TEXT,
  rated TEXT,
  runtime TEXT,
  genre TEXT,
  director TEXT,
  actors TEXT,
  plot TEXT,
  poster_url TEXT,
  imdb_rating TEXT,
  barcode TEXT,
  added_at TEXT NOT NULL
);

CREATE INDEX idx_movies_title ON movies(title);
