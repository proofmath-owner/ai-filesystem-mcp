#!/bin/bash
cd /Users/sangbinna/mcp/ai-filesystem-mcp

echo "=== Fixing all TypeScript compilation errors ==="

# 1. Fix all validateArgs methods
echo "1. Fixing validateArgs methods..."
for file in $(find src/commands/implementations -name "*.ts" -type f); do
    # Check if file has validateArgs
    if grep -q "protected validateArgs" "$file"; then
        # Use perl to replace context.args with args only inside validateArgs method
        perl -i -0pe 's/(protected validateArgs\(args: Record<string, any>\): void \{[^}]*?)context\.args\./$1args./gs' "$file"
        echo "  Fixed: $(basename $file)"
    fi
done

# 2. Fix specific known issues
echo -e "\n2. Fixing specific file issues..."

# GitHubCreatePRCommand - already fixed manually
# GitLogCommand - already fixed manually

# 3. Add missing z import where needed
echo -e "\n3. Checking for missing imports..."
for file in $(find src -name "*.ts" -type f); do
    # Check if file uses z. but doesn't import it
    if grep -q "z\." "$file" && ! grep -q "import { z }" "$file"; then
        # Add import at the beginning
        sed -i '1i\import { z } from "zod";' "$file"
        echo "  Added z import to: $(basename $file)"
    fi
done

# 4. Summary
echo -e "\n=== Fixes completed ==="
echo "Please run 'npm run build' to verify all errors are resolved."
