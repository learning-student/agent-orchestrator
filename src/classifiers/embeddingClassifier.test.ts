import { EmbeddingClassifier, EmbeddingClassifierOptions } from './embeddingClassifier';
import { Agent } from '../agents/agent';
import { ParticipantRole } from '../types';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Cache directory for embeddings
const TEST_CACHE_DIR = path.join(process.cwd(), '.cache', 'test-embeddings');

describe('EmbeddingClassifier E2E Tests', () => {
  let classifier: EmbeddingClassifier;
  let openai: OpenAI;

  // Define specialized agents for testing
  const testAgents: { [key: string]: Agent } = {
    'technical': {
      name: 'Technical Expert',
      description: 'Specialized in complex technical topics including software development, system architecture, and infrastructure. Handles programming questions, debugging, code reviews, and technical design discussions.',
      processRequest: async () => ({ role: ParticipantRole.ASSISTANT, content: [{ text: 'Technical response' }] }),
      getSystemPrompt: () => 'I am a technical expert specializing in software and systems.'
    } as unknown as Agent,

    'research': {
      name: 'Research Analyst',
      description: 'Expert in academic research, data analysis, and scientific methodology. Helps with research design, statistical analysis, literature reviews, and academic writing.',
      processRequest: async () => ({ role: ParticipantRole.ASSISTANT, content: [{ text: 'Research response' }] }),
      getSystemPrompt: () => 'I am a research analyst specializing in academic and scientific research.'
    } as unknown as Agent,

    'creative': {
      name: 'Creative Writer',
      description: 'Professional creative writer specializing in storytelling, content creation, and artistic expression. Helps with creative writing, storytelling, narrative design, and artistic projects.',
      processRequest: async () => ({ role: ParticipantRole.ASSISTANT, content: [{ text: 'Creative response' }] }),
      getSystemPrompt: () => 'I am a creative writer specializing in storytelling and artistic expression.'
    } as unknown as Agent
  };

  // Test cases with expected outcomes
  const testCases = {
    optimal: [
      {
        description: 'Clear technical query',
        input: 'Can you help me optimize this database query: SELECT * FROM users WHERE created_at > NOW() - INTERVAL 7 DAY',
        expectedAgent: 'technical',
        minConfidence: 0.8
      },
      {
        description: 'Clear research query',
        input: 'I need help designing a double-blind randomized controlled trial for testing a new medication',
        expectedAgent: 'research',
        minConfidence: 0.8
      },
      {
        description: 'Clear creative query',
        input: 'Help me write a compelling short story about a time traveler who meets their younger self',
        expectedAgent: 'creative',
        minConfidence: 0.8
      }
    ],
    edge: [
      {
        description: 'Mixed technical and research query',
        input: 'Help me write a Python script to analyze the statistical significance of my research data',
        expectedAgent: 'research', // Primary focus on research analysis
        minConfidence: 0.6
      },
      {
        description: 'Mixed creative and technical query',
        input: 'I need to write documentation for my code that tells a story about its architecture',
        expectedAgent: 'technical', // Primary focus on technical documentation
        minConfidence: 0.6
      },
      {
        description: 'Query with minimal context',
        input: 'Can you help me with this?',
        expectError: true
      }
    ],
    contextual: [
      {
        description: 'Technical query with conversation context',
        input: 'How can I fix this issue?',
        context: [
          { 
            role: ParticipantRole.USER, 
            content: [{ text: 'I am working on a React component that keeps crashing' }] 
          }
        ],
        expectedAgent: 'technical',
        minConfidence: 0.7
      },
      {
        description: 'Research query with conversation context',
        input: 'What do you think about these results?',
        context: [
          { 
            role: ParticipantRole.USER, 
            content: [{ text: 'I am analyzing the correlation between variables in my dataset' }] 
          }
        ],
        expectedAgent: 'research',
        minConfidence: 0.7
      }
    ]
  };

  beforeAll(async () => {
    // Ensure we have OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required for E2E tests');
    }

    console.log("TEST_CACHE_DIR",TEST_CACHE_DIR);
    // Create cache directory
    if (!fs.existsSync(TEST_CACHE_DIR)) {
      console.log("Creating cache directory",TEST_CACHE_DIR);
      fs.mkdirSync(TEST_CACHE_DIR, { recursive: true });
    }

    // Initialize OpenAI client
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Initialize classifier with real settings
    const options: EmbeddingClassifierOptions = {
      openaiClient: openai,
      minConfidence: 0.6, // Lower threshold for edge cases
      model: 'text-embedding-ada-002',
      cacheOptions: {
        path: TEST_CACHE_DIR,
        ttl: 24 * 60 * 60, // 24 hours
        maxSize: 100 * 1024 * 1024 // 100MB
      }
    };

    classifier = new EmbeddingClassifier(options);

    // Register all test agents
    for (const [id, agent] of Object.entries(testAgents)) {
      await classifier.registerAgent(id, agent);
    }
  }, 30000);

  afterAll(() => {
    // Clean up cache directory
    if (fs.existsSync(TEST_CACHE_DIR)) {
      fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    }
  });

  describe('Optimal Path Tests', () => {
    test.each(testCases.optimal)(
      '$description',
      async ({ input, expectedAgent, minConfidence }) => {
        const result = await classifier.processRequest(input, []);
        expect(result.selectedAgent).toBe(testAgents[expectedAgent]);
        expect(result.confidence).toBeGreaterThanOrEqual(minConfidence);
      },
      300000
    );
  });

  describe('Edge Case Tests', () => {
    test.each(testCases.edge)(
      '$description',
      async ({ input, expectedAgent, minConfidence, expectError }) => {
        if (expectError) {
          await expect(classifier.processRequest(input, []))
            .rejects
            .toThrow('No agent matched with sufficient confidence');
        } else {
          const result = await classifier.processRequest(input, []);
          expect(result.selectedAgent).toBe(testAgents[expectedAgent]);
          expect(result.confidence).toBeGreaterThanOrEqual(minConfidence);
        }
      },
      300000
    );
  });

  describe('Contextual Tests', () => {
    test.each(testCases.contextual)(
      '$description',
      async ({ input, context, expectedAgent, minConfidence }) => {
        const result = await classifier.processRequest(input, context);
        expect(result.selectedAgent).toBe(testAgents[expectedAgent]);
        expect(result.confidence).toBeGreaterThanOrEqual(minConfidence);
      },
      300000
    );
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      const queries = testCases.optimal.map(tc => tc.input);
      
      const startTime = Date.now();
      const results = await Promise.all(
        queries.map(query => classifier.processRequest(query, []))
      );
      const endTime = Date.now();

      // Verify all classifications were successful
      results.forEach(result => {
        expect(result.selectedAgent).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0.6);
      });

      // Check performance (should complete in reasonable time)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 3 concurrent requests
    }, 300000);

  });
}); 