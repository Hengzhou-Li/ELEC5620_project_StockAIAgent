import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('models/User schema', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('has required fields and email regex; password select:false; timestamps enabled', async () => {
    // Use real mongoose Schema but avoid connecting DB
    const mongoose = await import('mongoose');
    const mod = await import('@/models/User');
    const model: any = mod.default;
    const schema: any = model.schema;

    // timestamps
    expect(schema.options.timestamps).toBe(true);

    // required validators
    const doc = new model({});
    const err = doc.validateSync();
    expect(err?.errors?.name).toBeDefined();
    expect(err?.errors?.email).toBeDefined();
    expect(err?.errors?.password).toBeDefined();

    // email regex
    const bad = new model({ name: 'a', email: 'bad', password: 'x' });
    const err2 = bad.validateSync();
    expect(err2?.errors?.email).toBeDefined();

    // password select:false
    const paths = schema.paths;
    expect(paths.password?.options?.select).toBe(false);

    // silence unused import warning
    expect(typeof mongoose).toBe('object');
  });
});
