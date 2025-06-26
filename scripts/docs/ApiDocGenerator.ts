#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export interface CommandInfo {
  name: string;
  description: string;
  category: string;
  parameters: ParameterInfo[];
  examples: ExampleInfo[];
  returnType: string;
  filePath: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: any;
}

export interface ExampleInfo {
  title: string;
  description: string;
  code: string;
  response: string;
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
  };
}

export class ApiDocGenerator {
  private readonly sourceDir: string;
  private readonly outputDir: string;
  private commands: CommandInfo[] = [];

  constructor(sourceDir = './src/core/commands', outputDir = './docs/api') {
    this.sourceDir = sourceDir;
    this.outputDir = outputDir;
  }

  // 모든 명령어 스캔
  async scanCommands(): Promise<CommandInfo[]> {
    console.log('🔍 Scanning commands...');
    
    const commandFiles = await glob('**/*Commands.ts', {
      cwd: this.sourceDir,
      absolute: true
    });

    this.commands = [];
    
    for (const filePath of commandFiles) {
      const commands = await this.extractCommandsFromFile(filePath);
      this.commands.push(...commands);
    }

    console.log(`✅ Found ${this.commands.length} commands`);
    return this.commands;
  }

  // 파일에서 명령어 정보 추출
  private async extractCommandsFromFile(filePath: string): Promise<CommandInfo[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const commands: CommandInfo[] = [];

    // 클래스 이름 추출
    const classMatch = content.match(/export class (\w+Command)/g);
    if (!classMatch) return commands;

    for (const classDeclaration of classMatch) {
      const className = classDeclaration.match(/(\w+Command)/)?.[1];
      if (!className) continue;

      const commandInfo = await this.extractCommandInfo(content, className, filePath);
      if (commandInfo) {
        commands.push(commandInfo);
      }
    }

    return commands;
  }

  // 개별 명령어 정보 추출
  private async extractCommandInfo(content: string, className: string, filePath: string): Promise<CommandInfo | null> {
    try {
      // 명령어 이름 추출 (스키마에서)
      const schemaMatch = content.match(new RegExp(`name:\\s*['"]([^'"]+)['"]`, 'g'));
      const nameMatch = schemaMatch?.[0]?.match(/name:\s*['"]([^'"]+)['"]/);
      const name = nameMatch?.[1];

      if (!name) return null;

      // 설명 추출
      const descriptionMatch = content.match(new RegExp(`description:\\s*['"]([^'"]+)['"]`, 'g'));
      const description = descriptionMatch?.[0]?.match(/description:\s*['"]([^'"]+)['"]/)?.[1] || '';

      // 카테고리 추출 (파일 경로 기반)
      const category = this.extractCategory(filePath);

      // 파라미터 정보 추출
      const parameters = this.extractParameters(content);

      // 예제 추출 (주석에서)
      const examples = this.extractExamples(content, name);

      // 리턴 타입 추출
      const returnType = 'CommandResult';

      return {
        name,
        description,
        category,
        parameters,
        examples,
        returnType,
        filePath
      };
    } catch (error) {
      console.error(`Error extracting command info from ${className}:`, error);
      return null;
    }
  }

  // 카테고리 추출
  private extractCategory(filePath: string): string {
    const pathParts = filePath.split(path.sep);
    const commandDir = pathParts[pathParts.length - 2];
    
    const categoryMap: Record<string, string> = {
      'file': 'File Operations',
      'directory': 'Directory Operations', 
      'search': 'Search Operations',
      'git': 'Git Operations',
      'code': 'Code Analysis',
      'security': 'Security Operations',
      'system': 'System Operations',
      'batch': 'Batch Operations',
      'metadata': 'Metadata Operations',
      'transaction': 'Transaction Operations',
      'watcher': 'File Watching',
      'cloud': 'Cloud Operations',
      'archive': 'Archive Operations',
      'refactoring': 'Refactoring Operations'
    };

    return categoryMap[commandDir] || 'Utility Operations';
  }

  // 파라미터 정보 추출
  private extractParameters(content: string): ParameterInfo[] {
    const parameters: ParameterInfo[] = [];
    
    // inputSchema의 properties 섹션 찾기
    const propertiesMatch = content.match(/properties:\s*{([^}]+)}/s);
    if (!propertiesMatch) return parameters;

