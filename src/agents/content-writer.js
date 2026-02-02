/**
 * Content Writer Agent - Generates content using research + context
 * 
 * Usage:
 *   const writer = new ContentWriter();
 *   const result = await writer.write('blog post about AI automation', { tone: 'professional' });
 * 
 * Features:
 * - Multiple content types (blog, social, email, script, outline)
 * - Tone customization
 * - Uses existing research from RESEARCH.md
 * - Saves drafts to CONTENT.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ContentWriter {
  constructor(options = {}) {
    this.config = options.config || this.loadConfig();
    this.contentPath = options.contentPath || path.join(__dirname, '../../CONTENT.md');
    this.researchPath = options.researchPath || path.join(__dirname, '../../RESEARCH.md');
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
   * Generate content
   * @param {string} topic - What to write about
   * @param {object} options - Writing options
   * @param {string} options.type - 'blog', 'social', 'email', 'script', 'outline', 'thread'
   * @param {string} options.tone - 'professional', 'casual', 'friendly', 'authoritative', 'witty'
   * @param {string} options.audience - Target audience description
   * @param {number} options.length - Approximate word count
   * @param {boolean} options.useResearch - Pull relevant research from RESEARCH.md
   * @param {boolean} options.save - Save to CONTENT.md
   */
  async write(topic, options = {}) {
    const {
      type = 'blog',
      tone = 'professional',
      audience = 'general audience',
      length = null,
      useResearch = true,
      save = true,
      context = ''
    } = options;

    console.log(`✍️  Writing ${type} about: ${topic}`);

    // Get relevant research if available
    let research = '';
    if (useResearch) {
      research = await this.getRelevantResearch(topic);
      if (research) {
        console.log(`📚 Found relevant research to incorporate`);
      }
    }

    // Generate content based on type
    const content = await this.generate(topic, {
      type,
      tone,
      audience,
      length,
      research,
      context
    });

    // Format output
    const output = this.formatOutput(topic, content, { type, tone });

    // Save to CONTENT.md
    if (save) {
      await this.saveToContent(topic, output, type);
      console.log(`💾 Saved to CONTENT.md`);
    }

    return {
      topic,
      type,
      content,
      output,
      savedAt: save ? new Date().toISOString() : null
    };
  }

  async getRelevantResearch(topic) {
    try {
      const research = await fs.readFile(this.researchPath, 'utf-8');
      
      // Find sections that might be relevant
      const sections = research.split('## ').slice(1);
      const keywords = topic.toLowerCase().split(' ').filter(w => w.length > 3);
      
      const relevant = sections.filter(section => {
        const sectionLower = section.toLowerCase();
        return keywords.some(kw => sectionLower.includes(kw));
      });

      if (relevant.length > 0) {
        return relevant.slice(0, 2).map(s => '## ' + s).join('\n');
      }
    } catch {
      // No research file or couldn't read it
    }
    return '';
  }

  async generate(topic, options) {
    const { type, tone, audience, length, research, context } = options;

    const typeInstructions = {
      blog: `Write a blog post. Include an engaging introduction, clear sections with headers, and a conclusion with a call to action. ${length ? `Target approximately ${length} words.` : 'Aim for 600-800 words.'}`,
      
      social: `Write social media posts for multiple platforms:
- LinkedIn post (professional, 150-200 words)
- Twitter/X thread (3-5 tweets, each under 280 chars)
- Instagram caption (engaging, with emoji suggestions and hashtags)`,
      
      email: `Write an email. Include:
- Subject line (compelling, under 50 chars)
- Preview text (40-90 chars)
- Body with clear sections
- Call to action
${length ? `Target approximately ${length} words for the body.` : ''}`,
      
      script: `Write a video/podcast script. Include:
- Hook (first 10 seconds)
- Main content with timestamps
- Transitions between sections
- Call to action
- Suggested B-roll or visual notes
${length ? `Target ${length} words (roughly ${Math.round(length/150)} minutes).` : 'Aim for 3-5 minutes of content.'}`,
      
      outline: `Create a detailed content outline. Include:
- Main thesis/angle
- Key sections with bullet points
- Supporting data points or examples needed
- Potential quotes or sources to include
- Questions to answer`,
      
      thread: `Write a Twitter/X thread. Include:
- Strong hook in first tweet
- 5-10 tweets that build on each other
- Each tweet under 280 characters
- End with a summary or call to action
- Number each tweet`
    };

    const toneGuide = {
      professional: 'Use clear, confident language. Be informative but not stuffy.',
      casual: 'Write like you\'re talking to a friend. Use contractions and simple language.',
      friendly: 'Be warm and approachable. Use inclusive language.',
      authoritative: 'Position as an expert. Use data and strong statements.',
      witty: 'Include clever observations and light humor. Be smart but not try-hard.'
    };

    const prompt = `You are a skilled content writer. Create ${type} content on the following topic.

TOPIC: ${topic}

AUDIENCE: ${audience}

TONE: ${tone}
${toneGuide[tone] || ''}

${context ? `ADDITIONAL CONTEXT:\n${context}\n` : ''}

${research ? `RELEVANT RESEARCH (incorporate naturally):\n${research}\n` : ''}

INSTRUCTIONS:
${typeInstructions[type] || typeInstructions.blog}

Write the content now. Be specific, add value, and make it engaging.`;

    return await this.callLLM(prompt);
  }

  formatOutput(topic, content, options) {
    const date = new Date().toISOString().split('T')[0];
    const { type, tone } = options;

    return `### ${topic}

> Type: ${type} | Tone: ${tone} | Created: ${date}

${content}

---
`;
  }

  async saveToContent(topic, output, type) {
    let content = '';
    
    try {
      content = await fs.readFile(this.contentPath, 'utf-8');
    } catch {
      content = `# Content Drafts

Drafts and content pieces ready for review or publishing.

## Drafts

`;
    }

    // Add to drafts section
    const draftsIndex = content.indexOf('## Drafts');
    if (draftsIndex !== -1) {
      const insertPoint = content.indexOf('\n', draftsIndex) + 1;
      content = content.slice(0, insertPoint) + '\n' + output + content.slice(insertPoint);
    } else {
      content += '\n## Drafts\n\n' + output;
    }

    await fs.writeFile(this.contentPath, content);
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
          options: { temperature: 0.8 }
        })
      });

      const data = await response.json();
      return data.response || '';
    }

    throw new Error(`Unsupported LLM provider: ${provider}`);
  }

  // Convenience methods
  async blog(topic, options = {}) {
    return this.write(topic, { ...options, type: 'blog' });
  }

  async social(topic, options = {}) {
    return this.write(topic, { ...options, type: 'social' });
  }

  async email(topic, options = {}) {
    return this.write(topic, { ...options, type: 'email' });
  }

  async script(topic, options = {}) {
    return this.write(topic, { ...options, type: 'script' });
  }

  async outline(topic, options = {}) {
    return this.write(topic, { ...options, type: 'outline' });
  }

  async thread(topic, options = {}) {
    return this.write(topic, { ...options, type: 'thread' });
  }
}

export default ContentWriter;
