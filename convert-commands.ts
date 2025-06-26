import * as fs from 'fs/promises';
import * as path from 'path';

interface SchemaProperty {
  type: string;
  description?: string;
  default?: any;
  enum?: string[];
  items?: any;
  properties?: Record<string, SchemaProperty>;
}

async function convertCommand(filePath: string) {
  console.log(`Converting: ${filePath}`);
  
  let content = await fs.readFile(filePath, 'utf-8');
  const originalContent = content;
  
  // 1. Remove Zod imports
  content = content.replace(/import \{ z \} from 'zod';\n/g, '');
  content = content.replace(/import \* as z from 'zod';\n/g, '');
  
  // 2. Extract command name and Zod schema
  const classMatch = content.match(/export class (\w+) extends BaseCommand/);
  if (!classMatch) return;
  
  const className = classMatch[1];
  
  // 3. Convert Zod schema to object schema
  const schemaMatch = content.match(/const \w+Schema = z\.object\(([^;]+)\);/s);
  if (schemaMatch) {
    // Extract schema name
    const schemaNameMatch = content.match(/const (\w+Schema) = z\.object/);
    const schemaName = schemaNameMatch ? schemaNameMatch[1] : '';
    
    // Convert the schema
    const zodSchema = schemaMatch[1];
    const objectSchema = convertZodToObject(zodSchema);
    
    // Replace Zod schema with object schema
    content = content.replace(
      /const \w+Schema = z\.object\([^;]+\);[\s\S]*?type \w+ = z\.infer<typeof \w+>;/s,
      ''
    );
    
    // Replace inputSchema assignment
    content = content.replace(
      new RegExp(`inputSchema = ${schemaName};`),
      `inputSchema = ${objectSchema};`
    );
  }
  
  // 4. Fix class declaration (remove generic)
  content = content.replace(
    /export class (\w+) extends BaseCommand<\w+>/,
    'export class $1 extends BaseCommand'
  );
  
  // 5. Convert execute to executeCommand
  content = content.replace(
    /async execute\([^)]+\): Promise<CommandResult>/,
    'async executeCommand(context: CommandContext): Promise<CommandResult>'
  );
  
  // 6. Replace args. with context.args.
  // But skip lines that are in validateArgs method
  const lines = content.split('\n');
  let inValidateArgs = false;
  const newLines = lines.map(line => {
    if (line.includes('validateArgs(args:')) {
      inValidateArgs = true;
    }
    if (inValidateArgs && line.trim() === '}') {
      inValidateArgs = false;
      return line;
    }
    
    if (!inValidateArgs && !line.includes('validateArgs')) {
      // Replace standalone args.
      line = line.replace(/\bargs\./g, 'context.args.');
    }
    
    return line;
  });
  content = newLines.join('\n');
  
  // 7. Fix return statements
  content = content.replace(
    /return \{\s*content:\s*\[\{\s*type:\s*'text',\s*text:/g,
    'return {\n        success: true,\n        data: '
  );
  
  // Remove closing }] and replace with just }
  content = content.replace(/\}\s*\]\s*\};/g, '\n      };');
  
  // 8. Add success: false to error returns
  content = content.replace(
    /return \{\s*data:\s*\[\{\s*type:\s*'text',\s*text:\s*`[^`]+`\s*\}\s*\]\s*\};/g,
    (match) => {
      if (match.includes('Failed') || match.includes('Error')) {
        return match.replace('return {', 'return {\n        success: false,');
      }
      return match;
    }
  );
  
  // Write back only if changed
  if (content !== originalContent) {
    await fs.writeFile(filePath, content);
    console.log(`✅ Converted: ${filePath}`);
  }
}

function convertZodToObject(zodSchema: string): string {
  // This is a simplified converter - you might need to enhance it
  let result = '{\n    type: \'object\' as const,\n    properties: {\n';
  
  // Extract properties
  const propMatches = zodSchema.matchAll(/(\w+):\s*z\.(\w+)\([^)]*\)/g);
  const properties: Record<string, any> = {};
  const required: string[] = [];
  
  for (const match of propMatches) {
    const [, propName, zodType] = match;
    const prop: any = {};
    
    // Map Zod types to JSON Schema types
    switch (zodType) {
      case 'string':
        prop.type = 'string';
        break;
      case 'number':
        prop.type = 'number';
        break;
      case 'boolean':
        prop.type = 'boolean';
        break;
      case 'array':
        prop.type = 'array';
        break;
      case 'object':
        prop.type = 'object';
        break;
    }
    
    properties[propName] = prop;
    required.push(propName);
  }
  
  // Build the properties
  for (const [name, prop] of Object.entries(properties)) {
    result += `      ${name}: {\n`;
    result += `        type: '${prop.type}' as const,\n`;
    result += `        description: '${name}'\n`;
    result += `      },\n`;
  }
  
  result += '    },\n';
  result += `    required: [${required.map(r => `'${r}'`).join(', ')}]\n`;
  result += '  }';
  
  return result;
}

async function main() {
  const baseDir = '/Users/sangbinna/mcp/ai-filesystem-mcp/src/commands/implementations';
  
  // Get all TypeScript files
  const files: string[] = [];
  
  async function scanDir(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.name.endsWith('.ts') && entry.name !== 'index.ts') {
        files.push(fullPath);
      }
    }
  }
  
  await scanDir(baseDir);
  
  console.log(`Found ${files.length} command files to convert\n`);
  
  for (const file of files) {
    try {
      await convertCommand(file);
    } catch (error) {
      console.error(`❌ Error converting ${file}:`, error);
    }
  }
  
  console.log('\n✅ Conversion complete!');
}

main().catch(console.error);
