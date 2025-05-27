# Git Commands Documentation 🔀

This document provides detailed information about the Git integration commands available in AI FileSystem MCP v2.1.1.

## Available Git Commands

### Repository Management

#### `git_init`
Initialize a new Git repository.

**Parameters:**
- `path` (string, optional): Directory path to initialize (defaults to current directory)
- `bare` (boolean, optional): Create a bare repository (default: false)

**Example:**
```javascript
await git_init({ path: "./my-project" })
await git_init({ path: "./server-repo", bare: true })
```

#### `git_clone`
Clone a repository from a URL.

**Parameters:**
- `url` (string, required): Repository URL
- `destination` (string, optional): Destination directory

**Example:**
```javascript
await git_clone({ 
  url: "https://github.com/user/repo.git",
  destination: "./local-repo"
})
```

### Staging & Commits

#### `git_add`
Stage files for commit.

**Parameters:**
- `files` (string | string[], required): File(s) to stage, or "." for all

**Example:**
```javascript
await git_add({ files: "." })  // Stage all changes
await git_add({ files: ["src/index.js", "README.md"] })  // Stage specific files
```

#### `git_commit`
Commit staged changes.

**Parameters:**
- `message` (string, required): Commit message
- `files` (string[], optional): Specific files to commit

**Example:**
```javascript
await git_commit({ message: "feat: add new feature" })
await git_commit({ 
  message: "fix: resolve bug in parser",
  files: ["src/parser.js", "test/parser.test.js"]
})
```

#### `git_status`
Get repository status.

**Parameters:** None

**Returns:**
- Modified files
- Added files
- Deleted files
- Untracked files
- Current branch
- Commits ahead/behind remote

**Example:**
```javascript
await git_status()
```

### Branch Operations

#### `git_branch`
Manage Git branches.

**Parameters:**
- `action` (string, optional): "list" | "create" | "delete" | "checkout" (default: "list")
- `name` (string, optional): Branch name (required for create/delete/checkout)
- `all` (boolean, optional): Show all branches including remotes (default: false)
- `force` (boolean, optional): Force delete (default: false)

**Examples:**
```javascript
// List branches
await git_branch({ action: "list" })
await git_branch({ action: "list", all: true })

// Create and switch to new branch
await git_branch({ action: "create", name: "feature/new-feature" })

// Delete branch
await git_branch({ action: "delete", name: "old-feature" })
await git_branch({ action: "delete", name: "stubborn-branch", force: true })

// Checkout branch
await git_branch({ action: "checkout", name: "develop" })
```

### Remote Operations

#### `git_push`
Push commits to remote repository.

**Parameters:**
- `remote` (string, optional): Remote name (default: "origin")
- `branch` (string, optional): Branch name (uses current branch if not specified)
- `force` (boolean, optional): Force push (default: false)

**Example:**
```javascript
await git_push()  // Push current branch to origin
await git_push({ remote: "upstream", branch: "main" })
await git_push({ force: true })  // Force push (use with caution!)
```

#### `git_pull`
Pull changes from remote repository.

**Parameters:**
- `remote` (string, optional): Remote name (default: "origin")
- `branch` (string, optional): Branch name

**Example:**
```javascript
await git_pull()  // Pull from origin
await git_pull({ remote: "upstream", branch: "main" })
```

### History & Inspection

#### `git_log`
View commit history.

**Parameters:**
- `limit` (number, optional): Number of commits to show (default: 10)

**Returns:** Array of commits with:
- `hash`: Commit hash
- `author`: Author name
- `date`: Commit date
- `message`: Commit message

**Example:**
```javascript
await git_log({ limit: 20 })
```

### GitHub Integration

#### `github_create_pr`
Create a pull request (requires GitHub CLI).

**Parameters:**
- `title` (string, required): PR title
- `body` (string, optional): PR description
- `base` (string, optional): Base branch

**Example:**
```javascript
await github_create_pr({
  title: "Add awesome feature",
  body: "## Description\nThis PR adds...\n\n## Changes\n- Added feature X\n- Fixed bug Y",
  base: "main"
})
```

## Error Handling

All Git commands include comprehensive error handling:

```javascript
try {
  await git_push({ remote: "origin", branch: "main" })
} catch (error) {
  // Error messages are descriptive and actionable
  console.error("Push failed:", error.message)
}
```

## Common Workflows

### Starting a New Project
```javascript
// 1. Initialize repository
await git_init({ path: "./my-project" })

// 2. Add initial files
await write_file({ path: "README.md", content: "# My Project" })
await write_file({ path: ".gitignore", content: "node_modules/\n*.log" })

// 3. Stage and commit
await git_add({ files: "." })
await git_commit({ message: "Initial commit" })

// 4. Add remote and push
// (Requires manual remote setup or github_create_repo)
await git_push({ remote: "origin", branch: "main" })
```

### Feature Branch Workflow
```javascript
// 1. Create feature branch
await git_branch({ action: "create", name: "feature/user-auth" })

// 2. Make changes
await write_file({ path: "src/auth.js", content: "// Auth logic" })

// 3. Commit changes
await git_add({ files: ["src/auth.js"] })
await git_commit({ message: "feat: implement user authentication" })

// 4. Push branch
await git_push({ branch: "feature/user-auth" })

// 5. Create PR
await github_create_pr({
  title: "Feature: User Authentication",
  body: "Implements JWT-based authentication"
})
```

### Syncing with Upstream
```javascript
// 1. Check current status
await git_status()

// 2. Pull latest changes
await git_pull({ remote: "origin", branch: "main" })

// 3. View recent commits
await git_log({ limit: 5 })
```

## Requirements

- Git must be installed on the system
- For GitHub commands: GitHub CLI (`gh`) must be installed and authenticated
- Proper file system permissions for the repository directory

## Future Enhancements

Coming soon in future updates:
- `git_merge`: Merge branches with conflict resolution
- `git_rebase`: Interactive rebasing
- `git_stash`: Stash and apply changes
- `git_diff`: View file differences
- `git_remote`: Manage remote repositories
- `git_tag`: Create and manage tags
- `github_create_repo`: Create GitHub repositories
- `github_list_prs`: List pull requests
- `github_create_issue`: Create GitHub issues

## Troubleshooting

### "Not a git repository" Error
- Ensure you're in a Git repository or use `git_init` first
- Check if `.git` directory exists

### GitHub CLI Not Found
- Install GitHub CLI: https://cli.github.com
- Authenticate with: `gh auth login`

### Permission Denied
- Check file permissions
- Ensure you have write access to the repository
- For remote operations, verify your SSH keys or credentials
