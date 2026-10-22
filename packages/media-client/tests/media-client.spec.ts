import { createMediaApiClient, MediaApiError, MediaNameConflictError, parseNameConflictData } from '../src/index.js';

describe('createMediaApiClient', () => {
  it('lists assets with Bearer auth and normalized base URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 'a1', kind: 'image' }],
    });

    const client = createMediaApiClient({
      baseUrl: '/api/admin/media/',
      getToken: () => 'secret',
      fetch: fetchMock as unknown as typeof fetch,
    });

    const assets = await client.listAssets({ kind: 'image' });
    expect(assets).toEqual([{ id: 'a1', kind: 'image' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/admin/media/assets?kind=image');
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer secret');
  });

  it('POSTs materialize body and returns job payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ job: { id: 'j1', status: 'succeeded', lastError: null }, mode: 'sync' }),
    });
    const client = createMediaApiClient({
      baseUrl: '/api/media',
      getToken: () => 't',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const result = await client.materialize('asset-1', { role: 'thumb', useDefaultThumb: true });
    expect(result.job.id).toBe('j1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/media/assets/asset-1/materialize');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ role: 'thumb', useDefaultThumb: true });
  });

  it('throws MediaApiError on non-2xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });
    const client = createMediaApiClient({
      baseUrl: '/api/media',
      getToken: () => null,
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(client.listAssets()).rejects.toBeInstanceOf(MediaApiError);
    await expect(client.listAssets()).rejects.toMatchObject({ status: 401 });
  });

  it('gets, deletes, and polls jobs with encoded ids', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ asset: { id: 'a/1' }, children: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ deleted: 'a/1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'j/2', status: 'queued', lastError: null }),
      });

    const client = createMediaApiClient({
      baseUrl: '/api/media',
      getToken: () => 't',
      fetch: fetchMock as unknown as typeof fetch,
    });

    await client.getAsset('a/1');
    await client.deleteAsset('a/1');
    await client.getJob('j/2');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/media/assets/a%2F1');
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).method).toBe('DELETE');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/media/assets/a%2F1');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/media/jobs/j%2F2');
  });

  it('uploadBase64 posts to /assets (admin shape)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'up1', kind: 'image' }),
    });
    const client = createMediaApiClient({
      baseUrl: '/api/admin/media',
      getToken: () => 't',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await client.uploadBase64({
      kind: 'image',
      contentBase64: 'YWJj',
      mime: 'image/png',
      filename: 'x.png',
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/admin/media/assets');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toMatchObject({ filename: 'x.png', kind: 'image' });
  });

  it('createPresign and completeIngest hit ingest routes with meta', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          assetId: 'a1',
          path: 'm/pf/i/f.png',
          name: 'f',
          expiresAt: '2026-01-01T00:30:00.000Z',
          uploadUrl: 'https://example.test/put',
          headers: { 'Content-Type': 'image/png' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'a1', kind: 'image', meta: { filename: 'f.png' } }),
      });

    const client = createMediaApiClient({
      baseUrl: '/api/media',
      getToken: async () => 'tok',
      fetch: fetchMock as unknown as typeof fetch,
    });

    await client.createPresign({ kind: 'image', mime: 'image/png', filename: 'f.png' });
    await client.completeIngest({
      assetId: 'a1',
      path: 'm/pf/i/f.png',
      kind: 'image',
      mime: 'image/png',
      filename: 'f.png',
      meta: { filename: 'f.png' },
    });

    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      kind: 'image',
      mime: 'image/png',
      filename: 'f.png',
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/media/ingest/presign');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/media/ingest/complete');
    expect(JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body))).toMatchObject({
      filename: 'f.png',
      meta: { filename: 'f.png' },
    });
  });

  it('surfaces the suggested name on a presign 409 name conflict', async () => {
    const body = JSON.stringify({
      statusCode: 409,
      statusMessage: 'Media name already taken',
      data: {
        code: 'name_conflict',
        path: 'm/pf/i/hero.png',
        suggestedName: 'hero-2',
        suggestedFilename: 'hero-2.png',
        suggestedPath: 'm/pf/i/hero-2.png',
      },
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 409, text: async () => body });
    const client = createMediaApiClient({
      baseUrl: '/api/media',
      getToken: () => 'tok',
      fetch: fetchMock as unknown as typeof fetch,
    });

    const error = await client
      .createPresign({ kind: 'image', mime: 'image/png', filename: 'hero.png' })
      .catch((e) => e);

    expect(error).toBeInstanceOf(MediaNameConflictError);
    expect(error).toBeInstanceOf(MediaApiError);
    expect(error).toMatchObject({
      status: 409,
      path: 'm/pf/i/hero.png',
      suggestedName: 'hero-2',
      suggestedFilename: 'hero-2.png',
      suggestedPath: 'm/pf/i/hero-2.png',
    });
  });

  it('keeps a plain MediaApiError for other 409s', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 409, text: async () => 'Asset already exists' });
    const client = createMediaApiClient({
      baseUrl: '/api/media',
      getToken: () => 'tok',
      fetch: fetchMock as unknown as typeof fetch,
    });

    const error = await client
      .completeIngest({ assetId: 'a', path: 'm/pf/i/a.png', kind: 'image', mime: 'image/png' })
      .catch((e) => e);

    expect(error).toBeInstanceOf(MediaApiError);
    expect(error).not.toBeInstanceOf(MediaNameConflictError);
  });

  it('sends a catalog variant and format on materialize, and the tenant on list', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ job: { id: 'j1' } }) });
    const client = createMediaApiClient({
      baseUrl: '/api/media',
      getToken: () => 'tok',
      fetch: fetchMock as unknown as typeof fetch,
    });

    await client.materialize('a1', { variant: '1920', format: 'avif' });
    await client.listAssets({ tenant: 'hyperactivity', kind: 'image' });

    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      variant: '1920',
      format: 'avif',
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/media/assets?kind=image&tenant=hyperactivity');
  });
});

describe('parseNameConflictData', () => {
  it('returns the data of a name_conflict body and null for anything else', () => {
    const data = {
      code: 'name_conflict',
      path: 'm/pf/i/hero.png',
      suggestedName: 'hero-2',
      suggestedFilename: 'hero-2.png',
      suggestedPath: 'm/pf/i/hero-2.png',
    };
    expect(parseNameConflictData(JSON.stringify({ statusCode: 409, data }))).toEqual(data);
    expect(parseNameConflictData(JSON.stringify({ data: { code: 'other', path: 'x' } }))).toBeNull();
    expect(parseNameConflictData(JSON.stringify({ data: { code: 'name_conflict' } }))).toBeNull();
    expect(parseNameConflictData('Asset already exists')).toBeNull();
    expect(parseNameConflictData('null')).toBeNull();
  });
});
