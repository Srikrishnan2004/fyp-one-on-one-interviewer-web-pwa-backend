# LeetCode-like Coding Challenge Environment

This Docker setup provides a streamlined environment specifically designed for coding challenges and problem-solving platforms like LeetCode, HackerRank, or CodeSignal.

## 🚀 Included Languages & Versions

- **C/C++**: GCC (latest)
- **Python**: 3.12 (latest stable)
- **Java**: OpenJDK 21 (latest LTS)
- **C#**: .NET 8 (latest LTS)
- **JavaScript**: Node.js 20 (latest LTS)

## 🎯 Optimized for Coding Challenges

- **Minimal footprint**: Only essential packages for coding challenges
- **Fast execution**: Optimized for quick compilation and execution
- **Security**: Non-root user with restricted permissions
- **Isolated environment**: Safe for running untrusted code

## 🛠️ Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Build and start the coding challenge environment
docker-compose up -d coding-environment

# Access the container
docker-compose exec coding-environment bash

# Stop the environment
docker-compose down
```

### Option 2: Direct Docker

```bash
# Build the image with custom user settings
docker build --build-arg USERNAME=coder --build-arg USER_UID=1000 --build-arg USER_GID=1000 -t coding-challenge-env .

# Run the container
docker run -it -p 3000:3000 -v $(pwd):/app --user coder coding-challenge-env

# Or run in detached mode
docker run -d -p 3000:3000 -v $(pwd):/app --user coder --name coding-container coding-challenge-env
```

## 🔧 Coding Challenge Examples

### C/C++ Solutions
```bash
# Compile and run C solution
gcc -o solution solution.c
./solution

# Compile and run C++ solution
g++ -o solution solution.cpp
./solution
```

### Python Solutions
```bash
# Run Python solution
python3 solution.py

# With input from file
python3 solution.py < input.txt
```

### Java Solutions
```bash
# Compile and run Java solution
javac Solution.java
java Solution

# With input from file
java Solution < input.txt
```

### C# Solutions
```bash
# Compile and run C# solution
dotnet run

# Build and run
dotnet build
dotnet run
```

### JavaScript Solutions
```bash
# Run JavaScript solution
node solution.js

# With input from file
node solution.js < input.txt
```

## 🌐 Ports

- **3000**: Coding challenge server/API

## 📁 Directory Structure

```
/app/
└── solutions/    # User-submitted solutions
```

## 🔍 Verify Installation

Once inside the container, run:
```bash
# Check current user (should be 'coder')
whoami

# Check all installed versions
gcc --version
g++ --version
python3 --version
java -version
dotnet --version
node --version
```

## 🐛 Troubleshooting

### Permission Issues
If you encounter permission issues with mounted volumes:
```bash
# Fix ownership (run from host)
sudo chown -R $USER:$USER .

# Or inside container with sudo
sudo chown -R coder:coder /app
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
- The application runs on HTTP for development
- The container includes your project files via volume mounting
- All languages are configured with their latest stable versions
