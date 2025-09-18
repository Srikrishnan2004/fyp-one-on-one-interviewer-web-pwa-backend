// Global Service Manager to prevent duplicate initializations
class ServiceManager {
  constructor() {
    this.services = new Map();
    this.initialized = new Map();
  }

  // Register a service
  register(name, service) {
    if (this.services.has(name)) {
      console.log(`Service '${name}' already registered, returning existing instance`);
      return this.services.get(name);
    }
    
    this.services.set(name, service);
    this.initialized.set(name, false);
    return service;
  }

  // Get a registered service
  get(name) {
    return this.services.get(name);
  }

  // Initialize a service only once
  async initialize(name) {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' not registered`);
    }

    if (this.initialized.get(name)) {
      console.log(`Service '${name}' already initialized, skipping...`);
      return true;
    }

    const service = this.services.get(name);
    
    try {
      if (typeof service.initialize === 'function') {
        await service.initialize();
      }
      this.initialized.set(name, true);
      console.log(`✅ Service '${name}' initialized successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to initialize service '${name}':`, error);
      throw error;
    }
  }

  // Initialize multiple services
  async initializeAll() {
    const results = {};
    
    for (const [name] of this.services) {
      try {
        results[name] = await this.initialize(name);
      } catch (error) {
        results[name] = false;
        console.error(`Failed to initialize ${name}:`, error.message);
      }
    }
    
    return results;
  }

  // Check if service is initialized
  isInitialized(name) {
    return this.initialized.get(name) || false;
  }

  // Get initialization status of all services
  getStatus() {
    const status = {};
    for (const [name] of this.services) {
      status[name] = this.initialized.get(name);
    }
    return status;
  }
}

// Create global instance
const serviceManager = new ServiceManager();

export default serviceManager;
