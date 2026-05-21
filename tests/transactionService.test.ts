import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  TransactionService,
  TransactionOperation,
} from '../src/core/services/batch/TransactionService.js';

// Rollback contract: any single failed op must revert *every* operation
// already applied in the same batch. This is the entire product surface;
// these tests are the safety net.

let svc: TransactionService;
let tmp: string;

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function read(p: string): Promise<string> {
  return fs.readFile(p, 'utf-8');
}

beforeEach(async () => {
  svc = new TransactionService();
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aifs-tx-test-'));
});

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe('TransactionService — happy path', () => {
  it('write + write applies both files', async () => {
    const a = path.join(tmp, 'a.txt');
    const b = path.join(tmp, 'b.txt');
    await fs.writeFile(a, 'original-A');
    await fs.writeFile(b, 'original-B');

    const result = await svc.executeTransaction([
      { type: 'write', path: a, content: 'new-A' },
      { type: 'write', path: b, content: 'new-B' },
    ]);

    expect(result.status).toBe('completed');
    await expect(read(a)).resolves.toBe('new-A');
    await expect(read(b)).resolves.toBe('new-B');
  });

  it('all five op kinds in one batch', async () => {
    const a = path.join(tmp, 'a.txt');
    const e = path.join(tmp, 'e.txt');
    const f = path.join(tmp, 'f.txt');
    const g = path.join(tmp, 'g.txt');
    const hSrc = path.join(tmp, 'h.txt');
    const hDst = path.join(tmp, 'h-renamed.txt');
    await fs.writeFile(a, 'A0');
    await fs.writeFile(e, 'alpha');
    await fs.writeFile(f, 'to-delete');
    await fs.writeFile(hSrc, 'hello');

    const result = await svc.executeTransaction([
      { type: 'create', path: g, content: 'G' },
      { type: 'write', path: e, content: 'new-E' },
      { type: 'update', path: a, updates: [{ oldText: 'A0', newText: 'A1' }] },
      { type: 'move', path: hSrc, destination: hDst },
      { type: 'delete', path: f },
    ]);

    expect(result.status).toBe('completed');
    await expect(read(g)).resolves.toBe('G');
    await expect(read(e)).resolves.toBe('new-E');
    await expect(read(a)).resolves.toBe('A1');
    await expect(read(hDst)).resolves.toBe('hello');
    await expect(exists(hSrc)).resolves.toBe(false);
    await expect(exists(f)).resolves.toBe(false);
  });
});

describe('TransactionService — rollback contract', () => {
  it('rolls back prior writes when a later update fails (oldText not found)', async () => {
    const a = path.join(tmp, 'a.txt');
    const b = path.join(tmp, 'b.txt');
    await fs.writeFile(a, 'original-A');
    await fs.writeFile(b, 'original-B');

    const result = await svc.executeTransaction([
      { type: 'write', path: a, content: 'garbage-A' },
      { type: 'update', path: b, updates: [{ oldText: 'ZZZ-not-there', newText: 'x' }] },
    ]);

    expect(result.status).toBe('rolled_back');
    expect(result.error).toMatch(/oldText not found/);
    await expect(read(a)).resolves.toBe('original-A');
    await expect(read(b)).resolves.toBe('original-B');
  });

  it('rolls back by deleting a freshly-created file when a later op fails', async () => {
    const a = path.join(tmp, 'a.txt');
    const c = path.join(tmp, 'c.txt');
    await fs.writeFile(a, 'original-A');

    const result = await svc.executeTransaction([
      { type: 'create', path: c, content: 'fresh-C' },
      { type: 'update', path: a, updates: [{ oldText: 'NEVER', newText: 'y' }] },
    ]);

    expect(result.status).toBe('rolled_back');
    await expect(exists(c)).resolves.toBe(false);
    await expect(read(a)).resolves.toBe('original-A');
  });

  it('rolls back a move by restoring the source AND removing the destination', async () => {
    const a = path.join(tmp, 'a.txt');
    const dSrc = path.join(tmp, 'd.txt');
    const dDst = path.join(tmp, 'moved', 'd.txt');
    await fs.writeFile(a, 'original-A');
    await fs.writeFile(dSrc, 'data-D');

    const result = await svc.executeTransaction([
      { type: 'move', path: dSrc, destination: dDst },
      { type: 'update', path: a, updates: [{ oldText: 'NEVER', newText: 'z' }] },
    ]);

    expect(result.status).toBe('rolled_back');
    await expect(read(dSrc)).resolves.toBe('data-D');
    await expect(exists(dDst)).resolves.toBe(false);
  });

  it('rolls back a delete by restoring the original file', async () => {
    const a = path.join(tmp, 'a.txt');
    const victim = path.join(tmp, 'victim.txt');
    await fs.writeFile(a, 'A');
    await fs.writeFile(victim, 'precious');

    const result = await svc.executeTransaction([
      { type: 'delete', path: victim },
      { type: 'update', path: a, updates: [{ oldText: 'NEVER', newText: 'q' }] },
    ]);

    expect(result.status).toBe('rolled_back');
    await expect(read(victim)).resolves.toBe('precious');
  });
});

describe('TransactionService — silent edges promoted to hard failures', () => {
  it('refuses to clobber an existing file via create', async () => {
    const a = path.join(tmp, 'a.txt');
    await fs.writeFile(a, 'pre-existing');

    const result = await svc.executeTransaction([
      { type: 'create', path: a, content: 'overwrite?' },
    ]);
    expect(result.status).toBe('rolled_back');
    expect(result.error).toMatch(/already exists/);
    await expect(read(a)).resolves.toBe('pre-existing');
  });

  it('refuses to move onto an existing destination', async () => {
    const src = path.join(tmp, 's.txt');
    const dst = path.join(tmp, 'd.txt');
    await fs.writeFile(src, 's');
    await fs.writeFile(dst, 'd');

    const result = await svc.executeTransaction([{ type: 'move', path: src, destination: dst }]);
    expect(result.status).toBe('rolled_back');
    expect(result.error).toMatch(/destination already exists/);
    await expect(read(src)).resolves.toBe('s');
    await expect(read(dst)).resolves.toBe('d');
  });

  it('refuses to delete a missing path', async () => {
    const missing = path.join(tmp, 'ghost.txt');
    const result = await svc.executeTransaction([{ type: 'delete', path: missing }]);
    expect(result.status).toBe('rolled_back');
    expect(result.error).toMatch(/does not exist/);
  });
});

describe('TransactionService — rollbackOnError=false', () => {
  it('throws and keeps partial state when rollback is disabled', async () => {
    const a = path.join(tmp, 'a.txt');
    const b = path.join(tmp, 'b.txt');
    await fs.writeFile(a, 'original-A');
    await fs.writeFile(b, 'original-B');

    const ops: TransactionOperation[] = [
      { type: 'write', path: a, content: 'new-A' },
      { type: 'update', path: b, updates: [{ oldText: 'ZZZ', newText: 'x' }] },
    ];

    await expect(svc.executeTransaction(ops, false)).rejects.toThrow(/oldText not found/);
    // Partial state: a is mutated, b is not.
    await expect(read(a)).resolves.toBe('new-A');
    await expect(read(b)).resolves.toBe('original-B');
  });
});
