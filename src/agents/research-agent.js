/**
 * Research Agent - General purpose async research tool
 * 
 * Usage:
 *   const researcher = new ResearchAgent();
 *   const result = await researcher.research('topic', { depth: 'deep' });
 * 
 * Features:
 * - Web search integration (Brave API)
 * - Source synthesis with Ollama
 * - Auto-saves to RESEARCH.md
 * - Supports quick, standard, and deep research modes
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ResearchAgent {
  constructor(options = {}) {
    this.config = options.config || this.loadConfig();
    this.researchPath = options.researchPath || path.join(__dirname, '../../RESEARCH.md');
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, '../config/default.json');
      return JSON.parse(require('fs').readFileSync(configPath, 'utf-8'));
    } catch {
      return {
        llm: { provider: 'ollama', model: 'llama3:8b', baseUrl: 'http://localhost:11434' },
        search: { maxResults: 5 }
      };
    }
  }

  /**
   * Perform research on a topic
   * @param {string} topic - What to research
   * @param {object} options - Research options
   * @param {string} options.depth - 'quick' (1 search), 'standard' (3 searches), 'deep' (5+ searches)
   * @param {boolean} options.save - Whether to save to RESEARCH.md (default: true)
   * @param {string} options.context - Additional context for the research
   */
  async research(topic, options = {}) {
    const { depth = 'standard', save = true, context = '' } = options;
    
    console.log(`🔍 Starting ${depth} research on: ${topic}`);
    
    const searchCount = { quick: 1, standard: 3, deep: 5 }[depth] || 3;
    
    // Generate search queries
    const queries = await this.generateSearchQueries(topic, searchCount, context);
    console.log(`📝 Generated ${queries.length} search queries`);
    
    // Perform searches
    const searchResults = [];
    for (const query of queries) {
      try {
        const results = await this.webSearch(query);
        searchResults.push({ query, results });
        console.log(`  ✓ "${query}" - ${results.length} results`);
      } catch (error) {
        console.log(`  ✗ "${query}" - ${error.message}`);
      }
    }
    
    // Fetch content from top URLs
    const sources = await this.fetchSources(searchResults, depth);
    console.log(`📄 Fetched ${sources.length} sources`);
    
    // Synthesize findings
    console.log(`🧠 Synthesizing findings...`);
    const synthesis = await this.synthesize(topic, sources, context);
    
    // Format report
    const report = this.formatReport(topic, synthesis, sources);
    
    // Save to RESEARCH.md
    if (save) {
      await this.saveToResearch(topic, report);
      console.log(`💾 Saved to RESEARCH.md`);
    }
    
    return {
      topic,
      synthesis,
      sources,
      report,
      savedAt: save ? new Date().toISOString() : null
    };
  }

  async generateSearchQueries(topic, count, context) {
    const prompt = `Generate ${count} diverse search queries to research this topic thoroughly.

Topic: ${topic}
${context ? `Context: ${context}` : ''}

Requirements:
- Each query should explore a different angle
- Include both broad and specific queries
- Consider: definitions, examples, comparisons, best practices, recent developments

Return ONLY the queries, one per line, no numbering or explanations.`;

    const response = await this.callLLM(prompt);
    const queries = response.split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0)
      .slice(0, count);
    
    // Always include the original topic as first query
    if (!queries.includes(topic)) {
      queries.unshift(topic);
    }
    
    return queries.slice(0, count);
  }

  async webSearch(query) {
    // Use OpenClaw's web_search via CLI or direct API
    // For now, using a simple fetch to Brave Search API
    const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
    
    try {
      // Try using the search through a local proxy or fallback
      const results = await this.braveSearch(query);
      return results;
    } catch (error) {
      // Fallback: return empty results
      console.warn(`Search failed for "${query}": ${error.message}`);
      return [];
    }
  }

  async braveSearch(query) {
    // This would integrate with OpenClaw's web_search tool
    // For standalone use, needs BRAVE_API_KEY in environment
    const apiKey = process.env.BRAVE_API_KEY;
    
    if (!apiKey) {
      // Return mock results for testing without API key
      return [{
        title: `Search result for: ${query}`,
        url: 'https://example.com',
        snippet: 'API key not configured. Set BRAVE_API_KEY for real search results.'
      }];
    }

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      { headers: { 'X-Subscription-Token': apiKey } }
    );
    
    const data = await response.json();
    return (data.web?.results || []).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.description
    }));
  }

  async fetchSources(searchResults, depth) {
    const sources = [];
    const maxSources = { quick: 2, standard: 5, deep: 10 }[depth] || 5;
    const seenUrls = new Set();

    for (const { query, results } of searchResults) {
      for (const result of results) {
        if (seenUrls.has(result.url) || sources.length >= maxSources) continue;
        seenUrls.add(result.url);
        
        sources.push({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          query
        });
      }
    }

    return sources;
  }

  async synthesize(topic, sources, context) {
    const sourcesText = sources.map((s, i) => 
      `[${i + 1}] ${s.title}\nURL: ${s.url}\nSnippet: ${s.snippet}`
    ).join('\n\n');

    const prompt = `You are a research analyst. Synthesize the following sources into a comprehensive research summary.

TOPIC: ${topic}
${context ? `CONTEXT: ${context}` : ''}

SOURCES:
${sourcesText}

Instructions:
1. Provide a clear, well-organized summary of the key findings
2. Highlight important facts, statistics, and insights
3. Note any conflicting information or gaps
4. Include practical takeaways or recommendations
5. Cite sources using [1], [2], etc.

Format your response with clear sections using markdown headers.`;

    return await this.callLLM(prompt);
  }

  formatReport(topic, synthesis, sources) {
    const date = new Date().toISOString().split('T')[0];
    const sourcesList = sources.map((s, i) => 
      `${i + 1}. [${s.title}](${s.url})`
    ).join('\n');

    return `## ${topic}

> Researched: ${date}
> Sources: ${sources.length}

${synthesis}

### Sources
${sourcesList}

---
`;
  }

  async saveToResearch(topic, report) {
    let content = '';
    
    try {
      content = await fs.readFile(this.researchPath, 'utf-8');
    } catch {
      content = `# Research Notes\n\nCollection of research findings and insights.\n\n---\n\n`;
    }

    // Add new research after the header
    const headerEnd = content.indexOf('---');
    if (headerEnd !== -1) {
      content = content.slice(0, headerEnd + 4) + '\n' + report + content.slice(headerEnd + 4);
    } else {
      content += '\n' + report;
    }

    await fs.writeFile(this.researchPath, content);
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

  /**
   * Quick research - single search, brief summary
   */
  async quick(topic, context = '') {
    return this.research(topic, { depth: 'quick', context });
  }

  /**
   * Deep research - thorough multi-angle investigation
   */
  async deep(topic, context = '') {
    return this.research(topic, { depth: 'deep', context });
  }
}

export default ResearchAgent;
