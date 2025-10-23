# Multi-Language Development Environment

This Docker setup provides a comprehensive development environment with the latest versions of C, C++, Python, Java, C#, and JavaScript/Node.js.

## 🚀 Included Languages & Versions

- **C/C++**: GCC (latest)
- **Python**: 3.12 (latest stable)
- **Java**: OpenJDK 21 (latest LTS)
- **C#**: .NET 8 (latest LTS)
- **JavaScript**: Node.js 20 (latest LTS)

## 🔧 Security Features

- **Non-root user**: Container runs as `developer` user (UID 1000) for better security
- **Sudo access**: User has passwordless sudo for system operations when needed
- **Proper permissions**: All project directories owned by the developer user
- **Isolated environment**: Secure containerization with minimal attack surface

## 🛠️ Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Build and start the development environment
docker-compose up -d dev-environment

# Access the container
docker-compose exec dev-environment bash

# Stop the environment
docker-compose down
```

### Option 2: Direct Docker

```bash
# Build the image with custom user settings
docker build --build-arg USERNAME=developer --build-arg USER_UID=1000 --build-arg USER_GID=1000 -t multi-lang-dev .

# Run the container
docker run -it -p 3000:3000 -p 5000:5000 -p 8000:8000 -p 8080:8080 -v $(pwd):/app --user developer multi-lang-dev

# Or run in detached mode
docker run -d -p 3000:3000 -p 5000:5000 -p 8000:8000 -p 8080:8080 -v $(pwd):/app --user developer --name dev-container multi-lang-dev
```

## 🔧 Usage Examples

### C/C++ Development
```bash
# Compile C program
gcc -o hello hello.c
./hello

# Compile C++ program
g++ -o hello hello.cpp
./hello
```

### Python Development
```bash
# Run Python script
python3 script.py

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install packages
pip install package_name
```

### Java Development
```bash
# Compile Java program
javac HelloWorld.java
java HelloWorld

# Run with Maven (if pom.xml exists)
mvn compile
mvn exec:java
```

### C# Development
```bash
# Create new console app
dotnet new console -n MyApp
cd MyApp
dotnet run

# Build and run
dotnet build
dotnet run
```

### Node.js Development
```bash
# Install dependencies
npm install

# Run application
npm start
# or
node index.js

# Run with TypeScript
ts-node script.ts
```

## 🌐 Ports

- **3000**: Node.js/Express applications
- **5000**: Python Flask applications
- **8000**: Python Django applications
- **8080**: Java Spring Boot applications

## 📁 Directory Structure

```
/app/
├── c/          # C projects
├── cpp/        # C++ projects
├── python/     # Python projects
├── java/       # Java projects
├── csharp/     # C# projects
└── javascript/ # Node.js projects
```

## 🔍 Verify Installation

Once inside the container, run:
```bash
# Check current user (should be 'developer')
whoami

# Check all installed versions
gcc --version
g++ --version
python3 --version
java -version
dotnet --version
node --version
npm --version

# Check sudo access (if needed)
sudo whoami
```

## 🐛 Troubleshooting

### Permission Issues
If you encounter permission issues with mounted volumes:
```bash
# Fix ownership (run from host)
sudo chown -R $USER:$USER .

# Or inside container with sudo
sudo chown -R developer:developer /app
```

### Port Conflicts
If ports are already in use, modify the port mappings in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Map to different host port
```

### Large Image Size
The image is quite large due to multiple language runtimes. Consider using multi-stage builds for production or separate images for specific languages.

## 🔄 Updates

To update to newer language versions:
1. Modify the Dockerfile with new version numbers
2. Rebuild the image: `docker-compose build --no-cache`
3. Restart containers: `docker-compose up -d`

## 📝 Notes

- This is a development environment, not optimized for production
- Self-signed certificates are included for HTTPS development
- The container includes your project files via volume mounting
- All languages are configured with their latest stable versions
