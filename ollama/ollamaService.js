import fetch from "node-fetch";
import { templateManager } from './templates/index.js';

/**
 * Ollama Service - Handles communication with local Ollama LLM
 */
class OllamaService {
  constructor(baseUrl = "http://localhost:11434", defaultModel = "llama3") {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
    this.templateManager = templateManager;
  }

  /**
   * Generate a response from Ollama LLM
   * @param {string} userMessage - The user's input message
   * @param {string} model - The model to use (optional, defaults to configured model)
   * @returns {Promise<Array>} - Array of message objects
   */
  async generateResponse(userMessage, model = this.defaultModel) {
    try {
      // Prepare prompt for Ollama
      const systemPrompt = `You are a virtual AI interviewer.\nYou will always reply with a JSON array of messages. With a maximum of 3 messages. Each message has a text, facialExpression, and animation property. Use "default" for facialExpression and "Idle" for animation unless the context specifically calls for something different.`;
      const prompt = `${systemPrompt}\nUser: ${userMessage || "Hello"}`;

      // Call Ollama local LLM
      const ollamaRes = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false
        })
      });

      if (!ollamaRes.ok) {
        throw new Error(`Ollama API error: ${ollamaRes.status} ${ollamaRes.statusText}`);
      }

      const ollamaData = await ollamaRes.json();
      let messages;

      try {
        messages = JSON.parse(ollamaData.response);
        if (messages.messages) messages = messages.messages;
      } catch (e) {
        console.error("Failed to parse Ollama response:", e);
        // fallback: return a default message if parsing fails
        messages = [{ 
          text: "Sorry, I couldn't process your request.", 
          facialExpression: "default", 
          animation: "Idle" 
        }];
      }

      return messages;
    } catch (error) {
      console.error("Ollama service error:", error);
      // Return fallback message on any error
      return [{ 
        text: "Sorry, I'm having trouble connecting right now.", 
        facialExpression: "sad", 
        animation: "Idle" 
      }];
    }
  }

  /**
   * Check if Ollama service is available
   * @returns {Promise<boolean>} - True if service is available
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error("Ollama service not available:", error);
      return false;
    }
  }

  /**
   * Get available models from Ollama
   * @returns {Promise<Array>} - Array of available model names
   */
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }
      const data = await response.json();
      return data.models?.map(model => model.name) || [];
    } catch (error) {
      console.error("Failed to get available models:", error);
      return [];
    }
  }

  /**
   * Generate interview questions using a specific template
   * @param {string} templateKey - Template key in format "category.key" (e.g., "languages.java")
   * @param {string} userContext - Optional additional context from user
   * @returns {Promise<Array>} Array of interview question objects
   */
  async generateInterviewQuestions(templateKey, userContext = "") {
    try {
      const template = this.templateManager.getTemplateByKey(templateKey);
      if (!template) {
        throw new Error(`Template '${templateKey}' not found`);
      }

      // Prepare the prompt with optional user context
      let prompt = template.systemPrompt;
      if (userContext.trim()) {
        prompt += `\n\nAdditional context: ${userContext}`;
      }

      // Call Ollama with the template's specified model
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: template.model,
          prompt: prompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let questions;

      try {
        questions = JSON.parse(data.response);
        // Ensure we have an array
        if (!Array.isArray(questions)) {
          questions = [questions];
        }
      } catch (e) {
        console.error("Failed to parse interview questions:", e);
        // Return fallback questions
        questions = [{
          text: `Generate a ${template.name} interview question`,
          difficulty: "intermediate",
          category: "General",
          followUp: "Please provide more specific context for better questions."
        }];
      }

      return questions;
    } catch (error) {
      console.error("Interview question generation error:", error);
      return [{
        text: "What are the core concepts you should know for this technology?",
        difficulty: "beginner",
        category: "General",
        followUp: "Can you explain one of these concepts in detail?"
      }];
    }
  }

  /**
   * Get all available interview templates
   * @returns {Array<Object>} Array of template metadata
   */
  getAvailableTemplates() {
    const templates = this.templateManager.getAllTemplates();
    const result = [];

    Object.keys(templates).forEach(category => {
      Object.keys(templates[category]).forEach(key => {
        const template = templates[category][key];
        result.push({
          key: `${category}.${key}`,
          category,
          name: template.name,
          model: template.model,
          description: this.templateManager.extractDescription(template.systemPrompt)
        });
      });
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Search available templates
   * @param {string} searchTerm - Term to search for
   * @returns {Array<Object>} Array of matching templates
   */
  searchTemplates(searchTerm) {
    return this.templateManager.searchTemplates(searchTerm);
  }

  /**
   * Get template statistics
   * @returns {Object} Statistics about available templates
   */
  getTemplateStatistics() {
    return this.templateManager.getStatistics();
  }
}

export default OllamaService;
