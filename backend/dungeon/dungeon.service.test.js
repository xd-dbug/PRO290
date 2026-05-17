const { weightedRoll, processSession } = require('./dungeon.service');
const LootItem = require('../model/lootpool');

jest.mock('../model/lootpool', () => ({ find: jest.fn() }));

const MOCK_ITEM = {
    itemId: 'sword-wood',
    name: 'Wooden Sword',
    rarity: 'common',
    spriteKey: 'sword_wood',
    dropWeight: 60
};

beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
});

describe('weightedRoll', () => {
    it('always returns an item from the list', () => {
        const items = [{ itemId: 'a', dropWeight: 10 }, { itemId: 'b', dropWeight: 5 }];
        expect(items).toContain(weightedRoll(items));
    });

    it('returns the only item when there is one', () => {
        const items = [{ itemId: 'solo', dropWeight: 100 }];
        expect(weightedRoll(items)).toBe(items[0]);
    });

    it('favours items with higher weight', () => {
        const items = [{ itemId: 'heavy', dropWeight: 1000 }, { itemId: 'light', dropWeight: 1 }];
        const results = Array.from({ length: 20 }, () => weightedRoll(items));
        expect(results.filter(r => r.itemId === 'heavy').length).toBeGreaterThan(15);
    });
});

describe('processSession', () => {
    it('calls POST /inventory with rolled item details', async () => {
        LootItem.find.mockResolvedValue([MOCK_ITEM]);
        global.fetch.mockResolvedValue({ ok: true });

        await processSession({ userId: 'user-1', sessionId: 'sess-1' });

        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toMatch(/\/inventory$/);
        expect(opts.method).toBe('POST');
        const body = JSON.parse(opts.body);
        expect(body).toMatchObject({ userId: 'user-1', itemId: 'sword-wood', rarity: 'common', sessionId: 'sess-1' });
    });

    it('throws when inventory service returns non-ok', async () => {
        LootItem.find.mockResolvedValue([MOCK_ITEM]);
        global.fetch.mockResolvedValue({ ok: false, status: 503 });

        await expect(processSession({ userId: 'user-1', sessionId: 'sess-1' }))
            .rejects.toThrow('Inventory service responded 503');
    });

    it('throws when loot_pool is empty', async () => {
        LootItem.find.mockResolvedValue([]);

        await expect(processSession({ userId: 'user-1', sessionId: 'sess-1' }))
            .rejects.toThrow('loot_pool is empty');
    });
});