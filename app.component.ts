
import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, GenerationOptions } from './services/gemini.service';
import { SupabaseService, GenerationRecord } from './services/supabase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
})
export class AppComponent {
  private geminiService = inject(GeminiService);
  private supabaseService = inject(SupabaseService);

  // UI State
  activeTab = signal<'create' | 'history'>('create');
  
  // Form State
  prompt = signal('');
  selectedLanguage = signal('Kurdish (Sorani)');
  selectedType = signal('Essay');
  selectedTone = signal('Formal');
  selectedLength = signal('Medium');
  
  // Feature Toggles
  useSearch = signal(false);
  useThinking = signal(false);

  // App State
  isLoading = signal(false);
  generatedText = signal('');
  groundingMetadata = signal<any[]>([]);
  error = signal<string | null>(null);
  
  // Save/History State
  isSaving = signal(false);
  isLoadingHistory = signal(false);
  saveStatus = signal<'idle' | 'success' | 'error'>('idle');
  historyItems = signal<GenerationRecord[]>([]);

  constructor() {
    this.loadHistory();
  }

  // Computed
  isRTL = computed(() => {
    const lang = this.selectedLanguage();
    return lang.includes('Kurdish') || lang === 'Arabic';
  });

  languages = ['English', 'Kurdish (Sorani)', 'Kurdish (Badini)', 'Arabic', 'Spanish', 'French'];
  types = ['Essay', 'Story', 'Script', 'Academic Report', 'Email', 'Social Media Post', 'Poetry', 'Copywriting', 'Summarization'];
  tones = ['Formal', 'Humorous', 'Emotional', 'Motivational', 'Scientific', 'Casual'];
  lengths = ['Short', 'Medium', 'Long'];

  async loadHistory() {
    this.isLoadingHistory.set(true);
    try {
      const data = await this.supabaseService.getGenerations();
      this.historyItems.set(data || []);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      this.isLoadingHistory.set(false);
    }
  }

  async onGenerate() {
    if (!this.prompt().trim()) return;

    this.isLoading.set(true);
    this.error.set(null);
    this.generatedText.set('');
    this.groundingMetadata.set([]);
    this.saveStatus.set('idle'); 
    
    // Switch to create tab if not already
    this.activeTab.set('create');

    const options: GenerationOptions = {
      prompt: this.prompt(),
      language: this.selectedLanguage(),
      type: this.selectedType(),
      tone: this.selectedTone(),
      length: this.selectedLength(),
      useSearch: this.useSearch(),
      useThinking: this.useThinking()
    };

    try {
      const response = await this.geminiService.generateText(options);
      
      const text = response.text || 'No text generated.';
      this.generatedText.set(text);

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        this.groundingMetadata.set(chunks);
      }

    } catch (err: any) {
      this.error.set('An error occurred while generating content. Please try again.');
      console.error(err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSave() {
    if (!this.generatedText()) return;

    this.isSaving.set(true);
    this.saveStatus.set('idle');
    
    try {
      await this.supabaseService.saveGeneration({
        prompt: this.prompt(),
        content: this.generatedText(),
        language: this.selectedLanguage(),
        type: this.selectedType(),
        tone: this.selectedTone()
      });

      this.saveStatus.set('success');
      this.loadHistory(); // Refresh history from server
      
      setTimeout(() => {
        this.saveStatus.set('idle');
      }, 3000);
      
    } catch (err) {
      this.saveStatus.set('error');
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteHistoryItem(id: string | undefined, event: Event) {
    event.stopPropagation();
    if (!id) return;
    
    if(confirm('Are you sure you want to delete this item?')) {
      try {
        // Optimistic update
        this.historyItems.update(items => items.filter(i => i.id !== id));
        
        await this.supabaseService.deleteGeneration(id);
      } catch (err) {
        alert('Failed to delete item');
        this.loadHistory(); // Revert on error
      }
    }
  }

  loadHistoryItem(item: GenerationRecord) {
    this.prompt.set(item.prompt);
    this.generatedText.set(item.content);
    this.selectedLanguage.set(item.language);
    this.selectedType.set(item.type);
    this.selectedTone.set(item.tone);
    this.activeTab.set('create');
    this.groundingMetadata.set([]);
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.generatedText());
  }
}
