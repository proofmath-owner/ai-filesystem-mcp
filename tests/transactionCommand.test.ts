import { describe, it, expect } from '@jest/globals';
import { TransactionCommand } from '../src/commands/implementations/batch/TransactionCommand.js';
import { ServiceContainer } from '../src/core/ServiceContainer.js';

// The command layer is the actual MCP-facing contract. These tests pin down
// validation behaviour and the result shape, so a refactor of internals
// cannot silently change what an MCP client sees.

describe('TransactionCommand — argument validation', () => {
  const cmd = new TransactionCommand();
  const container = new ServiceContainer();

  it('rejects missing operations array', async () => {
    const r = await cmd.execute({ args: {}, container });
    expect(r.isError).toBe(true);
    expect(r.error).toMatch(/operations/);
  });

  it('rejects empty operations array', async () => {
    const r = await cmd.execute({ args: { operations: [] }, container });
    expect(r.isError).toBe(true);
    expect(r.error).toMatch(/cannot be empty/);
  });

  it('rejects unknown op type', async () => {
    const r = await cmd.execute({
      args: { operations: [{ type: 'read', path: '/tmp/x' }] },
      container,
    });
    expect(r.isError).toBe(true);
    expect(r.error).toMatch(/must be one of/);
  });

  it('requires content on create', async () => {
    const r = await cmd.execute({
      args: { operations: [{ type: 'create', path: '/tmp/x' }] },
      container,
    });
    expect(r.isError).toBe(true);
    expect(r.error).toMatch(/content/);
  });

  it('requires destination on move', async () => {
    const r = await cmd.execute({
      args: { operations: [{ type: 'move', path: '/tmp/x' }] },
      container,
    });
    expect(r.isError).toBe(true);
    expect(r.error).toMatch(/destination/);
  });

  it('requires non-empty updates on update', async () => {
    const r = await cmd.execute({
      args: { operations: [{ type: 'update', path: '/tmp/x' }] },
      container,
    });
    expect(r.isError).toBe(true);
    expect(r.error).toMatch(/updates/);
  });

  it('exposes the five op types in the inputSchema enum', () => {
    const itemsAny = (cmd.inputSchema as any).properties.operations.items;
    const enumVals = itemsAny.properties.type.enum as string[];
    expect(enumVals.sort()).toEqual(['create', 'delete', 'move', 'update', 'write']);
  });
});
