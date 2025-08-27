import { languageTemplates } from './languages.js';
import { frameworkTemplates } from './frameworks.js';
import { databaseTemplates } from './databases.js';
import { resumeTemplates } from './resume.js';

/**
 * Template Manager for Interview Prompts
 * Centralized management of all interview templates
 */
class TemplateManager {
  constructor() {
    this.templates = {
      languages: languageTemplates,
      frameworks: frameworkTemplates,
      databases: databaseTemplates,
      resume: resumeTemplates
    };
  }

  /**
   * Get all available templates organized by category
   * @returns {Object} All templates organized by category
   */
  getAllTemplates() {
    return this.templates;
  }

  /**
   * Get a specific template by category and key
   * @param {string} category - The category (languages, frameworks, databases)
   * @param {string} key - The specific template key (java, react, mysql, etc.)
   * @returns {Object|null} The template object or null if not found
   */
  getTemplate(category, key) {
    if (!this.templates[category]) {
      console.error(`Category '${category}' not found`);
      return null;
    }
    
    if (!this.templates[category][key]) {
      console.error(`Template '${key}' not found in category '${category}'`);
      return null;
    }
    
    return this.templates[category][key];
  }

  /**
   * Get template by a combined key (e.g., "languages.java", "frameworks.react")
   * @param {string} templateKey - Combined key in format "category.key"
   * @returns {Object|null} The template object or null if not found
   */
  getTemplateByKey(templateKey) {
    const [category, key] = templateKey.split('.');
    return this.getTemplate(category, key);
  }

  /**
   * List all available template keys
   * @returns {Array<string>} Array of all template keys in format "category.key"
   */
  listAllTemplateKeys() {
    const keys = [];
    
    Object.keys(this.templates).forEach(category => {
      Object.keys(this.templates[category]).forEach(key => {
        keys.push(`${category}.${key}`);
      });
    });
    
    return keys.sort();
  }

  /**
   * List templates by category
   * @param {string} category - The category to list
   * @returns {Array<string>} Array of template keys in the category
   */
  listTemplatesByCategory(category) {
    if (!this.templates[category]) {
      return [];
    }
    
    return Object.keys(this.templates[category]).sort();
  }

  /**
   * Search templates by name or description
   * @param {string} searchTerm - Term to search for
   * @returns {Array<Object>} Array of matching templates with metadata
   */
  searchTemplates(searchTerm) {
    const results = [];
    const term = searchTerm.toLowerCase();
    
    Object.keys(this.templates).forEach(category => {
      Object.keys(this.templates[category]).forEach(key => {
        const template = this.templates[category][key];
        const name = template.name.toLowerCase();
        const prompt = template.systemPrompt.toLowerCase();
        
        if (name.includes(term) || prompt.includes(term) || key.includes(term)) {
          results.push({
            key: `${category}.${key}`,
            category,
            name: template.name,
            model: template.model,
            description: this.extractDescription(template.systemPrompt)
          });
        }
      });
    });
    
    return results;
  }

  /**
   * Extract a brief description from the system prompt
   * @param {string} systemPrompt - The full system prompt
   * @returns {string} Brief description
   */
  extractDescription(systemPrompt) {
    const lines = systemPrompt.split('\n');
    const firstMeaningfulLine = lines.find(line => 
      line.trim().length > 0 && !line.includes('You are an expert')
    );
    
    return firstMeaningfulLine ? 
      firstMeaningfulLine.trim().substring(0, 100) + '...' : 
      'Technical interview questions';
  }

  /**
   * Get template statistics
   * @returns {Object} Statistics about available templates
   */
  getStatistics() {
    const stats = {
      totalTemplates: 0,
      categoryCounts: {},
      models: new Set()
    };
    
    Object.keys(this.templates).forEach(category => {
      const categoryTemplates = this.templates[category];
      const count = Object.keys(categoryTemplates).length;
      
      stats.categoryCounts[category] = count;
      stats.totalTemplates += count;
      
      // Collect unique models
      Object.values(categoryTemplates).forEach(template => {
        stats.models.add(template.model);
      });
    });
    
    stats.models = Array.from(stats.models);
    
    return stats;
  }

  /**
   * Validate a template structure
   * @param {Object} template - Template to validate
   * @returns {Object} Validation result with success and errors
   */
  validateTemplate(template) {
    const errors = [];
    const requiredFields = ['name', 'model', 'systemPrompt', 'responseFormat'];
    
    requiredFields.forEach(field => {
      if (!template[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    if (template.model && !template.model.includes(':')) {
      errors.push('Model should include version tag (e.g., "codellama:latest")');
    }
    
    if (template.systemPrompt && template.systemPrompt.length < 100) {
      errors.push('System prompt seems too short');
    }
    
    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Add a custom template (for runtime additions)
   * @param {string} category - Category to add to
   * @param {string} key - Template key
   * @param {Object} template - Template object
   * @returns {boolean} Success status
   */
  addCustomTemplate(category, key, template) {
    const validation = this.validateTemplate(template);
    if (!validation.success) {
      console.error('Template validation failed:', validation.errors);
      return false;
    }
    
    if (!this.templates[category]) {
      this.templates[category] = {};
    }
    
    this.templates[category][key] = template;
    return true;
  }
}

// Create and export singleton instance
const templateManager = new TemplateManager();
export default templateManager;
