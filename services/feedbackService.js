import OllamaService from '../ollama/index.js';

class FeedbackService {
  constructor() {
    this.ollamaService = new OllamaService();
  }

  /**
   * Generate LLM feedback and improvement suggestions based on user answer and LLM answer
   * @param {string} questionText - The original question
   * @param {string} userAnswer - User's answer (can be empty or null)
   * @param {string} llmAnswer - LLM-generated answer for comparison
   * @param {string} category - Question category
   * @param {string} difficulty - Question difficulty
   * @returns {Promise<Object>} Feedback object with suggestions and confidence score
   */
  async generateFeedback(questionText, userAnswer, llmAnswer, category = 'General', difficulty = 'medium') {
    try {
      if (!userAnswer || userAnswer.trim() === '') {
        return this.generateEmptyAnswerFeedback(questionText, difficulty);
      }

      console.log(`🧠 Generating feedback for ${difficulty} ${category} question...`);

      // Build the feedback prompt
      const feedbackPrompt = this.buildFeedbackPrompt(questionText, userAnswer, llmAnswer, category, difficulty);
      
      // Get feedback from Ollama
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt: feedbackPrompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.response.trim();
      
      // Parse the AI response
      const feedback = this.parseFeedbackResponse(aiResponse, userAnswer, difficulty);
      
      console.log(`✅ Generated feedback with confidence score: ${feedback.confidence_score}`);
      return feedback;
    } catch (error) {
      console.error('❌ Failed to generate feedback:', error);
      // Return fallback feedback
      return this.generateFallbackFeedback(userAnswer, difficulty);
    }
  }

  /**
   * Build the feedback prompt for Ollama
   */
  buildFeedbackPrompt(questionText, userAnswer, llmAnswer, category, difficulty) {
    return `You are an expert interview coach. Analyze the following interview question and answers to provide constructive feedback.

QUESTION:
"${questionText}"

CATEGORY: ${category}
DIFFICULTY: ${difficulty}

USER'S ANSWER:
"${userAnswer}"

EXPERT ANSWER (for reference):
"${llmAnswer}"

Please provide your analysis in the following JSON format:
{
  "confidence_score": 0.85,
  "feedback": "Your answer demonstrates good understanding of the concept. You correctly identified the key points about closures...",
  "strengths": [
    "Good understanding of basic concepts",
    "Clear explanation of the main idea"
  ],
  "areas_for_improvement": [
    "Could provide more specific examples",
    "Consider mentioning practical use cases"
  ],
  "improvement_suggestions": [
    "Practice with real-world examples",
    "Study common closure patterns in JavaScript",
    "Try implementing closures in your own code"
  ],
  "next_steps": [
    "Review closure examples in popular frameworks",
    "Practice explaining closures to others"
  ]
}

Focus on:
1. Accuracy and completeness of the answer
2. Clarity of explanation
3. Practical understanding
4. Specific, actionable improvement suggestions
5. Confidence score (0.0 to 1.0) based on answer quality

Be encouraging but constructive. Provide specific, actionable feedback.`;
  }

  /**
   * Parse the AI response into structured feedback
   */
  parseFeedbackResponse(aiResponse, userAnswer, difficulty) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedFeedback = JSON.parse(jsonMatch[0]);
        
        // Validate and clean the feedback
        return {
          confidence_score: Math.max(0, Math.min(1, parsedFeedback.confidence_score || 0.5)),
          llm_feedback: parsedFeedback.feedback || 'Good effort! Keep practicing.',
          strengths: Array.isArray(parsedFeedback.strengths) ? parsedFeedback.strengths : [],
          areas_for_improvement: Array.isArray(parsedFeedback.areas_for_improvement) ? parsedFeedback.areas_for_improvement : [],
          improvement_suggestions: Array.isArray(parsedFeedback.improvement_suggestions) ? parsedFeedback.improvement_suggestions : [],
          next_steps: Array.isArray(parsedFeedback.next_steps) ? parsedFeedback.next_steps : [],
          generated_at: new Date().toISOString(),
          ai_generated: true
        };
      }
    } catch (error) {
      console.error('Failed to parse AI feedback response:', error);
    }

    // Fallback to simple feedback
    return this.generateFallbackFeedback(userAnswer, difficulty);
  }

  /**
   * Generate feedback for empty answers
   */
  generateEmptyAnswerFeedback(questionText, difficulty) {
    const encouragementMessages = {
      easy: "Don't worry! This was an easy question. Try to think about it step by step.",
      medium: "This is a medium-level question. Take your time to think through the concepts.",
      hard: "This was a challenging question. Consider breaking it down into smaller parts."
    };

    return {
      confidence_score: 0.0,
      llm_feedback: encouragementMessages[difficulty] || "No answer provided. Don't be discouraged - keep practicing!",
      strengths: [],
      areas_for_improvement: [
        "Try to provide an answer, even if you're unsure",
        "Break down complex questions into smaller parts"
      ],
      improvement_suggestions: [
        "Practice explaining concepts out loud",
        "Study the topic more thoroughly",
        "Try to provide partial answers even when unsure"
      ],
      next_steps: [
        "Review the topic materials",
        "Practice similar questions",
        "Don't be afraid to say 'I don't know' and explain what you would research"
      ],
      generated_at: new Date().toISOString(),
      ai_generated: false
    };
  }

  /**
   * Generate fallback feedback when AI generation fails
   */
  generateFallbackFeedback(userAnswer, difficulty) {
    const wordCount = userAnswer ? userAnswer.split(' ').length : 0;
    const minWords = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30;
    
    let confidenceScore = 0.5;
    let feedback = "Good effort! Keep practicing to improve your answers.";
    
    if (wordCount >= minWords) {
      confidenceScore = 0.7;
      feedback = "Your answer shows good understanding. Consider adding more specific examples.";
    } else if (wordCount < minWords / 2) {
      confidenceScore = 0.3;
      feedback = "Try to provide more detailed explanations. Consider giving examples to support your answer.";
    }

    return {
      confidence_score: confidenceScore,
      llm_feedback: feedback,
      strengths: wordCount >= minWords ? ["Good length and detail"] : [],
      areas_for_improvement: wordCount < minWords ? ["Provide more detailed explanations"] : [],
      improvement_suggestions: [
        "Practice explaining concepts clearly",
        "Include specific examples in your answers",
        "Break down complex topics into simpler parts"
      ],
      next_steps: [
        "Continue practicing similar questions",
        "Study the topic more thoroughly",
        "Try to provide more comprehensive answers"
      ],
      generated_at: new Date().toISOString(),
      ai_generated: false
    };
  }

  /**
   * Generate improvement suggestions for performance records
   * @param {Object} performanceData - Performance data including user answer and LLM answer
   * @returns {Promise<string>} Improvement suggestions
   */
  async generateImprovementSuggestions(performanceData) {
    try {
      const { user_answer, llm_answer, question_text, question_difficulty } = performanceData;
      
      if (!user_answer || user_answer.trim() === '') {
        return "Focus on providing complete answers. Practice explaining concepts step by step.";
      }

      const feedback = await this.generateFeedback(
        question_text,
        user_answer,
        llm_answer,
        'General',
        question_difficulty
      );

      // Extract the most actionable suggestions
      const suggestions = feedback.improvement_suggestions || [];
      return suggestions.length > 0 ? suggestions.join('. ') : "Continue practicing to improve your skills.";
    } catch (error) {
      console.error('Failed to generate improvement suggestions:', error);
      return "Keep practicing and reviewing the material to improve your performance.";
    }
  }
}

export default FeedbackService;
