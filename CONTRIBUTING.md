# Contributing to Ayoto

Thank you for your interest in contributing to Ayoto! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We're building a community around this project.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/FundyJo/Ayoto/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (OS, version, etc.)
   - Screenshots if applicable

### Suggesting Features

1. Check existing issues and discussions
2. Create a new issue with the "enhancement" label
3. Describe:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternative solutions considered
   - Additional context

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push to your fork
7. Open a Pull Request

## Development Setup

See [INSTALLATION.md](INSTALLATION.md) for detailed setup instructions.

### Quick Start

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Ayoto.git
cd Ayoto

# Install dependencies
cd frontend && npm install && cd ..

# Run in development mode
cd src-tauri
cargo tauri dev
```

## Project Structure

```
Ayoto/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── App.tsx       # Main component
│   │   └── ...
│   └── package.json
├── src-tauri/            # Rust backend
│   ├── src/
│   │   ├── main.rs       # Entry point
│   │   ├── plugin.rs     # Plugin system
│   │   ├── miracast.rs   # Miracast support
│   │   └── providers/    # Anime providers
│   └── Cargo.toml
└── docs/                 # Documentation
```

## Coding Standards

### Rust

- Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `cargo fmt` before committing
- Run `cargo clippy` and fix warnings
- Add tests for new functionality
- Document public APIs

```bash
# Format code
cargo fmt

# Check for issues
cargo clippy

# Run tests
cargo test
```

### TypeScript/React

- Follow [React Best Practices](https://react.dev/learn)
- Use TypeScript for type safety
- Run linter before committing
- Use functional components and hooks
- Keep components small and focused

```bash
# Lint code
npm run lint

# Format code (if configured)
npm run format
```

### Naming Conventions

- **Rust**: snake_case for functions/variables, PascalCase for types
- **TypeScript**: camelCase for functions/variables, PascalCase for components/types
- **Files**: kebab-case for regular files, PascalCase for React components

### Comments

- Write clear, concise comments
- Document complex logic
- Use JSDoc/Rustdoc for public APIs
- Keep comments up-to-date with code changes

Example Rust documentation:

```rust
/// Searches for anime matching the given query.
///
/// # Arguments
///
/// * `query` - The search term to look for
///
/// # Returns
///
/// A vector of matching anime entries
///
/// # Errors
///
/// Returns an error if the API request fails
pub async fn search(&self, query: &str) -> Result<Vec<Anime>, Box<dyn std::error::Error>> {
    // Implementation
}
```

Example TypeScript documentation:

```typescript
/**
 * Searches for anime using the backend API
 * @param query - Search term
 * @returns Promise with array of anime results
 */
async function searchAnime(query: string): Promise<Anime[]> {
  // Implementation
}
```

## Creating Anime Provider Plugins

See [PLUGIN_GUIDE.md](PLUGIN_GUIDE.md) for detailed instructions on creating provider plugins.

### Quick Plugin Checklist

- [ ] Implement `AnimeProvider` trait
- [ ] Add error handling
- [ ] Test with real API (if applicable)
- [ ] Add to providers module
- [ ] Register in main.rs
- [ ] Update documentation
- [ ] Add tests

## Testing

### Unit Tests

```bash
# Run Rust tests
cd src-tauri
cargo test

# Run with coverage (requires cargo-tarpaulin)
cargo tarpaulin --out Html
```

### Integration Tests

```bash
# Test the full application
cargo tauri dev

# Test specific features
# - Search functionality
# - Episode playback
# - Miracast device discovery
# - Provider switching
```

### Manual Testing Checklist

- [ ] Search returns results
- [ ] Anime details load correctly
- [ ] Episodes display properly
- [ ] Cast device scanning works
- [ ] UI is responsive
- [ ] No console errors
- [ ] Works on target platform

## Documentation

### When to Update Docs

- Adding new features
- Changing APIs
- Fixing bugs that affect usage
- Adding configuration options

### Documentation Files

- `README.md` - Project overview and quick start
- `INSTALLATION.md` - Installation instructions
- `PLUGIN_GUIDE.md` - Plugin development guide
- `CONTRIBUTING.md` - This file
- Code comments - Inline documentation

## Commit Messages

Use clear, descriptive commit messages:

### Format

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting)
- `refactor` - Code refactoring
- `test` - Adding/updating tests
- `chore` - Maintenance tasks

### Examples

```bash
feat(plugin): add support for GraphQL providers

fix(ui): correct episode thumbnail loading

docs(readme): update installation instructions

refactor(miracast): simplify device discovery logic
```

## Pull Request Process

1. **Update Documentation**: Ensure docs reflect your changes
2. **Add Tests**: Include tests for new functionality
3. **Run Linters**: Fix all linting issues
4. **Update CHANGELOG**: Add entry for your changes
5. **Describe Changes**: Write clear PR description
6. **Request Review**: Tag relevant reviewers

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How the changes were tested

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
- [ ] Tests pass locally
```

## Release Process

1. Update version in `Cargo.toml` and `package.json`
2. Update `CHANGELOG.md`
3. Create release branch: `release/v1.0.0`
4. Test thoroughly
5. Merge to main
6. Tag release: `git tag v1.0.0`
7. Push tags: `git push --tags`
8. Create GitHub release with notes

## Getting Help

- Check existing documentation
- Search [Issues](https://github.com/FundyJo/Ayoto/issues)
- Ask in [Discussions](https://github.com/FundyJo/Ayoto/discussions)
- Join our community chat (if available)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in the about section

Thank you for contributing to Ayoto! 🎌