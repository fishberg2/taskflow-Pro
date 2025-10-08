import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';
import { College, ComparisonAnalysis } from '../models/college.model';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  // State signals
  colleges = signal<College[]>([]);
  comparisonAnalysis = signal<ComparisonAnalysis | null>(null);
  loading = signal<boolean>(false);
  loadingComparison = signal<boolean>(false);
  error = signal<string | null>(null);

  async findColleges(job: string, location: string): Promise<void> {
    const prompt = `Find colleges in or near ${location} that have strong programs for a career in ${job}. For each college, provide its name, city, state, acceptance rate as a number, estimated annual cost, a short description, and a reason why it's a good fit for this career.`;

    this.loading.set(true);
    this.error.set(null);
    this.colleges.set([]);
    this.comparisonAnalysis.set(null);

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: 'The name of the college.' },
                city: { type: Type.STRING, description: 'The city where the college is located.' },
                state: { type: Type.STRING, description: 'The state where the college is located.' },
                acceptanceRate: { type: Type.NUMBER, description: 'Acceptance rate as a percentage (e.g., 75 for 75%).' },
                annualCost: { type: Type.NUMBER, description: 'Estimated annual cost in USD.' },
                description: { type: Type.STRING, description: 'A short description of the college.' },
                reasonForFit: { type: Type.STRING, description: 'A brief explanation of why this college is a good choice for the specified career.' }
              },
              required: ['name', 'city', 'state', 'acceptanceRate', 'annualCost', 'description', 'reasonForFit']
            }
          }
        }
      });

      const jsonString = response.text.trim();
      if (!jsonString) {
        throw new Error("Received empty response from API.");
      }
      const colleges: College[] = JSON.parse(jsonString);
      this.colleges.set(colleges);
    } catch (e) {
      console.error(e);
      this.error.set('An error occurred while fetching college data. The AI may have returned an invalid response. Please try a different query.');
    } finally {
      this.loading.set(false);
    }
  }

  async compareColleges(colleges: College[], job: string): Promise<void> {
    if (colleges.length < 2) return;

    const collegeList = colleges.map(c => `- ${c.name} (Annual Cost: $${c.annualCost.toLocaleString()}, Acceptance Rate: ${c.acceptanceRate}%)`).join('\n');
    const prompt = `
      Analyze and compare the following colleges for a student pursuing a career in "${job}":
      ${collegeList}

      For each college, provide a short list of pros and cons. 
      Finally, provide a concluding recommendation for which college is the best overall choice and why.
    `;

    this.loadingComparison.set(true);
    this.error.set(null);
    this.comparisonAnalysis.set(null);

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              comparison: {
                type: Type.ARRAY,
                description: "List of colleges with their pros and cons.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Name of the college." },
                    pros: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of pros for this college." },
                    cons: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of cons for this college." },
                  },
                  required: ["name", "pros", "cons"]
                }
              },
              recommendation: {
                type: Type.STRING,
                description: "The final recommendation and reasoning."
              }
            },
            required: ["comparison", "recommendation"]
          }
        }
      });

      const jsonString = response.text.trim();
      if (!jsonString) {
        throw new Error("Received empty comparison response from API.");
      }
      
      const analysis: ComparisonAnalysis = JSON.parse(jsonString);
      this.comparisonAnalysis.set(analysis);

    } catch (e) {
      console.error(e);
      this.error.set('An error occurred during the comparison. The AI may have returned an invalid response.');
    } finally {
      this.loadingComparison.set(false);
    }
  }
}