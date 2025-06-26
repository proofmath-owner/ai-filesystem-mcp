#!/usr/bin/env python3
"""
Fix all TypeScript compilation errors in ai-filesystem-mcp project
This script fixes validateArgs methods and other common issues
"""

import os
import re
import glob
from typing import List, Tuple

BASE_DIR = '/Users/sangbinna/mcp/ai-filesystem-mcp'

def get_all_command_files() -> List[str]:
    """Get all command implementation files"""
    pattern = os.path.join(BASE_DIR, 'src/commands/implementations/**/*.ts')
    return glob.glob(pattern, recursive=True)

def fix_validate_args_in_file(filepath: str) -> bool:
    """Fix validateArgs method in a single file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'protected validateArgs(args: Record<string, any>): void {' not in content:
        return False
    
    # Split into lines for line-by-line processing
    lines = content.split('\n')
    in_validate_args = False
    method_start_indent = None
    modified = False
    
    for i in range(len(lines)):
        line = lines[i]
        
        # Check if we're entering validateArgs method
        if 'protected validateArgs(args: Record<string, any>): void {' in line:
            in_validate_args = True
            # Get the indentation level
            method_start_indent = len(line) - len(line.lstrip())
            continue
        
        # Check if we're leaving the method
        if in_validate_args and line.strip() == '}':
            current_indent = len(line) - len(line.lstrip())
            # If the closing brace is at the same level as method declaration
            if current_indent == method_start_indent:
                in_validate_args = False
                continue
        
        # Replace context.args with args inside validateArgs
        if in_validate_args and 'context.args' in line:
            lines[i] = line.replace('context.args', 'args')
            modified = True
    
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        return True
    
    return False

def fix_specific_files():
    """Fix specific known issues in certain files"""
    fixes = [
        # These were already fixed manually but double-check
        (
            'src/commands/implementations/git/GitHubCreatePRCommand.ts',
            'await gitService.createPullRequest(args)',
            'await gitService.createPullRequest(context.args)'
        ),
        (
            'src/commands/implementations/git/GitLogCommand.ts',
            'await gitService.gitLog(args)',
            'await gitService.gitLog(context.args)'
        ),
    ]
    
    fixed = []
    for relative_path, find_text, replace_text in fixes:
        filepath = os.path.join(BASE_DIR, relative_path)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if find_text in content:
                content = content.replace(find_text, replace_text)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                fixed.append(os.path.basename(filepath))
    
    return fixed

def add_missing_imports():
    """Add missing imports where needed"""
    pattern = os.path.join(BASE_DIR, 'src/**/*.ts')
    files = glob.glob(pattern, recursive=True)
    
    added_imports = []
    
    for filepath in files:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file uses z.object or similar but doesn't import z
        if re.search(r'\bz\.\w+', content) and "import { z }" not in content:
            lines = content.split('\n')
            
            # Find where to add the import (after other imports)
            import_index = 0
            for i, line in enumerate(lines):
                if line.startswith('import'):
                    import_index = i + 1
                elif import_index > 0 and not line.strip():
                    # Found empty line after imports
                    break
            
            # Add the import
            lines.insert(import_index, "import { z } from 'zod';")
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write('\n'.join(lines))
            
            added_imports.append(os.path.basename(filepath))
    
    return added_imports

def main():
    print("=== Fixing TypeScript Compilation Errors ===\n")
    
    # Step 1: Fix validateArgs methods
    print("Step 1: Fixing validateArgs methods...")
    command_files = get_all_command_files()
    fixed_validate_args = []
    
    for filepath in command_files:
        if fix_validate_args_in_file(filepath):
            fixed_validate_args.append(os.path.basename(filepath))
    
    print(f"  Fixed {len(fixed_validate_args)} files:")
    for filename in fixed_validate_args[:10]:  # Show first 10
        print(f"    - {filename}")
    if len(fixed_validate_args) > 10:
        print(f"    ... and {len(fixed_validate_args) - 10} more")
    
    # Step 2: Fix specific files
    print("\nStep 2: Fixing specific file issues...")
    fixed_specific = fix_specific_files()
    if fixed_specific:
        for filename in fixed_specific:
            print(f"  Fixed: {filename}")
    else:
        print("  No specific fixes needed")
    
    # Step 3: Add missing imports
    print("\nStep 3: Adding missing imports...")
    added_imports = add_missing_imports()
    if added_imports:
        for filename in added_imports:
            print(f"  Added z import to: {filename}")
    else:
        print("  No missing imports found")
    
    print("\n=== All fixes completed! ===")
    print("\nNext steps:")
    print("1. Run 'npm run build' to check remaining errors")
    print("2. If there are still errors, check build-errors.log")
    
    # Count total fixes
    total_fixes = len(fixed_validate_args) + len(fixed_specific) + len(added_imports)
    print(f"\nTotal files modified: {total_fixes}")

if __name__ == '__main__':
    main()
