# LeetCode-like problem-solving platform environment
FROM ubuntu:24.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Create non-root user for security
ARG USERNAME=coder
ARG USER_UID=2000
ARG USER_GID=2000

# Install only essential dependencies for coding challenges
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    software-properties-common \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install C and C++ compilers (essential for coding challenges)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python 3.12 (available in Ubuntu 24.04)
RUN apt-get update && apt-get install -y \
    python3.12 \
    python3.12-dev \
    python3.12-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.12 as default
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 1
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.12 1

# Install Java 21 for coding challenges
RUN apt-get update && apt-get install -y \
    openjdk-21-jdk \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# Install .NET 8 for C# coding challenges
RUN wget https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y dotnet-sdk-8.0 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 for JavaScript coding challenges
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create the non-root user
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --gid $USER_GID -m $USERNAME \
    && mkdir -p /etc/sudoers.d \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Install only essential Python packages for coding challenges
RUN apt-get update && apt-get install -y \
    python3-numpy \
    && rm -rf /var/lib/apt/lists/*

# Create working directory and set ownership
WORKDIR /app
RUN mkdir -p /app/solutions \
    && chown -R $USERNAME:$USERNAME /app

# Display installed versions (as root)
RUN echo "=== Coding Challenge Environment ===" \
    && echo "GCC: $(gcc --version | head -n1)" \
    && echo "G++: $(g++ --version | head -n1)" \
    && echo "Python: $(python3 --version)" \
    && echo "Java: $(java -version 2>&1 | head -n1)" \
    && echo "C# (.NET): $(dotnet --version)" \
    && echo "Node.js: $(node --version)" \
    && echo "=================================="

# Expose port for coding challenge server
EXPOSE 3000

# Switch to non-root user
USER $USERNAME

# Set default command
CMD ["/bin/bash"]
