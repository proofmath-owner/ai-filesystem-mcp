# Contributing to AI FileSystem MCP

First off, thank you for considering contributing to AI FileSystem MCP! 🎉

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if relevant**
- **Include your environment details** (OS, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- **Clear and descriptive title**
- **Step-by-step description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any alternatives you've considered**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes (`npm test`)
4. Make sure your code follows the existing style
5. Issue that pull request!

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/ai-filesystem-mcp.git
cd ai-filesystem-mcp

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build
npm run build
```

## Style Guide

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### TypeScript Style Guide

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Follow the existing code style

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for high code coverage
- Test edge cases

## Project Structure

```
ai-filesystem-mcp/
├── src/           # Source files
├── test/          # Test files
├── dist/          # Built files (git ignored)
├── docs/          # Documentation
└── examples/      # Example usage
```

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing! 💪
