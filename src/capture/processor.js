/**
 * Capture Processor - Process and route captured items
 * 
 * Usage:
 *   const processor = new CaptureProcessor();
 *   await processor.process(); // Process all pending items
 * 
 * Features:
 * - Reads items from CAPTURE.md
 * - Auto-categorizes using LLM
 * - Routes to appropriate files (projects, research, content, clients)
 * - Marks items as processed
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class CaptureProcessor {
  constructor(options = {}) {
    this.config = options.config || this.loadConfig();
    this.basePath = options.basePath || path.join(__dirname, '../..');
    this.capturePath = path.join(this.basePath, 'CAPTURE.md');
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
   * Process all pending captured items
   */
  async process() {
    console.log('📥 Processing capture inbox...');
    
    const items = await this.getPendingItems();
    
    if (items.length === 0) {
      console.log('✨ Inbox is clear!');
      return { processed: 0, items: [] };
    }

    console.log(`Found ${items.length} items to process`);
    
    const results = [];
    for (const item of items) {
      try {
        const result = await this.processItem(item);
        results.push(result);
        console.log(`  ✓ "${item.text.slice(0, 40)}..." → ${result.category}`);
      } catch (error) {
        console.log(`  ✗ "${item.text.slice(0, 40)}..." - ${error.message}`);
        results.push({ item, error: error.message });
      }
    }

    // Update CAPTURE.md to mark items as processed
    await this.markProcessed(results.filter(r => !r.error));
    
    console.log(`\n✅ Processed ${results.filter(r => !r.error).length}/${items.length} items`);
    
    return { processed: results.filter(r => !r.error).length, items: results };
  }

  async getPendingItems() {
    let content;
    try {
      content = await fs.readFile(this.capturePath, 'utf-8');
    } catch {
      return [];
    }

    const items = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match unchecked items: - [ ] text
      const match = line.match(/^- \[ \] (.+)$/);
      if (match) {
        items.push({
          text: match[1],
          line: i,
          raw: line
        });
      }
    }

    return items;
  }

  async processItem(item) {
    // Categorize the item
    const category = await this.categorize(item.text);
    
    // Route to appropriate destination
    await this.route(item, category);
    
    return {
      item,
      category,
      processedAt: new Date().toISOString()
    };
  }

  async categorize(text) {
    const prompt = `Categorize this captured item into ONE of these categories:

ITEM: "${text}"

CATEGORIES:
- task: Actionable to-do item (something to do)
- project: A larger initiative or project idea
- research: Something to research or learn about
- content: Content idea (blog, video, social media)
- client: Client-related note or follow-up
- reference: Useful info to save for later
- idea: General idea or thought to remember

Reply with ONLY the category name, nothing else.`;

    const response = await this.callLLM(prompt);
    const category = response.trim().toLowerCase();
    
    const validCategories = ['task', 'project', 'research', 'content', 'client', 'reference', 'idea'];
    return validCategories.includes(category) ? category : 'reference';
  }

  async route(item, category) {
    const date = new Date().toISOString().split('T')[0];
    
    const routes = {
      task: {
        file: 'CAPTURE.md',
        action: 'keep', // Tasks stay in capture as a checklist
        format: (text) => `- [ ] ${text}`
      },
      project: {
        file: 'PROJECTS.md',
        section: '## Ideas',
        format: (text) => `- 🔵 **${text}** - Added ${date}`
      },
      research: {
        file: 'RESEARCH.md',
        section: '## To Research',
        format: (text) => `- [ ] ${text} (added ${date})`
      },
      content: {
        file: 'CONTENT.md',
        section: '## Ideas',
        format: (text) => `- [ ] ${text} (added ${date})`
      },
      client: {
        file: 'CLIENTS.md',
        section: '## Notes',
        format: (text) => `- ${date}: ${text}`
      },
      reference: {
        file: 'CAPTURE.md',
        section: '## Reference',
        format: (text) => `- ${text}`
      },
      idea: {
        file: 'CAPTURE.md',
        section: '## Ideas',
        format: (text) => `- 💡 ${text}`
      }
    };

    const route = routes[category];
    
    // If action is 'keep', don't move the item
    if (route.action === 'keep') {
      return;
    }

    // Add to destination file
    await this.addToFile(
      path.join(this.basePath, route.file),
      route.section,
      route.format(item.text)
    );
  }

  async addToFile(filePath, section, content) {
    let fileContent;
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
    } catch {
      fileContent = `# ${path.basename(filePath, '.md')}\n\n`;
    }

    // Find or create section
    const sectionIndex = fileContent.indexOf(section);
    
    if (sectionIndex !== -1) {
      // Add after section header
      const nextLineIndex = fileContent.indexOf('\n', sectionIndex) + 1;
      fileContent = fileContent.slice(0, nextLineIndex) + content + '\n' + fileContent.slice(nextLineIndex);
    } else {
      // Add section at end
      fileContent += `\n${section}\n\n${content}\n`;
    }

    await fs.writeFile(filePath, fileContent);
  }

  async markProcessed(results) {
    let content = await fs.readFile(this.capturePath, 'utf-8');
    const lines = content.split('\n');
    
    // Mark processed items (change [ ] to [x] for non-task items)
    for (const result of results) {
      if (result.category !== 'task') {
        const lineIndex = result.item.line;
        if (lines[lineIndex]) {
          lines[lineIndex] = lines[lineIndex].replace('- [ ]', '- [x]');
        }
      }
    }

    await fs.writeFile(this.capturePath, lines.join('\n'));
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
          options: { temperature: 0.3 } // Lower temp for classification
        })
      });

      const data = await response.json();
      return data.response || '';
    }

    throw new Error(`Unsupported LLM provider: ${provider}`);
  }

  /**
   * Add a new item to capture
   */
  async capture(text) {
    let content;
    try {
      content = await fs.readFile(this.capturePath, 'utf-8');
    } catch {
      content = `# Capture Inbox

Quick capture for ideas, tasks, and notes. Process regularly.

## Inbox

`;
    }

    // Add to inbox section
    const inboxIndex = content.indexOf('## Inbox');
    if (inboxIndex !== -1) {
      const nextLineIndex = content.indexOf('\n', inboxIndex) + 1;
      content = content.slice(0, nextLineIndex) + `\n- [ ] ${text}` + content.slice(nextLineIndex);
    } else {
      content += `\n## Inbox\n\n- [ ] ${text}\n`;
    }

    await fs.writeFile(this.capturePath, content);
    console.log(`📥 Captured: "${text}"`);
    
    return { text, capturedAt: new Date().toISOString() };
  }
}

export default CaptureProcessor;
