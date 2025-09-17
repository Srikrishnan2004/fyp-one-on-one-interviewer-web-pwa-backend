import { ChromaClient } from 'chromadb';
import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

export class ChromaService {
  constructor() {
    // ChromaDB server configuration
    const chromaHost = process.env.CHROMA_HOST || 'localhost';
    const chromaPort = process.env.CHROMA_PORT || '8000';
    
    // Use ChromaClient to connect to ChromaDB server
    this.client = new ChromaClient({
      host: chromaHost,
      port: chromaPort
    });
    this.collections = new Map();
    this.serverUrl = `http://${chromaHost}:${chromaPort}`;
  }

  /**
   * Initialize ChromaDB client
   */
  async initialize() {
    try {
      await this.client.heartbeat();
      console.log('ChromaDB client initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize ChromaDB:', error);
      throw new Error(`ChromaDB initialization failed: ${error.message}`);
    }
  }

  /**
   * Create a new collection
   * @param {string} name - Collection name
   * @param {Object} metadata - Collection metadata
   * @returns {Promise<Object>} Created collection
   */
  async createCollection(name, metadata = {}) {
    try {
      const collection = await this.client.createCollection({
        name,
        metadata: {
          description: metadata.description || `Collection for ${name}`,
          created_at: new Date().toISOString(),
          ...metadata
        }
      });

      this.collections.set(name, collection);
      console.log(`Collection '${name}' created successfully`);
      return collection;
    } catch (error) {
      console.error(`Error creating collection '${name}':`, error);
      throw new Error(`Failed to create collection: ${error.message}`);
    }
  }

  /**
   * Get an existing collection
   * @param {string} name - Collection name
   * @returns {Promise<Object>} Collection object
   */
  async getCollection(name) {
    try {
      if (this.collections.has(name)) {
        return this.collections.get(name);
      }

      const collection = await this.client.getCollection({ name });
      this.collections.set(name, collection);
      return collection;
    } catch (error) {
      console.error(`Error getting collection '${name}':`, error);
      throw new Error(`Collection '${name}' not found`);
    }
  }

  /**
   * List all collections
   * @returns {Promise<Array>} Array of collection names
   */
  async listCollections() {
    try {
      const collections = await this.client.listCollections();
      return collections.map(col => ({
        name: col.name,
        metadata: col.metadata
      }));
    } catch (error) {
      console.error('Error listing collections:', error);
      throw new Error(`Failed to list collections: ${error.message}`);
    }
  }

  /**
   * Delete a collection
   * @param {string} name - Collection name
   * @returns {Promise<boolean>} Success status
   */
  async deleteCollection(name) {
    try {
      await this.client.deleteCollection({ name });
      this.collections.delete(name);
      console.log(`Collection '${name}' deleted successfully`);
      return true;
    } catch (error) {
      console.error(`Error deleting collection '${name}':`, error);
      throw new Error(`Failed to delete collection: ${error.message}`);
    }
  }

  /**
   * Add documents to a collection
   * @param {string} collectionName - Collection name
   * @param {Array} documents - Array of documents with text, embeddings, and metadata
   * @returns {Promise<Object>} Add result
   */
  async addDocuments(collectionName, documents) {
    try {
      const collection = await this.getCollection(collectionName);
      
      if (!Array.isArray(documents) || documents.length === 0) {
        throw new Error('Documents must be a non-empty array');
      }

      const ids = documents.map(doc => doc.id || uuidv4());
      const texts = documents.map(doc => doc.text);
      const embeddings = documents.map(doc => doc.embedding);
      const metadatas = documents.map(doc => doc.metadata || {});

      const result = await collection.add({
        ids,
        documents: texts,
        embeddings,
        metadatas
      });

      console.log(`Added ${documents.length} documents to collection '${collectionName}'`);
      return result;
    } catch (error) {
      console.error(`Error adding documents to collection '${collectionName}':`, error);
      throw new Error(`Failed to add documents: ${error.message}`);
    }
  }

  /**
   * Query documents from a collection
   * @param {string} collectionName - Collection name
   * @param {Array} queryEmbedding - Query embedding vector
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Query results
   */
  async queryDocuments(collectionName, queryEmbedding, options = {}) {
    try {
      const collection = await this.getCollection(collectionName);
      
      const {
        nResults = 5,
        where = undefined,
        include = ['documents', 'metadatas', 'distances']
      } = options;

      const result = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults,
        where,
        include
      });

