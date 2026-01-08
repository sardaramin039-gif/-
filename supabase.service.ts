
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface GenerationRecord {
  id?: string;
  created_at?: string;
  prompt: string;
  content: string;
  language: string;
  type: string;
  tone: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private readonly LOCAL_STORAGE_KEY = 'omniwriter_history_fallback';

  // Credentials provided by the user
  // If connection fails, this service will automatically fall back to Local Storage.
  private readonly supabaseUrl = 'https://akuunovwjyqomjfvhhtg.supabase.co';
  private readonly supabaseKey = 'sb_publishable_U8tdfO45cwZeRywNvX-76w_d6b2RNRt';

  constructor() {
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    console.log('Supabase client initialized (with fallback support)');
  }

  // Save a new text
  async saveGeneration(record: Omit<GenerationRecord, 'id' | 'created_at'>) {
    try {
      const { data, error } = await this.supabase
        .from('generations')
        .insert([record])
        .select();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase save failed (falling back to Local Storage):', err);
      return this.saveToLocalStorage(record);
    }
  }

  // Get history list
  async getGenerations() {
    try {
      const { data, error } = await this.supabase
        .from('generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as GenerationRecord[];
    } catch (err) {
      console.warn('Supabase fetch failed (falling back to Local Storage):', err);
      return this.getFromLocalStorage();
    }
  }

  // Delete an item
  async deleteGeneration(id: string) {
    try {
      const { error } = await this.supabase
        .from('generations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase delete failed (checking Local Storage):', err);
      this.deleteFromLocalStorage(id);
    }
  }

  // --- Local Storage Fallback Implementation ---

  private getFromLocalStorage(): GenerationRecord[] {
    try {
      const data = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  private saveToLocalStorage(record: Omit<GenerationRecord, 'id' | 'created_at'>) {
    const history = this.getFromLocalStorage();
    const newItem: GenerationRecord = {
      ...record,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    // Add to beginning
    history.unshift(newItem);
    // Keep only last 50
    const trimmed = history.slice(0, 50);
    localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
    return [newItem]; // Return as array to match Supabase response format
  }

  private deleteFromLocalStorage(id: string) {
    const history = this.getFromLocalStorage().filter(item => item.id !== id);
    localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(history));
  }
}
