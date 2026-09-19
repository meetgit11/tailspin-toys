import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllCategories,
    getAllGames,
    getAllGameIds,
    getAllPublishers,
    getGameById,
    getGamesByFilters,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all categories and publishers in name order', async () => {
        await db.insert(categories).values([
            { name: 'Strategy', description: 'cat' },
            { name: 'Adventure', description: 'cat' },
        ]);
        await db.insert(publishers).values([
            { name: 'Zenith', description: 'pub' },
            { name: 'Northwind', description: 'pub' },
        ]);

        await expect(getAllCategories(db)).resolves.toEqual([
            { id: expect.any(Number), name: 'Adventure' },
            { id: expect.any(Number), name: 'Strategy' },
        ]);
        await expect(getAllPublishers(db)).resolves.toEqual([
            { id: expect.any(Number), name: 'Northwind' },
            { id: expect.any(Number), name: 'Zenith' },
        ]);
    });

    it('filters games by category and publisher', async () => {
        const [strategy] = await db
            .insert(categories)
            .values({ name: 'Strategy', description: 'cat' })
            .returning({ id: categories.id });
        const [adventure] = await db
            .insert(categories)
            .values({ name: 'Adventure', description: 'cat' })
            .returning({ id: categories.id });
        const [northwind] = await db
            .insert(publishers)
            .values({ name: 'Northwind', description: 'pub' })
            .returning({ id: publishers.id });
        const [zenith] = await db
            .insert(publishers)
            .values({ name: 'Zenith', description: 'pub' })
            .returning({ id: publishers.id });

        await db.insert(games).values([
            { title: 'Apex', description: 'desc', starRating: 4, categoryId: strategy.id, publisherId: northwind.id },
            { title: 'Beacon', description: 'desc', starRating: 4.5, categoryId: strategy.id, publisherId: zenith.id },
            { title: 'Crown', description: 'desc', starRating: 3.8, categoryId: adventure.id, publisherId: northwind.id },
            { title: 'Delta', description: 'desc', starRating: 4.2, categoryId: adventure.id, publisherId: zenith.id },
        ]);

        await expect(getGamesByFilters(db, { categoryIds: [strategy.id] })).resolves.toMatchObject([
            { title: 'Apex' },
            { title: 'Beacon' },
        ]);
        await expect(getGamesByFilters(db, { publisherIds: [northwind.id] })).resolves.toMatchObject([
            { title: 'Apex' },
            { title: 'Crown' },
        ]);
        await expect(getGamesByFilters(db, { categoryIds: [strategy.id], publisherIds: [zenith.id] })).resolves.toMatchObject([
            { title: 'Beacon' },
        ]);
        await expect(getGamesByFilters(db, { categoryIds: [999], publisherIds: [999] })).resolves.toEqual([]);
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });
});
