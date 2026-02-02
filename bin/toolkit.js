#!/usr/bin/env node

/**
 * Toolkit CLI - Command line interface for productivity tools
 * 
 * Usage:
 *   toolkit research "AI automation trends"
 *   toolkit write "blog post about productivity" --type blog
 *   toolkit capture "Remember to call John"
 *   toolkit process
 *   toolkit review
 */

import { ResearchAgent } from '../src/agents/research-agent.js';
import { ContentWriter } from '../src/agents/content-writer.js';
import { CaptureProcessor } from '../src/capture/processor.js';
import { WeeklyReviewGenerator } from '../src/review/weekly-generator.js';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    switch (command) {
      case 'research': {
        const topic = args[1];
        if (!topic) {
          console.log('Usage: toolkit research "topic" [--depth quick|standard|deep]');
          process.exit(1);
        }
        const depth = args.includes('--deep') ? 'deep' : 
                      args.includes('--quick') ? 'quick' : 'standard';
        
        const researcher = new ResearchAgent();
        await researcher.research(topic, { depth });
        break;
      }

      case 'write': {
        const topic = args[1];
        if (!topic) {
          console.log('Usage: toolkit write "topic" [--type blog|social|email|script|outline|thread] [--tone professional|casual|friendly]');
          process.exit(1);
        }
        
        const typeIndex = args.indexOf('--type');
        const toneIndex = args.indexOf('--tone');
        const type = typeIndex !== -1 ? args[typeIndex + 1] : 'blog';
        const tone = toneIndex !== -1 ? args[toneIndex + 1] : 'professional';
        
        const writer = new ContentWriter();
        await writer.write(topic, { type, tone });
        break;
      }

      case 'capture': {
        const text = args[1];
        if (!text) {
          console.log('Usage: toolkit capture "something to remember"');
          process.exit(1);
        }
        
        const processor = new CaptureProcessor();
        await processor.capture(text);
        break;
      }

      case 'process': {
        const processor = new CaptureProcessor();
        await processor.process();
        break;
      }

      case 'review': {
        const reviewer = new WeeklyReviewGenerator();
        await reviewer.generate();
        break;
      }

      case 'help':
      default:
        console.log(`
🛠️  Toolkit CLI

Commands:
  research <topic>    Research a topic and save to RESEARCH.md
    --quick           Quick research (1 search)
    --deep            Deep research (5+ searches)

  write <topic>       Generate content
    --type <type>     blog, social, email, script, outline, thread
    --tone <tone>     professional, casual, friendly, authoritative, witty

  capture <text>      Quick capture to inbox

  process             Process captured items (categorize & route)

  review              Generate weekly review

Examples:
  toolkit research "AI automation best practices" --deep
  toolkit write "5 tips for productivity" --type blog --tone casual
  toolkit capture "Follow up with client about proposal"
  toolkit process
  toolkit review
`);
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
