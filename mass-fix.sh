#!/bin/bash

echo "🔧 Mass fixing command files..."

# Fix all command files in each directory
for dir in batch code git monitoring search security utils; do
  echo "Processing $dir commands..."
  
  for file in src/commands/implementations/$dir/*.ts; do
    # Skip index.ts files
    if [[ $(basename "$file") == "index.ts" ]]; then
      continue
    fi
    
    # Check if file contains BaseCommand
    if grep -q "extends BaseCommand" "$file"; then
      echo "  Fixing: $file"
      
      # Create backup
      cp "$file" "$file.bak"
      
      # Fix imports
      sed -i '' 's/import { CommandResult } from/import { CommandResult, CommandContext } from/g' "$file"
      
      # Remove generic from BaseCommand
      sed -i '' 's/extends BaseCommand<[^>]*>/extends BaseCommand/g' "$file"
      
      # Change execute to executeCommand
      sed -i '' 's/async execute(/async executeCommand(context: CommandContext/g' "$file"
      sed -i '' 's/(args: [^)]*): Promise<CommandResult>/): Promise<CommandResult>/g' "$file"
      
      # Replace this.context.container with context.container
      sed -i '' 's/this\.context\.container/context.container/g' "$file"
      
      # Replace args. with context.args.
      sed -i '' 's/\bargs\./context.args./g' "$file"
      sed -i '' 's/(args\./(context.args./g' "$file"
      sed -i '' 's/{args\./{context.args./g' "$file"
      sed -i '' 's/\${args\./\${context.args./g' "$file"
    fi
  done
done

echo "✅ Command files fixed!"
