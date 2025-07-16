import { promises as fs } from "fs";
import * as path from "path";
import { MemoryVectorStore } from "./memoryVectorStore.js";
import type { VectorEntry } from "./vectorStore.js";

interface StoredData {
  version: string;
  entries: VectorEntry[];
  lastUpdated: number;
}

export class FileVectorStore extends MemoryVectorStore {
  private filePath: string;
  private version = "1.0.0";
  private autoSave: boolean;

  constructor(filePath: string, autoSave = true) {
    super();
    this.filePath = filePath;
    this.autoSave = autoSave;
  }

  async add(entry: VectorEntry): Promise<void> {
    await super.add(entry);
    if (this.autoSave) {
      await this.persist();
    }
  }

  async addBatch(entries: VectorEntry[]): Promise<void> {
    await super.addBatch(entries);
    if (this.autoSave) {
      await this.persist();
    }
  }

  async update(id: string, entry: VectorEntry): Promise<void> {
    await super.update(id, entry);
    if (this.autoSave) {
      await this.persist();
    }
  }

  async remove(id: string): Promise<void> {
    await super.remove(id);
    if (this.autoSave) {
      await this.persist();
    }
  }

  async removeBatch(ids: string[]): Promise<void> {
    await super.removeBatch(ids);
    if (this.autoSave) {
      await this.persist();
    }
  }

  async clear(): Promise<void> {
    await super.clear();
    if (this.autoSave) {
      await this.persist();
    }
  }

  async persist(): Promise<void> {
    const dir = path.dirname(this.filePath);

    // Ensure directory exists
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
    }

    const data: StoredData = {
      version: this.version,
      entries: await this.getAllEntries(),
      lastUpdated: Date.now(),
    };

    // Write to temp file first for atomicity
    const tempPath = `${this.filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2));

    // Rename to actual file (atomic on most filesystems)
    await fs.rename(tempPath, this.filePath);
  }

  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.filePath, "utf-8");
      const data = JSON.parse(content) as StoredData;

      // Check version compatibility
      if (data.version !== this.version) {
        // Version mismatch, but we'll try to load anyway
        // In the future, we might want to handle migrations here
      }

      // Clear and reload
      await super.clear();
      if (data.entries && Array.isArray(data.entries)) {
        for (const entry of data.entries) {
          // Validate entry structure
          if (entry.vector && entry.metadata && entry.metadata.id) {
            await super.add(entry);
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // File doesn't exist yet, that's fine
        return;
      }
      throw error;
    }
  }

  /**
   * Get file stats (size, last modified)
   */
  async getFileStats(): Promise<{ size: number; modified: Date } | null> {
    try {
      const stats = await fs.stat(this.filePath);
      return {
        size: stats.size,
        modified: stats.mtime,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a backup of the store
   */
  async backup(backupPath?: string): Promise<string> {
    const actualBackupPath =
      backupPath || `${this.filePath}.backup.${Date.now()}`;

    try {
      await fs.copyFile(this.filePath, actualBackupPath);
      return actualBackupPath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error("No store file to backup");
      }
      throw error;
    }
  }

  /**
   * Restore from a backup
   */
  async restore(backupPath: string): Promise<void> {
    await fs.copyFile(backupPath, this.filePath);
    await this.load();
  }
}
