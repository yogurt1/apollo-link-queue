import { Operation, GraphQLRequest } from 'apollo-link';
import { print, parse } from 'graphql';

type OperationsMap = Map<string, Operation>

// @ts-ignore
export interface OperationRecord extends GraphQLRequest {
  query: string
}

interface Storage {
  setItem(key: string, value: OperationRecord[]): Promise<void>
  getItem(key: string): Promise<OperationRecord[]>
  removeItem(key: string): Promise<void>
}

const STORAGE_KEY = '@ApolloQueueLink-persisted-queue';

const deserializeOperations = (json?: OperationRecord[]): GraphQLRequest[] => {
  json = json || [];
  return json.map(operation => ({ ...operation, query: parse(operation.query) }))
}

class OperationStore {
  private operations: OperationsMap = new Map()

  constructor(private storage: Storage) {}

  async load(): Promise<GraphQLRequest[]> {
    const json = await this.storage.getItem(STORAGE_KEY);
    return deserializeOperations(json);
  }

  private async save() {
    if (this.operations.size === 0) {
      await this.storage.removeItem(STORAGE_KEY);
      return;
    }
  
    const records: OperationRecord[] = [];
    this.operations.forEach(operation => {      
      records.push({
        variables: operation.variables,
        extensions: operation.extensions,
        query: print(operation.query),
        context: operation.getContext(),
      })
    });
    await this.storage.setItem(STORAGE_KEY, records);
  }

  async add(operation: Operation) {
    const key = operation.toKey();
    if (!this.operations.has(key)) {
      this.operations.set(key, operation);
      await this.save();
    }
  }

  get(key: string) {
    return this.operations.get(key);
  }

  async remove(key: string) {
    if (this.operations.has(key)) {
      this.operations.delete(key);
      await this.save();
    }
  }

  async clear() {
    if (this.operations.size > 0) {
      this.operations.clear();
      await this.save();
    }
  }

  public async forEach(fn: (operation: Operation) => Promise<void>) {
    const promises: Promise<void>[] = [];
    this.operations.forEach(operation => {
      promises.push(fn(operation))
    })
    await Promise.all(promises)
  }
}

export { OperationStore, Storage }