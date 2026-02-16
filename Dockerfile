# syntax=docker/dockerfile:1

# ── Stage 1: Build ────────────────────────────────────────────
# Keep builder and release on Debian 12 to avoid GLIBC ABI drift
# (`rust:1.93-slim` now tracks Debian 13 and can require newer glibc than distroless Debian 12).
FROM rust:1.93-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 1. Copy manifests to cache dependencies
COPY Cargo.toml Cargo.lock ./
# Create dummy main.rs to build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release --locked
RUN rm -rf src

# 2. Copy source code
COPY . .
# Touch main.rs to force rebuild
RUN touch src/main.rs
RUN cargo build --release --locked && \
    strip target/release/viziclaw

# ── Stage 2: Permissions & Config Prep ───────────────────────
FROM busybox:latest AS permissions
# Create directory structure (simplified workspace path)
RUN mkdir -p /viziclaw-data/.viziclaw /viziclaw-data/workspace

# Create minimal config for PRODUCTION (allows binding to public interfaces)
# NOTE: Provider configuration must be done via environment variables at runtime
RUN cat > /viziclaw-data/.viziclaw/config.toml << 'EOF'
workspace_dir = "/viziclaw-data/workspace"
config_path = "/viziclaw-data/.viziclaw/config.toml"
api_key = ""
default_provider = "openrouter"
default_model = "anthropic/claude-sonnet-4-20250514"
default_temperature = 0.7

[gateway]
port = 3000
host = "[::]"
allow_public_bind = true
EOF

RUN chown -R 65534:65534 /viziclaw-data

# ── Stage 3: Development Runtime (Debian) ────────────────────
FROM debian:bookworm-slim AS dev

# Install runtime dependencies + basic debug tools
RUN apt-get update && apt-get install -y \
    ca-certificates \
    openssl \
    curl \
    git \
    iputils-ping \
    vim \
    && rm -rf /var/lib/apt/lists/*

COPY --from=permissions /viziclaw-data /viziclaw-data
COPY --from=builder /app/target/release/viziclaw /usr/local/bin/viziclaw

# Overwrite minimal config with DEV template (Ollama defaults)
COPY dev/config.template.toml /viziclaw-data/.viziclaw/config.toml
RUN chown 65534:65534 /viziclaw-data/.viziclaw/config.toml

# Environment setup
# Use consistent workspace path
ENV VIZICLAW_WORKSPACE=/viziclaw-data/workspace
ENV HOME=/viziclaw-data
# Defaults for local dev (Ollama) - matches config.template.toml
ENV PROVIDER="ollama"
ENV VIZICLAW_MODEL="llama3.2"
ENV VIZICLAW_GATEWAY_PORT=3000

# Note: API_KEY is intentionally NOT set here to avoid confusion.
# It is set in config.toml as the Ollama URL.

WORKDIR /viziclaw-data
USER 65534:65534
EXPOSE 3000
ENTRYPOINT ["viziclaw"]
CMD ["gateway", "--port", "3000", "--host", "[::]"]

# ── Stage 4: Production Runtime (Distroless) ─────────────────
FROM gcr.io/distroless/cc-debian12:nonroot AS release

COPY --from=builder /app/target/release/viziclaw /usr/local/bin/viziclaw
COPY --from=permissions /viziclaw-data /viziclaw-data

# Environment setup
ENV VIZICLAW_WORKSPACE=/viziclaw-data/workspace
ENV HOME=/viziclaw-data
# Defaults for prod (OpenRouter)
ENV PROVIDER="openrouter"
ENV VIZICLAW_MODEL="anthropic/claude-sonnet-4-20250514"
ENV VIZICLAW_GATEWAY_PORT=3000

# API_KEY must be provided at runtime!

WORKDIR /viziclaw-data
USER 65534:65534
EXPOSE 3000
ENTRYPOINT ["viziclaw"]
CMD ["gateway", "--port", "3000", "--host", "[::]"]
