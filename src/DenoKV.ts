class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
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

  async get<T>(key: string[]) {
    return await this.kv.get<T>(key);
  }

  async delete(key: string[]) {
    await this.kv.delete(key);
  }

  getTable<KeyType extends string[], ValueType>(key: string) {
    return new KVDBTable<KeyType, ValueType>(this.kv, key);
  }

  close() {
    this.kv.close();
  }
}

export class KVDBTable<KeyType extends string[], ValueType> {
  constructor(private kv: Deno.Kv, private keyPrefix: string) {}

  async set(key: KeyType, value: ValueType) {
    await this.kv.set([...this.keyPrefix, ...key], value);
  }

  async get(key: KeyType) {
    return await this.kv.get<ValueType>([...this.keyPrefix, ...key]);
  }

  async delete(key: KeyType) {
    await this.kv.delete([...this.keyPrefix, ...key]);
  }
}
