# Multi-language development environment with latest versions
FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Create non-root user
ARG USERNAME=developer
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Update package lists and install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install C and C++ (GCC latest)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    gdb \
    make \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Install Python 3.12 (latest stable) via deadsnakes PPA
RUN add-apt-repository ppa:deadsnakes/ppa -y \
    && apt-get update && apt-get install -y \
    python3.12 \
    python3.12-dev \
    python3.12-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.12 as default python3
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 1
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.12 1

# Install Java 21 (latest LTS)
RUN apt-get update && apt-get install -y \
    openjdk-21-jdk \
    openjdk-21-jre \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# Install .NET 8 (latest LTS)
RUN wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y dotnet-sdk-8.0 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 (latest LTS) and npm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install additional useful tools
RUN apt-get update && apt-get install -y \
    vim \
    nano \
    htop \
    tree \
    jq \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Create the non-root user
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Install Python packages commonly used for development
RUN python3 -m pip install --upgrade pip \
    && python3 -m pip install \
    requests \
    numpy \
    pandas \
    flask \
    django \
    pytest \
    black \
    flake8 \
    mypy

# Install Node.js global packages
RUN npm install -g \
    typescript \
    ts-node \
    nodemon \
    eslint \
    prettier \
    @types/node

# Create a working directory and set ownership
WORKDIR /app
RUN mkdir -p /app/c /app/cpp /app/python /app/java /app/csharp /app/javascript \
    && chown -R $USERNAME:$USERNAME /app

# Copy package files if they exist
COPY package*.json ./
COPY requirements.txt* ./

# Install Node.js dependencies if package.json exists
RUN if [ -f package.json ]; then npm install; fi

# Install Python dependencies if requirements.txt exists
RUN if [ -f requirements.txt ]; then pip3 install -r requirements.txt; fi

# Set ownership of installed packages
RUN chown -R $USERNAME:$USERNAME /usr/lib/node_modules /usr/local/lib/node_modules 2>/dev/null || true

# Display installed versions (as root)
RUN echo "=== Installed Versions ===" \
    && echo "GCC: $(gcc --version | head -n1)" \
    && echo "G++: $(g++ --version | head -n1)" \
    && echo "Python: $(python3 --version)" \
    && echo "Java: $(java -version 2>&1 | head -n1)" \
    && echo "C# (.NET): $(dotnet --version)" \
    && echo "Node.js: $(node --version)" \
    && echo "npm: $(npm --version)" \
    && echo "========================="

# Expose common development ports
EXPOSE 3000 5000 8000 8080

# Switch to non-root user
USER $USERNAME

# Add helpful aliases and environment setup for the user
RUN echo 'alias ll="ls -la"' >> /home/$USERNAME/.bashrc \
    && echo 'alias la="ls -A"' >> /home/$USERNAME/.bashrc \
    && echo 'alias l="ls -CF"' >> /home/$USERNAME/.bashrc \
    && echo 'export PS1="\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' >> /home/$USERNAME/.bashrc \
    && echo 'export PATH=$PATH:/home/$USERNAME/.local/bin' >> /home/$USERNAME/.bashrc

# Set default command
CMD ["/bin/bash"]
