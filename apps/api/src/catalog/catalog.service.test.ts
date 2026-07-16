import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { DatabaseUnavailableError } from "../database/database.service.js";
import {
  type CatalogRepository,
  type CreateShlokaRecordInput,
  type CreateSourceRecordInput,
  type ShlokaRecord,
  type SourceRecord,
  type UpdateShlokaRecordInput,
  type UpdateSourceRecordInput,
} from "./catalog.repository.js";
import { CatalogService } from "./catalog.service.js";

describe("CatalogService", () => {
  test("loads admin catalog sources and shlokas concurrently", async () => {
    const repository = new DeferredCatalogRepository();
    const service = new CatalogService(repository);

    const catalogPromise = service.getAdminCatalog();

    assert.deepEqual(repository.calls, ["listSources", "listLibraryShlokas"]);

    repository.sources.resolve([sourceRecord]);
    repository.shlokas.resolve([shlokaRecord]);

    assert.deepEqual(await catalogPromise, {
      sources: [
        {
          chapters: [{ code: "chapter-1", order: 1, title: "Chapter 1" }],
          code: "gita",
          description: "Source description",
          parts: [],
          shlokas: [
            {
              chapterCode: "chapter-1",
              code: "gita-chapter-1-1",
              number: "1",
              text: "first pada",
            },
          ],
          structureType: "chapters",
          title: "Gita",
        },
      ],
    });

    assert.deepEqual(await service.getAdminCatalog(), {
      sources: [
        {
          chapters: [{ code: "chapter-1", order: 1, title: "Chapter 1" }],
          code: "gita",
          description: "Source description",
          parts: [],
          shlokas: [
            {
              chapterCode: "chapter-1",
              code: "gita-chapter-1-1",
              number: "1",
              text: "first pada",
            },
          ],
          structureType: "chapters",
          title: "Gita",
        },
      ],
    });
    assert.deepEqual(repository.calls, ["listSources", "listLibraryShlokas"]);
  });

  test("fails closed for expired admin catalog data when database refresh fails", async () => {
    const repository = new ConfigurableCatalogRepository();
    const service = new CatalogService(repository);

    assert.deepEqual(await service.getAdminCatalog(), {
      sources: [
        {
          chapters: [{ code: "chapter-1", order: 1, title: "Chapter 1" }],
          code: "gita",
          description: "Source description",
          parts: [],
          shlokas: [
            {
              chapterCode: "chapter-1",
              code: "gita-chapter-1-1",
              number: "1",
              text: "first pada",
            },
          ],
          structureType: "chapters",
          title: "Gita",
        },
      ],
    });

    const cached = adminCatalogCache(service);
    assert.ok(cached);
    cached.freshUntil = Date.now() - 1;
    const databaseError = new DatabaseUnavailableError();
    repository.listSourcesResult = Promise.reject(databaseError);
    repository.listLibraryShlokasResult = Promise.reject(databaseError);

    await assert.rejects(service.getAdminCatalog(), (error) => error === databaseError);
    assert.equal(repository.sourceReads, 2);
    assert.equal(repository.shlokaReads, 2);
  });

  test("uses cached library shlokas for fresh public library reads", async () => {
    const repository = new ConfigurableCatalogRepository();
    const service = new CatalogService(repository);

    assert.deepEqual(await service.listLibraryShlokas(), [
      {
        code: "gita-chapter-1-1",
        displayTitle: "Gita, Chapter 1 1",
        number: "1",
        personalStatus: "available",
        sourceTitle: "Gita",
        text: "first pada",
      },
    ]);
    assert.deepEqual(await service.listLibraryShlokas(), [
      {
        code: "gita-chapter-1-1",
        displayTitle: "Gita, Chapter 1 1",
        number: "1",
        personalStatus: "available",
        sourceTitle: "Gita",
        text: "first pada",
      },
    ]);

    assert.equal(repository.shlokaReads, 1);
  });

  test("uses stale cached library shlokas when refresh fails with a transient error", async () => {
    const repository = new ConfigurableCatalogRepository();
    const service = new CatalogService(repository);

    await service.listLibraryShlokas();
    const cached = libraryShlokasCache(service);
    assert.ok(cached);
    cached.freshUntil = Date.now() - 1;
    cached.staleUntil = Date.now() + 60_000;
    repository.listLibraryShlokasResult = Promise.reject(new DatabaseUnavailableError());

    assert.deepEqual(await service.listLibraryShlokas(), cached.value);
    assert.equal(repository.shlokaReads, 2);
  });

  test("uses cached library shloka for item lookups while cache is fresh", async () => {
    const repository = new ConfigurableCatalogRepository();
    const service = new CatalogService(repository);

    await service.listLibraryShlokas();
    repository.getShlokaError = new Error("Query read timeout");

    assert.deepEqual(await service.getLibraryShloka("gita-chapter-1-1"), {
      code: "gita-chapter-1-1",
      displayTitle: "Gita, Chapter 1 1",
      number: "1",
      personalStatus: "available",
      sourceTitle: "Gita",
      text: "first pada",
    });
    assert.equal(repository.shlokaRecordReads, 0);
  });

  test("rejects incomplete shloka padas before catalog reads", async () => {
    const repository = new ConfigurableCatalogRepository();
    const service = new CatalogService(repository);

    const created = await service.createShloka({
      sourceCode: "gita",
      chapterCode: "chapter-1",
      number: "1",
      padas: ["first pada", " ", "third pada", "fourth pada"],
    });
    const updated = await service.updateShloka("gita-chapter-1-1", {
      padas: ["first pada", "second pada", "third pada"],
    });

    assert.equal(created.status, 400);
    assert.ok(created.body.details?.includes("Заполните все четыре пады шлоки"));
    assert.equal(updated.status, 400);
    assert.ok(updated.body.details?.includes("Заполните все четыре пады шлоки"));
    assert.equal(repository.sourceReads, 0);
    assert.equal(repository.shlokaRecordReads, 0);
  });
});

