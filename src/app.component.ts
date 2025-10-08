import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { GeminiService } from './services/gemini.service';
import { College } from './models/college.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  geminiService = inject(GeminiService);

  // Component state signals
  job = signal('');
  location = signal('');
  savedColleges = signal<College[]>([]);

  // Derived state
  isCollegeSaved = computed(() => {
    const savedNames = new Set(this.savedColleges().map(c => c.name));
    return (college: College) => savedNames.has(college.name);
  });

  canCompare = computed(() => this.savedColleges().length >= 2);

  // UI state
  showComparison = signal(false);

  // Method to handle search
  findColleges() {
    if (this.job() && this.location()) {
      this.showComparison.set(false);
      this.geminiService.findColleges(this.job(), this.location());
    }
  }

  // Methods to manage saved colleges
  toggleSaveCollege(college: College) {
    if (this.isCollegeSaved()(college)) {
      this.savedColleges.update(colleges => colleges.filter(c => c.name !== college.name));
    } else {
      this.savedColleges.update(colleges => [...colleges, college]);
    }
  }

  // Method for comparison
  getComparison() {
    this.geminiService.compareColleges(this.savedColleges(), this.job());
    this.showComparison.set(true);
  }
}