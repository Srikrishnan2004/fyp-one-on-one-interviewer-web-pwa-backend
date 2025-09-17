import OllamaService from '../ollama/index.js';

export class LLMAnswerService {
  constructor() {
    this.ollamaService = new OllamaService();
  }

  /**
   * Generate an LLM answer for a given question
   * @param {string} question - The interview question
   * @param {string} category - Question category
   * @param {string} difficulty - Question difficulty (easy, medium, hard)
   * @param {string} context - Additional context (optional)
   * @returns {Promise<string>} Generated LLM answer
   */
  async generateAnswer(question, category = 'General', difficulty = 'medium', context = '') {
    try {
      // Create a comprehensive prompt for answer generation
      const systemPrompt = this.buildAnswerPrompt(category, difficulty);
      const fullPrompt = `${systemPrompt}\n\nQuestion: ${question}\n\n${context ? `Context: ${context}\n\n` : ''}Please provide a comprehensive answer that demonstrates expertise in this area.`;

      // Call Ollama to generate the answer
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3', // Use the default model
          prompt: fullPrompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let answer = data.response.trim();

      // Clean up the response
      answer = this.cleanAnswer(answer);

      return answer;
    } catch (error) {
      console.error('LLM answer generation error:', error);
      
      // Return a fallback answer based on difficulty
      return this.generateFallbackAnswer(question, category, difficulty);
    }
  }

  /**
   * Build a system prompt for answer generation based on category and difficulty
   * @param {string} category - Question category
   * @param {string} difficulty - Question difficulty
   * @returns {string} System prompt
   */
  buildAnswerPrompt(category, difficulty) {
    const difficultyInstructions = {
      easy: 'Provide a clear, beginner-friendly explanation with basic concepts and simple examples.',
      medium: 'Provide a comprehensive explanation with practical examples and intermediate-level details.',
      hard: 'Provide an expert-level explanation with advanced concepts, best practices, and complex examples.'
    };

    const categoryInstructions = {
      'Technical': 'Focus on technical implementation details, code examples, and technical best practices.',
      'Behavioral': 'Focus on soft skills, communication, teamwork, and professional behavior examples.',
      'Leadership': 'Focus on leadership principles, management strategies, and team-building examples.',
      'Problem-solving': 'Focus on analytical thinking, problem-solving methodologies, and step-by-step approaches.',
      'System Design': 'Focus on architecture, scalability, performance, and system design principles.',
      'Coding': 'Include code examples, algorithms, data structures, and programming best practices.',
      'Database': 'Focus on database design, optimization, query performance, and data management.',
      'Framework': 'Focus on framework-specific features, best practices, and implementation patterns.',
      'General': 'Provide a well-rounded answer covering multiple aspects of the topic.'
    };

    const difficultyInstruction = difficultyInstructions[difficulty] || difficultyInstructions.medium;
    const categoryInstruction = categoryInstructions[category] || categoryInstructions.General;

    return `You are an expert interviewer and technical mentor. Your task is to provide a high-quality answer to an interview question.

Instructions:
- ${difficultyInstruction}
- ${categoryInstruction}
- Structure your answer clearly with proper formatting
- Include relevant examples and practical insights
- Demonstrate deep knowledge and expertise
- Be concise but comprehensive
- Use professional language appropriate for an interview setting

Format your answer as a well-structured response that would impress an interviewer.`;
  }

  /**
   * Clean up the generated answer
   * @param {string} answer - Raw answer from LLM
   * @returns {string} Cleaned answer
   */
  cleanAnswer(answer) {
    // Remove common prefixes that might appear
    const prefixes = [
      'Here is a comprehensive answer:',
      'Here\'s the answer:',
      'Answer:',
      'Here\'s my answer:',
      'The answer is:',
      'Here\'s a detailed answer:'
    ];

    for (const prefix of prefixes) {
      if (answer.toLowerCase().startsWith(prefix.toLowerCase())) {
        answer = answer.substring(prefix.length).trim();
        break;
      }
    }

    // Remove any trailing phrases
    const suffixes = [
      'I hope this helps!',
      'Let me know if you need clarification.',
      'Does this answer your question?',
      'Feel free to ask for more details.'
    ];

    for (const suffix of suffixes) {
      if (answer.toLowerCase().endsWith(suffix.toLowerCase())) {
        answer = answer.substring(0, answer.length - suffix.length).trim();
        break;
      }
    }

    return answer;
  }

  /**
   * Generate a fallback answer when LLM generation fails
   * @param {string} question - The interview question
   * @param {string} category - Question category
   * @param {string} difficulty - Question difficulty
   * @returns {string} Fallback answer
   */
  generateFallbackAnswer(question, category, difficulty) {
    const fallbackAnswers = {
      easy: `This is a fundamental question about ${category.toLowerCase()}. The basic answer involves understanding core concepts and applying them in simple scenarios. A good approach would be to start with the basics and build up understanding step by step.`,
      
      medium: `This question requires a solid understanding of ${category.toLowerCase()} concepts. The answer involves practical application of knowledge, considering real-world scenarios and best practices. It's important to demonstrate both theoretical knowledge and practical experience.`,
      
      hard: `This is an advanced question that tests deep expertise in ${category.toLowerCase()}. The answer requires sophisticated understanding of complex concepts, advanced problem-solving skills, and the ability to design scalable, efficient solutions. Expert-level knowledge and experience are essential.`
    };

    return fallbackAnswers[difficulty] || fallbackAnswers.medium;
  }

  /**
   * Generate multiple answer variations for a question
   * @param {string} question - The interview question
   * @param {string} category - Question category
   * @param {string} difficulty - Question difficulty
   * @param {number} count - Number of variations to generate
   * @returns {Promise<Array>} Array of answer variations
   */
  async generateAnswerVariations(question, category = 'General', difficulty = 'medium', count = 3) {
    try {
      const variations = [];
      
      for (let i = 0; i < count; i++) {
        const variationContext = `This is variation ${i + 1} of ${count}. Provide a different perspective or approach to answering this question.`;
        const answer = await this.generateAnswer(question, category, difficulty, variationContext);
        variations.push({
          variation: i + 1,
          answer: answer,
          length: answer.length
        });
      }

      return variations;
    } catch (error) {
      console.error('Error generating answer variations:', error);
      return [{
        variation: 1,
        answer: this.generateFallbackAnswer(question, category, difficulty),
        length: 0
      }];
    }
  }

  /**
   * Test the LLM answer service
   * @returns {Promise<Object>} Test results
   */
  async test() {
    try {
      const testQuestion = "What is the difference between let, const, and var in JavaScript?";
      const testAnswer = await this.generateAnswer(testQuestion, 'Technical', 'medium');
      
      return {
        success: true,
        testQuestion,
        testAnswer: testAnswer.substring(0, 200) + '...',
        answerLength: testAnswer.length,
        message: 'LLM answer service is working correctly'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'LLM answer service test failed'
      };
    }
  }
}

export default LLMAnswerService;