    const propertiesContent = propertiesMatch[1];
    
    // 각 속성 추출
    const propertyMatches = propertiesContent.matchAll(/(\w+):\s*{([^}]+)}/g);
    
    for (const match of propertyMatches) {
      const name = match[1];
      const propertyContent = match[2];
      
      // 타입 추출
      const typeMatch = propertyContent.match(/type:\s*['"]([^'"]+)['"]/);
      const type = typeMatch?.[1] || 'string';
      
      // 설명 추출
      const descMatch = propertyContent.match(/description:\s*['"]([^'"]+)['"]/);
      const description = descMatch?.[1] || '';
      
      // 기본값 추출
      const defaultMatch = propertyContent.match(/default:\s*([^,\n]+)/);
      const defaultValue = defaultMatch?.[1]?.trim();
      
      parameters.push({
        name,
        type,
        required: content.includes(`required: [${name}]`) || content.includes(`'${name}'`),
        description,
        default: defaultValue
      });
    }

    return parameters;
  }

  // 예제 추출
  private extractExamples(content: string, commandName: string): ExampleInfo[] {
    const examples: ExampleInfo[] = [];
    
    // 기본 예제 생성
    examples.push({
      title: `Basic ${commandName} usage`,
      description: `How to use the ${commandName} command`,
      code: `await mcp.execute('${commandName}', { /* parameters */ });`,
      response: `{ "content": [{ "type": "text", "text": "Command executed successfully" }] }`
    });

    return examples;
  }

  // OpenAPI 스펙 생성
  async generateOpenAPI(): Promise<OpenAPISpec> {
    console.log('📝 Generating OpenAPI specification...');
    
    if (this.commands.length === 0) {
      await this.scanCommands();
    }

    const spec: OpenAPISpec = {
      openapi: '3.0.3',
      info: {
        title: 'AI FileSystem MCP API',
        version: '2.0.0',
        description: 'AI-optimized Model Context Protocol server for intelligent file system operations'
      },
      servers: [
        {
          url: 'mcp://ai-filesystem',
          description: 'MCP Server'
        }
      ],
      paths: {},
      components: {
        schemas: {
          CommandResult: {
            type: 'object',
            properties: {
              content: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    text: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    };

    // 각 명령어를 path로 추가
    for (const command of this.commands) {
      spec.paths[`/${command.name}`] = {
        post: {
          summary: command.description,
          tags: [command.category],
          requestBody: {
            content: {
              'application/json': {
                schema: this.generateParameterSchema(command.parameters)
              }
            }
          },
          responses: {
            '200': {
              description: 'Command executed successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CommandResult' }
                }
              }
            }
          }
        }
      };
    }

    return spec;
  }

  // 파라미터 스키마 생성
  private generateParameterSchema(parameters: ParameterInfo[]): any {
    const schema: any = {
      type: 'object',
      properties: {},
      required: []
    };

    for (const param of parameters) {
      schema.properties[param.name] = {
        type: param.type,
        description: param.description
      };

      if (param.default !== undefined) {
        schema.properties[param.name].default = param.default;
      }

      if (param.required) {
        schema.required.push(param.name);
      }
    }

    return schema;
  }

  // Markdown 문서 생성
  async generateMarkdown(): Promise<string> {
    console.log('📄 Generating Markdown documentation...');
    
    if (this.commands.length === 0) {
      await this.scanCommands();
    }

    let markdown = `# AI FileSystem MCP API Reference

AI-optimized Model Context Protocol server for intelligent file system operations.

## Overview

This API provides ${this.commands.length} commands across ${this.getCategories().length} categories for comprehensive file system management.

## Categories

`;

    // 카테고리별 목차
    const categories = this.getCategories();
    for (const category of categories) {
      const categoryCommands = this.commands.filter(cmd => cmd.category === category);
      markdown += `### ${category} (${categoryCommands.length} commands)\n\n`;
      
      for (const command of categoryCommands) {
        markdown += `- [\`${command.name}\`](#${command.name.toLowerCase().replace(/_/g, '-')}): ${command.description}\n`;
      }
      markdown += '\n';
    }

    markdown += '## Commands\n\n';

    // 각 명령어 상세 문서
    for (const command of this.commands) {
      markdown += this.generateCommandMarkdown(command);
    }

    return markdown;
  }

  // 개별 명령어 Markdown 생성
  private generateCommandMarkdown(command: CommandInfo): string {
    let md = `### ${command.name}

**Category:** ${command.category}

${command.description}

#### Parameters

`;

    if (command.parameters.length === 0) {
      md += 'No parameters required.\n\n';
    } else {
      md += '| Name | Type | Required | Description | Default |\n';
      md += '|------|------|----------|-------------|----------|\n';
      
      for (const param of command.parameters) {
        const required = param.required ? '✅' : '❌';
        const defaultVal = param.default || '-';
        md += `| \`${param.name}\` | \`${param.type}\` | ${required} | ${param.description} | \`${defaultVal}\` |\n`;
      }
      md += '\n';
    }

    // 예제
    if (command.examples.length > 0) {
      md += '#### Examples\n\n';
      
      for (const example of command.examples) {
        md += `**${example.title}**\n\n`;
        md += `${example.description}\n\n`;
        md += '```typescript\n';
        md += example.code + '\n';
        md += '```\n\n';
        md += 'Response:\n';
        md += '```json\n';
        md += example.response + '\n';
        md += '```\n\n';
      }
    }

    md += '---\n\n';
    return md;
  }

  // 고유 카테고리 목록 반환
  private getCategories(): string[] {
    return [...new Set(this.commands.map(cmd => cmd.category))].sort();
  }

  // 인터랙티브 데모 생성
  async generateInteractiveDemo(): Promise<void> {
    console.log('🎮 Generating interactive demo...');
    
    const demoHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI FileSystem MCP - Interactive Demo</title>
    <style>
        body {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .title {
            text-align: center;
            color: #4CAF50;
            margin-bottom: 30px;
        }
        .demo-panel {
            display: flex;
            gap: 20px;
            height: 80vh;
        }
        .commands-panel {
            flex: 1;
            background: #252526;
            border-radius: 8px;
            padding: 20px;
            overflow-y: auto;
        }
        .demo-panel-right {
            flex: 2;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .input-panel {
            background: #252526;
            border-radius: 8px;
            padding: 20px;
            height: 40%;
        }
        .output-panel {
            background: #252526;
            border-radius: 8px;
            padding: 20px;
            height: 60%;
            overflow-y: auto;
        }
        .command-item {
            padding: 10px;
            margin: 5px 0;
            background: #2d2d30;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .command-item:hover {
            background: #3e3e42;
        }
        .command-name {
            color: #569cd6;
            font-weight: bold;
        }
        .command-desc {
            color: #9cdcfe;
            font-size: 12px;
            margin-top: 5px;
        }
        .input-area {
            width: 100%;
            height: 80%;
            background: #1e1e1e;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            padding: 10px;
            color: #d4d4d4;
            font-family: inherit;
            font-size: 14px;
            resize: none;
        }
        .execute-btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        }
        .execute-btn:hover {
            background: #45a049;
        }
        .output-content {
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.5;
        }
        .error {
            color: #f44336;
        }
        .success {
            color: #4CAF50;
        }
        .category-header {
            color: #ffeb3b;
            font-weight: bold;
            margin: 20px 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 1px solid #3e3e42;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">🤖 AI FileSystem MCP - Interactive Demo</h1>
        
        <div class="demo-panel">
            <div class="commands-panel">
                <h3>Available Commands</h3>
                <div id="commands-list"></div>
            </div>
            
            <div class="demo-panel-right">
                <div class="input-panel">
                    <h3>Command Input</h3>
                    <textarea id="command-input" class="input-area" placeholder="Enter your MCP command here..."></textarea>
                    <button id="execute-btn" class="execute-btn">Execute Command</button>
                </div>
                
                <div class="output-panel">
                    <h3>Output</h3>
                    <div id="output-content" class="output-content">Welcome to AI FileSystem MCP Demo!
Click on a command from the left panel to get started.</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const commands = ${JSON.stringify(this.commands, null, 2)};
        
        // 명령어 목록 렌더링
        function renderCommands() {
            const commandsList = document.getElementById('commands-list');
            const categories = {};
            
            // 카테고리별로 그룹화
            commands.forEach(cmd => {
                if (!categories[cmd.category]) {
                    categories[cmd.category] = [];
                }
                categories[cmd.category].push(cmd);
            });
            
            let html = '';
            Object.keys(categories).sort().forEach(category => {
                html += \`<div class="category-header">\${category}</div>\`;
                categories[category].forEach(cmd => {
                    html += \`
                        <div class="command-item" onclick="selectCommand('\${cmd.name}')">
                            <div class="command-name">\${cmd.name}</div>
                            <div class="command-desc">\${cmd.description}</div>
                        </div>
                    \`;
                });
            });
            
            commandsList.innerHTML = html;
        }
        
        // 명령어 선택
        function selectCommand(commandName) {
            const command = commands.find(cmd => cmd.name === commandName);
            if (!command) return;
            
            // 샘플 입력 생성
            const sampleInput = {
                command: commandName,
                arguments: {}
            };
            
            // 파라미터가 있으면 예시 값 추가
            command.parameters.forEach(param => {
                if (param.type === 'string') {
                    sampleInput.arguments[param.name] = param.default || 'example_value';
                } else if (param.type === 'boolean') {
                    sampleInput.arguments[param.name] = param.default || true;
                } else if (param.type === 'number') {
                    sampleInput.arguments[param.name] = param.default || 0;
                } else {
                    sampleInput.arguments[param.name] = param.default || null;
                }
            });
            
            document.getElementById('command-input').value = JSON.stringify(sampleInput, null, 2);
        }
        
        // 명령어 실행 (시뮬레이트)
        function executeCommand() {
            const input = document.getElementById('command-input').value;
            const output = document.getElementById('output-content');
            
            try {
                const commandData = JSON.parse(input);
                
                // 실행 시뮬레이션
                output.innerHTML = \`<span class="success">✅ Command executed successfully!</span>

<strong>Command:</strong> \${commandData.command}
<strong>Arguments:</strong> \${JSON.stringify(commandData.arguments, null, 2)}

<strong>Response:</strong>
\${JSON.stringify({
    content: [{
        type: "text",
        text: \`Command '\${commandData.command}' executed with arguments: \${JSON.stringify(commandData.arguments)}\`
    }]
}, null, 2)}

<em>Note: This is a demo simulation. In a real environment, the command would execute actual operations.</em>\`;
                
            } catch (error) {
                output.innerHTML = \`<span class="error">❌ Error parsing command:</span>
\${error.message}

Please check your JSON syntax.\`;
            }
        }
        
        // 이벤트 리스너
        document.getElementById('execute-btn').addEventListener('click', executeCommand);
        document.getElementById('command-input').addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter') {
                executeCommand();
            }
        });
        
        // 초기화
        renderCommands();
    </script>
</body>
</html>`;

    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.writeFile(path.join(this.outputDir, 'interactive-demo.html'), demoHtml);
    console.log('✅ Interactive demo saved to docs/api/interactive-demo.html');
  }

  // 모든 문서 생성
  async generateAll(): Promise<void> {
    console.log('🚀 Starting API documentation generation...');
    
    // 출력 디렉토리 생성
    await fs.mkdir(this.outputDir, { recursive: true });
    
    // 명령어 스캔
    await this.scanCommands();
    
    // OpenAPI 스펙 생성
    const openApiSpec = await this.generateOpenAPI();
    await fs.writeFile(
      path.join(this.outputDir, 'openapi.json'),
      JSON.stringify(openApiSpec, null, 2)
    );
    
    // Markdown 문서 생성
    const markdown = await this.generateMarkdown();
    await fs.writeFile(
      path.join(this.outputDir, 'api-reference.md'),
      markdown
    );
    
    // 인터랙티브 데모 생성
    await this.generateInteractiveDemo();
    
    console.log('✅ API documentation generation completed!');
    console.log(`📁 Output directory: ${this.outputDir}`);
    console.log(`📄 Files generated:`);
    console.log(`   - openapi.json (OpenAPI specification)`);
    console.log(`   - api-reference.md (Markdown documentation)`);
    console.log(`   - interactive-demo.html (Interactive demo)`);
  }
}

// CLI 실행
async function main() {
  const generator = new ApiDocGenerator();
  await generator.generateAll();
}

// ESM 모듈 체크
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ApiDocGenerator;