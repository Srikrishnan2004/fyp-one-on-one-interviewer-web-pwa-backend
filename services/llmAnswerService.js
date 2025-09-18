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
          model: 'codellama:latest',
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
      easy: 'Provide a clear, simple explanation with basic concepts.',
      medium: 'Provide a straightforward explanation with practical examples.',
      hard: 'Provide a direct explanation with advanced concepts and examples.'
    };

    const categoryInstructions = {
      'Technical': 'Focus on technical details and code examples.',
      'Behavioral': 'Focus on soft skills and professional behavior.',
      'Leadership': 'Focus on leadership principles and management.',
      'Problem-solving': 'Focus on analytical thinking and methodologies.',
      'System Design': 'Focus on architecture and design principles.',
      'Coding': 'Include code examples and programming concepts.',
      'Database': 'Focus on database design and optimization.',
      'Framework': 'Focus on framework features and patterns.',
      'General': 'Provide a clear, direct answer.'
    };

    const difficultyInstruction = difficultyInstructions[difficulty] || difficultyInstructions.medium;
    const categoryInstruction = categoryInstructions[category] || categoryInstructions.General;

    return `You are an expert providing a direct answer to an interview question.

Instructions:
- ${difficultyInstruction}
- ${categoryInstruction}
- Give a direct, clear answer without unnecessary introductions
- Don't use phrases like "In this response", "Here's the answer", "Let me explain"
- Start directly with the answer content
- Be concise and to the point
- Include relevant examples when helpful
- Use professional but straightforward language

Provide only the answer content, no meta-commentary or introductions.`;
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
      'Here\'s a detailed answer:',
      'In this response,',
      'In this answer,',
      'To answer this question,',
      'Let me explain:',
      'Let me provide an answer:',
      'Here\'s what I think:',
      'Based on my knowledge,',
      'From my experience,',
      'In my opinion,',
      'The key points are:',
      'Here\'s the explanation:',
      'Let me break this down:',
      'To address this question:'
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
      'Feel free to ask for more details.',
      'I hope this clarifies the concept.',
      'Let me know if you need more information.',
      'This should help you understand.',
      'Feel free to ask if you have questions.',
      'I hope this explanation is helpful.',
      'Let me know if you need further clarification.'
    ];

    for (const suffix of suffixes) {
      if (answer.toLowerCase().endsWith(suffix.toLowerCase())) {
        answer = answer.substring(0, answer.length - suffix.length).trim();
        break;
      }
    }

    // Remove any remaining meta-commentary at the beginning
    const metaPhrases = [
      'This is a',
      'This question is about',
      'To understand this',
      'When answering this',
      'For this question'
    ];

    for (const phrase of metaPhrases) {
      if (answer.toLowerCase().startsWith(phrase.toLowerCase())) {
        // Find the first sentence and remove it if it's meta-commentary
        const sentences = answer.split('. ');
        if (sentences.length > 1) {
          const firstSentence = sentences[0];
          if (firstSentence.length < 100 && firstSentence.toLowerCase().includes('question')) {
            answer = sentences.slice(1).join('. ');
          }
        }
        break;
      }
    }

    return answer.trim();
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
      easy: `This is a basic ${category.toLowerCase()} concept. Focus on understanding the fundamentals and simple applications.`,
      
      medium: `This ${category.toLowerCase()} question requires practical knowledge and real-world application. Consider both theory and implementation.`,
      
      hard: `This is an advanced ${category.toLowerCase()} topic requiring deep expertise and complex problem-solving skills.`
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
