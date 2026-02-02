/**
 * Weekly Review Generator - Auto-generates weekly summaries
 * 
 * Usage:
 *   const reviewer = new WeeklyReviewGenerator();
 *   await reviewer.generate();
 * 
 * Features:
 * - Summarizes project progress
 * - Lists completed tasks
 * - Highlights research done
 * - Content created/published
 * - Sets intentions for next week
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class WeeklyReviewGenerator {
  constructor(options = {}) {
    this.config = options.config || this.loadConfig();
    this.basePath = options.basePath || path.join(__dirname, '../..');
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, '../config/default.json');
      return JSON.parse(require('fs').readFileSync(configPath, 'utf-8'));
    } catch {
      return {
        llm: { provider: 'ollama', model: 'llama3:8b', baseUrl: 'http://localhost:11434' }
      };
    }
  }

  /**
   * Generate weekly review
   */
  async generate() {
    console.log('📊 Generating weekly review...');
    
    const weekStart = this.getWeekStart();
    const weekEnd = new Date();
    
    // Gather data from all sources
    const data = await this.gatherData();
    
    console.log(`  Projects: ${data.projects.active} active, ${data.projects.completed} completed`);
    console.log(`  Tasks: ${data.tasks.completed} completed, ${data.tasks.pending} pending`);
    console.log(`  Research: ${data.research.topics} topics`);
    console.log(`  Content: ${data.content.pieces} pieces`);
    
    // Generate summary using LLM
    const summary = await this.generateSummary(data);
    
    // Format the review
    const review = this.formatReview(weekStart, weekEnd, data, summary);
    
    // Save to WEEKLY-REVIEW.md
    await this.saveReview(review, weekStart);
    
    console.log(`✅ Weekly review saved!`);
    
    return { data, summary, review };
  }

  getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  async gatherData() {
    const data = {
      projects: { active: 0, completed: 0, blocked: 0, items: [] },
      tasks: { completed: 0, pending: 0, items: [] },
      research: { topics: 0, items: [] },
      content: { pieces: 0, items: [] },
      clients: { activities: 0, items: [] }
    };

    // Read PROJECTS.md
    try {
      const projects = await fs.readFile(path.join(this.basePath, 'PROJECTS.md'), 'utf-8');
      data.projects.active = (projects.match(/🟢|🟡/g) || []).length;
      data.projects.completed = (projects.match(/✅/g) || []).length;
      data.projects.blocked = (projects.match(/🟠/g) || []).length;
      
      // Extract project names
      const projectMatches = projects.matchAll(/\[([^\]]+)\]\([^)]+\)\s*\|\s*(🟢|🟡|✅|🟠|🔵|⚪)/g);
      for (const match of projectMatches) {
        data.projects.items.push({ name: match[1], status: match[2] });
      }
    } catch {}

    // Read CAPTURE.md for tasks
    try {
      const capture = await fs.readFile(path.join(this.basePath, 'CAPTURE.md'), 'utf-8');
      const completedTasks = capture.match(/- \[x\] (.+)/g) || [];
      const pendingTasks = capture.match(/- \[ \] (.+)/g) || [];
      
      data.tasks.completed = completedTasks.length;
      data.tasks.pending = pendingTasks.length;
      data.tasks.items = completedTasks.map(t => t.replace('- [x] ', ''));
    } catch {}

    // Read RESEARCH.md
    try {
      const research = await fs.readFile(path.join(this.basePath, 'RESEARCH.md'), 'utf-8');
      const topics = research.match(/## [^#\n]+/g) || [];
      data.research.topics = topics.filter(t => !t.includes('To Research')).length;
      data.research.items = topics.slice(0, 5).map(t => t.replace('## ', ''));
    } catch {}

    // Read CONTENT.md
    try {
      const content = await fs.readFile(path.join(this.basePath, 'CONTENT.md'), 'utf-8');
      const pieces = content.match(/### [^#\n]+/g) || [];
      data.content.pieces = pieces.length;
      data.content.items = pieces.slice(0, 5).map(t => t.replace('### ', ''));
    } catch {}

    // Read CLIENTS.md
    try {
      const clients = await fs.readFile(path.join(this.basePath, 'CLIENTS.md'), 'utf-8');
      const activities = clients.match(/^\d{4}-\d{2}-\d{2}:/gm) || [];
      data.clients.activities = activities.length;
    } catch {}

    return data;
  }

  async generateSummary(data) {
    const prompt = `Generate a brief weekly review summary based on this data:

PROJECTS:
- Active: ${data.projects.active}
- Completed this period: ${data.projects.completed}
- Blocked: ${data.projects.blocked}
${data.projects.items.length > 0 ? `- Projects: ${data.projects.items.map(p => `${p.name} (${p.status})`).join(', ')}` : ''}

TASKS:
- Completed: ${data.tasks.completed}
- Pending: ${data.tasks.pending}
${data.tasks.items.length > 0 ? `- Completed tasks: ${data.tasks.items.slice(0, 5).join(', ')}` : ''}

RESEARCH:
- Topics explored: ${data.research.topics}
${data.research.items.length > 0 ? `- Topics: ${data.research.items.join(', ')}` : ''}

CONTENT:
- Pieces created: ${data.content.pieces}
${data.content.items.length > 0 ? `- Content: ${data.content.items.join(', ')}` : ''}

CLIENT ACTIVITIES: ${data.clients.activities}

Write a 3-4 sentence executive summary of the week. Be specific about accomplishments and note any areas needing attention. Then suggest 2-3 focus areas for next week.

Format:
## Summary
[Executive summary]

## Focus for Next Week
- [Focus 1]
- [Focus 2]
- [Focus 3]`;

    return await this.callLLM(prompt);
  }

  formatReview(weekStart, weekEnd, data, summary) {
    const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    return `# Weekly Review: ${startStr} - ${endStr}

${summary}

---

## 📊 By the Numbers

| Metric | Count |
|--------|-------|
| Active Projects | ${data.projects.active} |
| Completed Projects | ${data.projects.completed} |
| Tasks Completed | ${data.tasks.completed} |
| Tasks Pending | ${data.tasks.pending} |
| Research Topics | ${data.research.topics} |
| Content Pieces | ${data.content.pieces} |
| Client Activities | ${data.clients.activities} |

## ✅ Completed Tasks
${data.tasks.items.length > 0 ? data.tasks.items.map(t => `- ${t}`).join('\n') : '- (none recorded)'}

## 🔬 Research Done
${data.research.items.length > 0 ? data.research.items.map(t => `- ${t}`).join('\n') : '- (none this week)'}

## 📝 Content Created
${data.content.items.length > 0 ? data.content.items.map(t => `- ${t}`).join('\n') : '- (none this week)'}

---

*Generated: ${new Date().toISOString()}*
`;
  }

  async saveReview(review, weekStart) {
    const reviewPath = path.join(this.basePath, 'WEEKLY-REVIEW.md');
    
    let content;
    try {
      content = await fs.readFile(reviewPath, 'utf-8');
    } catch {
      content = `# Weekly Reviews

Archive of weekly reviews and reflections.

---

`;
    }

    // Add new review after header
    const dividerIndex = content.indexOf('---');
    if (dividerIndex !== -1) {
      content = content.slice(0, dividerIndex + 4) + '\n\n' + review + '\n---\n' + content.slice(dividerIndex + 4);
    } else {
      content += '\n' + review;
    }

    await fs.writeFile(reviewPath, content);
  }

  async callLLM(prompt) {
    const { provider, model, baseUrl } = this.config.llm;

    if (provider === 'ollama') {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: { temperature: 0.7 }
        })
      });

      const data = await response.json();
      return data.response || '';
    }

    throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

export default WeeklyReviewGenerator;
