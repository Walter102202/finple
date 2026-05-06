/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@anthropic-ai/claude-agent-sdk',
      '@anthropic-ai/claude-agent-sdk-linux-x64',
      '@anthropic-ai/claude-agent-sdk-linux-arm64',
    ],
    outputFileTracingIncludes: {
      '/api/chat': [
        './node_modules/@anthropic-ai/claude-agent-sdk/**/*',
        './node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/**/*',
        './node_modules/@anthropic-ai/claude-agent-sdk-linux-arm64/**/*',
        './.claude/skills/**/*',
      ],
    },
  },
}

export default nextConfig
