export class ErrorHandler {
  handleError(error: unknown): any {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error('MCP Server Error:', error);
    
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`
        }
      ]
    };
  }

  handleUnhandledRejection(reason: any, promise: Promise<any>): void {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  }

  handleUncaughtException(error: Error): void {
    console.error('Uncaught Exception:', error);
  }
}
