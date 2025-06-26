import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { FileWatcherService } from '../../../core/services/monitoring/FileWatcherService.js';

const FileWatcherArgsSchema = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['start', 'stop', 'status', 'events'],
        description: 'Action to perform with the file watcher'
      },
      path: {
        type: 'string',
        description: 'Path to watch or manage'
      },
      events: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['add', 'change', 'unlink', 'addDir', 'unlinkDir', 'all']
        },
        description: 'Events to watch for',
        default: ['all']
      },
      recursive: {
        type: 'boolean',
        description: 'Watch recursively for directories',
        default: true
      },
      ignorePatterns: {
        type: 'array',
        items: { type: 'string' },
        description: 'Patterns to ignore (glob patterns)'
      }
    },
    required: ['action', 'path']
  };


export class FileWatcherCommand extends BaseCommand {
  readonly name = 'file_watcher';
  readonly description = 'Watch files and directories for changes';
  readonly inputSchema = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['start', 'stop', 'status', 'events'],
        description: 'Action to perform with the file watcher'
      },
      path: {
        type: 'string',
        description: 'Path to watch or manage'
      },
      events: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['add', 'change', 'unlink', 'addDir', 'unlinkDir', 'all']
        },
        description: 'Events to watch for',
        default: ['all']
      },
      recursive: {
        type: 'boolean',
        description: 'Watch recursively for directories',
        default: true
      },
      ignorePatterns: {
        type: 'array',
        items: { type: 'string' },
        description: 'Patterns to ignore (glob patterns)'
      }
    },
    required: ['action', 'path'],
    additionalProperties: false
  };


  protected validateArgs(args: Record<string, any>): void {
    if (!args.action || typeof args.action !== 'string') {
      throw new Error('action is required and must be a string');
    }
    
    const validActions = ['start', 'stop', 'status', 'events'];
    if (!validActions.includes(args.action)) {
      throw new Error(`action must be one of: ${validActions.join(', ')}`);
    }
    
    if (!args.path || typeof args.path !== 'string') {
      throw new Error('path is required and must be a string');
    }
    
    if (args.events) {
      if (!Array.isArray(args.events)) {
        throw new Error('events must be an array');
      }
      
      const validEvents = ['add', 'change', 'unlink', 'addDir', 'unlinkDir', 'all'];
      for (const [index, event] of args.events.entries()) {
        if (typeof event !== 'string' || !validEvents.includes(event)) {
          throw new Error(`Event ${index}: must be one of: ${validEvents.join(', ')}`);
        }
      }
    }
    
    if (args.recursive !== undefined && typeof args.recursive !== 'boolean') {
      throw new Error('recursive must be a boolean');
    }
    
    if (args.ignorePatterns) {
      if (!Array.isArray(args.ignorePatterns)) {
        throw new Error('ignorePatterns must be an array');
      }
      
      for (const [index, pattern] of args.ignorePatterns.entries()) {
        if (typeof pattern !== 'string') {
          throw new Error(`Ignore pattern ${index}: must be a string`);
        }
      }
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const watcherService = context.container.getService<FileWatcherService>('fileWatcherService');
      
      switch (context.args.action) {
        case 'start':
          const watcherId = await watcherService.startWatching(
            context.args.path,
            {
              events: context.args.events,
              recursive: context.args.recursive,
              ignorePatterns: context.args.ignorePatterns
            }
          );
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: 'File watcher started',
                watcherId,
                path: context.args.path,
                recursive: context.args.recursive,
                events: context.args.events || ['all']
              }, null, 2)
            }]
          };
          
        case 'stop':
          await watcherService.stopWatching(context.args.path);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: 'File watcher stopped',
                path: context.args.path
              }, null, 2)
            }]
          };
          
        case 'status':
          const status = await watcherService.getStatus(context.args.path);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                path: context.args.path,
                active: status.active,
                startedAt: status.startedAt,
                eventsCount: status.eventsCount,
                lastEvent: status.lastEvent
              }, null, 2)
            }]
          };
          
        case 'events':
          const events = await watcherService.getRecentEvents(context.args.path);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                path: context.args.path,
                events: events
              }, null, 2)
            }]
          };
          
        default:
          throw new Error(`Unknown action: ${context.args.action}`);
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to execute file watcher command: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