const sourceRecord = {
  chapters: [{ code: "chapter-1", order: 1, title: "Chapter 1" }],
  code: "gita",
  description: "Source description",
  parts: [],
  structureType: "chapters",
  title: "Gita",
} satisfies SourceRecord;

const shlokaRecord = {
  chapterCode: "chapter-1",
  code: "gita-chapter-1-1",
  displayTitle: "Gita, Chapter 1 1",
  number: "1",
  padas: ["first pada"],
  sortChapterOrder: 1,
  sortPartOrder: 0,
  sortSourceTitle: "Gita",
  sourceCode: "gita",
  sourceTitle: "Gita",
  text: "first pada",
} satisfies ShlokaRecord;

class DeferredCatalogRepository implements CatalogRepository {
  readonly calls: string[] = [];
  readonly sources = new Deferred<SourceRecord[]>();
  readonly shlokas = new Deferred<ShlokaRecord[]>();

  async createSource(_input: CreateSourceRecordInput): Promise<SourceRecord> {
    throw new Error("Not implemented");
  }

  async createShloka(_input: CreateShlokaRecordInput): Promise<ShlokaRecord> {
    throw new Error("Not implemented");
  }

  async getSource(_code: string): Promise<SourceRecord | undefined> {
    throw new Error("Not implemented");
  }

  async getShloka(_code: string): Promise<ShlokaRecord | undefined> {
    throw new Error("Not implemented");
  }

  async listSources(): Promise<SourceRecord[]> {
    this.calls.push("listSources");
    return this.sources.promise;
  }

  async listLibraryShlokas(): Promise<ShlokaRecord[]> {
    this.calls.push("listLibraryShlokas");
    return this.shlokas.promise;
  }

  async updateSource(_input: UpdateSourceRecordInput): Promise<SourceRecord> {
    throw new Error("Not implemented");
  }

  async updateShloka(_input: UpdateShlokaRecordInput): Promise<ShlokaRecord> {
    throw new Error("Not implemented");
  }
}

class ConfigurableCatalogRepository implements CatalogRepository {
  getShlokaError: Error | undefined;
  getShlokaResult: Promise<ShlokaRecord | undefined> = Promise.resolve(shlokaRecord);
  listLibraryShlokasResult: Promise<ShlokaRecord[]> = Promise.resolve([shlokaRecord]);
  listSourcesResult: Promise<SourceRecord[]> = Promise.resolve([sourceRecord]);
  shlokaReads = 0;
  shlokaRecordReads = 0;
  sourceReads = 0;

  async createSource(_input: CreateSourceRecordInput): Promise<SourceRecord> {
    throw new Error("Not implemented");
  }

  async createShloka(_input: CreateShlokaRecordInput): Promise<ShlokaRecord> {
    throw new Error("Not implemented");
  }

  async getSource(_code: string): Promise<SourceRecord | undefined> {
    return sourceRecord;
  }

  async getShloka(_code: string): Promise<ShlokaRecord | undefined> {
    this.shlokaRecordReads += 1;
    if (this.getShlokaError) {
      throw this.getShlokaError;
    }
    return this.getShlokaResult;
  }

  async listSources(): Promise<SourceRecord[]> {
    this.sourceReads += 1;
    return this.listSourcesResult;
  }

  async listLibraryShlokas(): Promise<ShlokaRecord[]> {
    this.shlokaReads += 1;
    return this.listLibraryShlokasResult;
  }

  async updateSource(_input: UpdateSourceRecordInput): Promise<SourceRecord> {
    throw new Error("Not implemented");
  }

  async updateShloka(_input: UpdateShlokaRecordInput): Promise<ShlokaRecord> {
    throw new Error("Not implemented");
  }
}

class Deferred<T> {
  readonly promise: Promise<T>;
  reject!: (error: unknown) => void;
  resolve!: (value: T) => void;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

function adminCatalogCache(service: CatalogService):
  | {
      freshUntil: number;
      value: {
        sources: unknown[];
      };
    }
  | undefined {
  return (service as unknown as {
    adminCatalogCache:
      | {
          freshUntil: number;
          value: {
            sources: unknown[];
          };
        }
      | undefined;
  }).adminCatalogCache;
}

function libraryShlokasCache(service: CatalogService):
  | {
      freshUntil: number;
      staleUntil: number;
      value: unknown[];
    }
  | undefined {
  return (service as unknown as {
    libraryShlokasCache:
      | {
          freshUntil: number;
          staleUntil: number;
          value: unknown[];
        }
      | undefined;
  }).libraryShlokasCache;
}
