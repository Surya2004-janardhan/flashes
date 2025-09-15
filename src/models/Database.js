import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

class Database {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DATABASE_PATH || './data/posts.db';
  }

  async init() {
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const createPostsTable = `
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        hashtags TEXT,
        image_path TEXT,
        news_url TEXT,
        platform TEXT NOT NULL,
        posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        content_hash TEXT UNIQUE
      )
    `;

    const createNewsTable = `
      CREATE TABLE IF NOT EXISTS processed_news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        news_url TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createPostsTable);
        this.db.run(createNewsTable, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async insertPost(postData) {
    const { title, content, hashtags, imagePath, newsUrl, platform, contentHash } = postData;
    
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO posts (title, content, hashtags, image_path, news_url, platform, content_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([title, content, hashtags, imagePath, newsUrl, platform, contentHash], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
      
      stmt.finalize();
    });
  }

  async updatePostStatus(id, status, errorMessage = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE posts SET status = ?, error_message = ? WHERE id = ?',
        [status, errorMessage, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  async isNewsProcessed(newsUrl) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id FROM processed_news WHERE news_url = ?',
        [newsUrl],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  }

  async markNewsAsProcessed(newsUrl, title) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR IGNORE INTO processed_news (news_url, title) VALUES (?, ?)',
        [newsUrl, title],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async isContentDuplicate(contentHash) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id FROM posts WHERE content_hash = ?',
        [contentHash],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  }

  async getRecentPosts(hours = 24) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM posts 
         WHERE posted_at > datetime('now', '-${hours} hours')
         ORDER BY posted_at DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close(resolve);
      });
    }
  }
}

export default Database;