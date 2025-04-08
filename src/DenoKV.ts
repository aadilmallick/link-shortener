class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

abstract class AtomicOperation {
  abstract key: string[];
  abstract value: unknown;
  abstract type: "check" | "set" | "delete";

  abstract execute(res: Deno.AtomicOperation): Deno.AtomicOperation;
}

class AtomicSetOperation extends AtomicOperation {
  override type: "check" | "set" | "delete" = "set";
  constructor(public key: string[], public value: unknown) {
    super();
  }

  override execute(res: Deno.AtomicOperation): Deno.AtomicOperation {
    return res.set(this.key, this.value);
  }
}

class AtomicDeleteOperation extends AtomicOperation {
  override type: "check" | "set" | "delete" = "delete";
  override value: unknown = null;
  constructor(public key: string[]) {
    super();
  }

  override execute(res: Deno.AtomicOperation): Deno.AtomicOperation {
    return res.delete(this.key);
  }
}

class AtomicCheckOperation extends AtomicOperation {
  override type: "check" | "set" | "delete" = "delete";
  override value: unknown = null;
  constructor(public key: string[], public versionstamp: string | null) {
    super();
  }

  override execute(res: Deno.AtomicOperation): Deno.AtomicOperation {
    return res.check({
      key: this.key,
      versionstamp: this.versionstamp,
    });
  }
}

class AtomicNotExistCheckOperation extends AtomicCheckOperation {
  constructor(key: string[]) {
    super(key, null);
  }

  override execute(res: Deno.AtomicOperation): Deno.AtomicOperation {
    return res.check({
      key: this.key,
      versionstamp: this.versionstamp,
    });
  }
}

export class KVDB {
  constructor(private kv: Deno.Kv) {}
  static async init(path?: string) {
    const kv = await Deno.openKv(path);
    return new KVDB(kv);
  }

  async set<T>(key: string[], value: T) {
    const response = await this.kv.set(key, value);
    if (!response.ok) {
      throw new DatabaseError(`Error setting value ${value} for key ${key}`);
    }
  }

  async upsert<T>(key: string[], value: T) {
    const res = await this.kv
      .atomic()
      .check({ key, versionstamp: null }) // `null` versionstamps mean 'no value'
      .set(key, value)
      .commit();
    if (!res.ok) {
      throw new DatabaseError(`Error setting value ${value} for key ${key}`);
    }
  }

  async get<T>(key: string[]) {
    return await this.kv.get<T>(key);
  }

  async getMany<T extends readonly unknown[]>(keys: string[][]) {
    return await this.kv.getMany<T>(
      keys as readonly [...{ [K in keyof T]: Deno.KvKey }]
    );
  }

  async atomic(actions: AtomicOperation[]) {
    let res = this.kv.atomic();
    for (const action of actions) {
      res = action.execute(res);
    }
    const response = await res.commit();
    if (!response.ok) {
      throw new DatabaseError(`Error committing atomic operation`);
    }
    return response;
  }

  async delete(key: string[]) {
    await this.kv.delete(key);
  }

  getTable<KeyType extends string[], ValueType>(keyPrefix: string[]) {
    return new KVDBTable<KeyType, ValueType>(this.kv, keyPrefix);
  }

  close() {
    this.kv.close();
  }
}

export class KVDBTable<KeyType extends string[], ValueType> {
  constructor(private kv: Deno.Kv, private keyPrefix: string[]) {}

  private getKey(key: KeyType) {
    return [...this.keyPrefix, ...key];
  }

  async getAll() {
    const list = this.kv.list<ValueType>({
      prefix: this.keyPrefix,
    });
    const data = await Array.fromAsync(list);
    return data.map((item) => item);
  }

  async getAllKeys() {
    const list = this.kv.list<ValueType>({
      prefix: this.keyPrefix,
    });
    const data = await Array.fromAsync(list);
    return data.map((item) => item.key);
  }

  async getMany(keys: KeyType[]) {
    const res = await this.kv.getMany(keys.map((key) => this.getKey(key)));
    const data = await Array.fromAsync(res.values());
    return data.map((item) => item.value) as unknown as ValueType[];
  }

  async set(key: KeyType, value: ValueType) {
    await this.kv.set([...this.keyPrefix, ...key], value);
  }

  async upsert<T>(key: KeyType, value: ValueType) {
    const res = await this.kv
      .atomic()
      .check({ key, versionstamp: null }) // `null` versionstamps mean 'no value'
      .set(key, value)
      .commit();
    if (!res.ok) {
      throw new DatabaseError(`Error setting value ${value} for key ${key}`);
    }
  }

  async get(key: KeyType) {
    return await this.kv.get<ValueType>([...this.keyPrefix, ...key]);
  }

  async delete(key: KeyType) {
    await this.kv.delete([...this.keyPrefix, ...key]);
  }

  async deleteTable() {
    const list = this.kv.list<ValueType>({
      prefix: this.keyPrefix,
    });
    for await (const item of list) {
      await this.kv.delete(item.key);
    }
  }

  produceSetAction(key: KeyType, value: ValueType) {
    return new AtomicSetOperation([...this.keyPrefix, ...key], value);
  }

  produceDeleteAction(key: KeyType) {
    return new AtomicDeleteOperation([...this.keyPrefix, ...key]);
  }

  produceCheckAction(key: KeyType, versionstamp?: string) {
    if (versionstamp) {
      return new AtomicCheckOperation(
        [...this.keyPrefix, ...key],
        versionstamp
      );
    } else {
      return new AtomicNotExistCheckOperation([...this.keyPrefix, ...key]);
    }
  }
}
