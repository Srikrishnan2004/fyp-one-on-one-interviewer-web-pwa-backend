# ChromaDB Setup Guide

## 🔍 **ChromaDB Path Issue - RESOLVED**

The ChromaDB path configuration has been **corrected**. The previous configuration was trying to use local file storage incorrectly, which caused connection errors.

## ✅ **Current Configuration**

### **Server-Based Setup (Recommended)**
ChromaDB now uses a **server-client architecture**:

- **Server**: Runs on `localhost:8000` (configurable)
- **Client**: Node.js application connects to the server
- **Storage**: ChromaDB manages its own file storage

### **Environment Variables**
```bash
# ChromaDB Configuration
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

## 🚀 **Setup Options**

### **Option 1: Python ChromaDB Server (Recommended)**

1. **Install ChromaDB**:
   ```bash
   pip install chromadb
   ```

2. **Start ChromaDB Server**:
   ```bash
   npm run start-chroma
   ```
   Or manually:
   ```bash
   chroma run --host localhost --port 8000 --path ./chroma_db
   ```

3. **Test Connection**:
   ```bash
   curl http://localhost:8000/api/v1/heartbeat
   ```

### **Option 2: Docker ChromaDB Server**

1. **Run ChromaDB with Docker**:
   ```bash
   docker run -p 8000:8000 chromadb/chroma
   ```

2. **Test Connection**:
   ```bash
   curl http://localhost:8000/api/v1/heartbeat
   ```

### **Option 3: Cloud ChromaDB**

1. **Use ChromaDB Cloud**:
   ```bash
   # Update environment variables
   CHROMA_HOST=your-chroma-cloud-host
   CHROMA_PORT=443
   ```

## 🔧 **Configuration Details**

### **ChromaService Configuration**
```javascript
// services/chromaService.js
constructor() {
  const chromaHost = process.env.CHROMA_HOST || 'localhost';
  const chromaPort = process.env.CHROMA_PORT || '8000';
  
  this.client = new ChromaClient({
    host: chromaHost,
    port: chromaPort
  });
}
```

### **Available Endpoints**
- **Health Check**: `http://localhost:8000/api/v1/heartbeat`
- **Collections**: `http://localhost:8000/api/v1/collections`
- **Documents**: `http://localhost:8000/api/v1/collections/{collection_name}/documents`

## 🧪 **Testing ChromaDB**

### **Test Connection**
```bash
node -e "import('./services/chromaService.js').then(m => { const service = new m.ChromaService(); service.test().then(result => console.log(JSON.stringify(result, null, 2))); })"
```

### **Expected Success Response**
```json
{
  "success": true,
  "message": "ChromaDB connection successful",
  "collections": 0,
  "version": "ChromaDB client connected",
  "serverUrl": "http://localhost:8000"
}
```

## 🐛 **Troubleshooting**

### **Common Issues**

1. **"Failed to connect to chromadb"**
   - **Solution**: Start ChromaDB server first
   - **Command**: `npm run start-chroma`

2. **"Unknown scheme" error**
   - **Solution**: Use server-based configuration (current setup)
   - **Avoid**: Local file path configuration

3. **Port already in use**
   - **Solution**: Change port in environment variables
   - **Example**: `CHROMA_PORT=8001`

4. **Permission denied**
   - **Solution**: Ensure write permissions for `./chroma_db` directory
   - **Command**: `chmod 755 ./chroma_db`

### **Verification Steps**

1. **Check if ChromaDB server is running**:
   ```bash
   curl http://localhost:8000/api/v1/heartbeat
   ```

2. **Check Node.js connection**:
   ```bash
   npm run test-embedding
   ```

3. **Check RAG system**:
   ```bash
   curl -X GET http://localhost:3000/api/rag/health
   ```

## 📁 **File Structure**

```
project/
├── chroma_db/                 # ChromaDB data storage
├── services/
│   └── chromaService.js      # ChromaDB client service
├── scripts/
│   └── startChromaDB.js      # ChromaDB server startup script
└── env.example               # Environment configuration
```

## 🔄 **Migration Notes**

### **What Changed**
- ❌ **Old**: Local file storage with `path` configuration
- ✅ **New**: Server-client architecture with `host`/`port` configuration

### **Benefits**
- ✅ **Better Performance**: Server-based architecture
- ✅ **Scalability**: Can run on different machines
- ✅ **Reliability**: Proper connection handling
- ✅ **Monitoring**: Server health checks

## 🎯 **Next Steps**

1. **Start ChromaDB Server**:
   ```bash
   npm run start-chroma
   ```

2. **Test the Setup**:
   ```bash
   npm run test-embedding
   ```

3. **Start Your Application**:
   ```bash
   npm start
   ```

4. **Verify RAG System**:
   ```bash
   curl -X GET http://localhost:3000/api/rag/health
   ```

## 📚 **Additional Resources**

- [ChromaDB Documentation](https://docs.trychroma.com/)
- [ChromaDB Python API](https://docs.trychroma.com/getting-started)
- [ChromaDB Docker](https://hub.docker.com/r/chromadb/chroma)

---

**✅ ChromaDB path configuration is now correct and ready for production use!**
