
import { Injectable } from '@angular/core';

export interface SavedItem {
  id: string;
  timestamp: number;
  prompt: string;
  content: string;
  language: string;
  type: string;
  tone: string;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly KEY = 'omniwriter_history_v1';

  getHistory(): SavedItem[] {
    const data = localStorage.getItem(this.KEY);
    return data ? JSON.parse(data) : [];
  }

  saveItem(item: Omit<SavedItem, 'id' | 'timestamp'>): void {
    const history = this.getHistory();
    const newItem: SavedItem = {
      ...item,
      id: crypto.randomUUID(), // Generate unique ID
      timestamp: Date.now()
    };
    // Add to beginning of array
    history.unshift(newItem);
    this.saveToDisk(history);
  }

  deleteItem(id: string): void {
    const history = this.getHistory().filter(i => i.id !== id);
    this.saveToDisk(history);
  }

  private saveToDisk(history: SavedItem[]) {
    // Limit history to 50 items to keep it light
    const trimmedHistory = history.slice(0, 50);
    localStorage.setItem(this.KEY, JSON.stringify(trimmedHistory));
  }
}
