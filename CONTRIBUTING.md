# Contributing to graylens

Thank you for your interest in contributing to graylens!

## Development Workflow

This project follows a strict git workflow:

1. **One branch per phase**: Each feature or fix is developed on its own branch named `phase-NN-short-slug`
2. **Atomic commits**: Each commit addresses a single concern
3. **One commit, one push**: After every commit, immediately push to the remote branch
4. **No direct pushes to main**: All changes must go through pull requests

## Commit Messages

Use Conventional Commits format:

- `feat:` for new features
- `fix:` for bug fixes
- `chore:` for maintenance tasks
- `docs:` for documentation changes
- `test:` for adding or updating tests
- `style:` for code style changes
- `refactor:` for code refactoring

Keep commit messages under 72 characters, in imperative mood, without trailing periods.

## Getting Started

1. Fork the repository
2. Create a new branch from `main`
3. Make your changes following the workflow above
4. Open a pull request into `main`

## Code Style

- TypeScript strict mode is enabled
- Use small, single-responsibility modules
- Keep WebGPU setup isolated from shader logic
- Write WGSL shaders in separate `.wgsl` files

## Testing

Run tests with:

```bash
npm test
```

## Questions?

Feel free to open an issue for any questions or suggestions.