      return result;
    } catch (error) {
      console.error(`Error querying collection '${collectionName}':`, error);
      throw new Error(`Failed to query documents: ${error.message}`);
    }
  }

  /**
   * Update documents in a collection
   * @param {string} collectionName - Collection name
   * @param {Array} documents - Array of documents to update
   * @returns {Promise<Object>} Update result
   */
  async updateDocuments(collectionName, documents) {
    try {
      const collection = await this.getCollection(collectionName);
      
      const ids = documents.map(doc => doc.id);
      const texts = documents.map(doc => doc.text);
      const embeddings = documents.map(doc => doc.embedding);
      const metadatas = documents.map(doc => doc.metadata || {});

      const result = await collection.update({
        ids,
        documents: texts,
        embeddings,
        metadatas
      });

      console.log(`Updated ${documents.length} documents in collection '${collectionName}'`);
      return result;
    } catch (error) {
      console.error(`Error updating documents in collection '${collectionName}':`, error);
      throw new Error(`Failed to update documents: ${error.message}`);
    }
  }

  /**
   * Delete documents from a collection
   * @param {string} collectionName - Collection name
   * @param {Array} ids - Array of document IDs to delete
   * @returns {Promise<Object>} Delete result
   */
  async deleteDocuments(collectionName, ids) {
    try {
      const collection = await this.getCollection(collectionName);
      
      const result = await collection.delete({
        ids
      });

      console.log(`Deleted ${ids.length} documents from collection '${collectionName}'`);
      return result;
    } catch (error) {
      console.error(`Error deleting documents from collection '${collectionName}':`, error);
      throw new Error(`Failed to delete documents: ${error.message}`);
    }
  }

  /**
   * Get collection count
   * @param {string} collectionName - Collection name
   * @returns {Promise<number>} Document count
   */
  async getCollectionCount(collectionName) {
    try {
      const collection = await this.getCollection(collectionName);
      const result = await collection.count();
      return result;
    } catch (error) {
      console.error(`Error getting count for collection '${collectionName}':`, error);
      throw new Error(`Failed to get collection count: ${error.message}`);
    }
  }

  /**
   * Get all documents from a collection
   * @param {string} collectionName - Collection name
   * @param {Object} options - Query options
   * @returns {Promise<Object>} All documents
   */
  async getAllDocuments(collectionName, options = {}) {
    try {
      const collection = await this.getCollection(collectionName);
      
      const {
        where = undefined,
        include = ['documents', 'metadatas', 'embeddings']
      } = options;

      const result = await collection.get({
        where,
        include
      });

      return result;
    } catch (error) {
      console.error(`Error getting all documents from collection '${collectionName}':`, error);
      throw new Error(`Failed to get all documents: ${error.message}`);
    }
  }

  /**
   * Search documents with text similarity
   * @param {string} collectionName - Collection name
   * @param {string} queryText - Query text
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchSimilar(collectionName, queryText, options = {}) {
    try {
      const collection = await this.getCollection(collectionName);
      
      const {
        nResults = 5,
        where = undefined,
        include = ['documents', 'metadatas', 'distances']
      } = options;

      const result = await collection.query({
        queryTexts: [queryText],
        nResults,
        where,
        include
      });

      return result;
    } catch (error) {
      console.error(`Error searching collection '${collectionName}':`, error);
      throw new Error(`Failed to search documents: ${error.message}`);
    }
  }

  /**
   * Test ChromaDB connection
   * @returns {Promise<Object>} Test results
   */
  async test() {
    try {
      await this.client.heartbeat();
      const collections = await this.listCollections();
      
      return {
        success: true,
        message: 'ChromaDB connection successful',
        collections: collections.length,
        version: 'ChromaDB client connected',
        serverUrl: this.serverUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'ChromaDB connection failed',
        serverUrl: this.serverUrl
      };
    }
  }

  /**
   * Close ChromaDB client
   */
  async close() {
    try {
      this.collections.clear();
      console.log('ChromaDB client closed');
    } catch (error) {
      console.error('Error closing ChromaDB client:', error);
    }
  }
}

export default ChromaService;
