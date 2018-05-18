import {
    ApolloLink,
    Observable,
    Operation,
    Observer,
    FetchResult,
    NextLink,
    makePromise,
    execute,
} from 'apollo-link'
import { getMainDefinition } from 'apollo-utilities'
import { OperationStore, Storage } from './OperationStore'
import { isOfflineError } from './OfflineError'

const isMutation = ({ query }: Operation) => {
    // @ts-ignore
    const { kind, operation } = getMainDefinition(query)
    return kind === 'OperationDefinition' && operation === 'mutation'
}

export interface OfflineLinkOptions {
    storage: Storage
    link: ApolloLink
}

export class OfflineLink extends ApolloLink {
    private nextLink: ApolloLink
    private operationStore: OperationStore
    private handlers: Set<Function> = new Set()
    private initialized: boolean = false;
    
    constructor({ storage, link }: OfflineLinkOptions) {
        super()
        this.nextLink = link.concat(this)
        this.operationStore = new OperationStore(storage)
    }

    /**
     * Load persisted queries from storage
     */
    public async init() {
        if (this.initialized) {
            return;
        }

        try {
            const operations = await this.operationStore.load();
            const promises = operations.map(operation => makePromise(execute(this.nextLink, operation)))
            await Promise.all(promises);
        } catch (error) {
            throw error;
        } finally {
            this.initialized = true;
        }
    }

    /**
     * Run pending operations
     */
    public sync() {
        this.handlers.forEach(handler => handler())
    }

    public request(operation: Operation, forward: NextLink) {
        /**
         * Handle only mutations
         */
        if (!isMutation(operation)) {
            return forward(operation)
        }

        return new Observable(observer => {
            let subscription: any
            const dispose = () => {
                this.handlers.delete(subscribe)
                this.operationStore.remove(operation.toKey())
            };

            const _observer = {
                next: (data: any) => {
                    dispose()
                    observer.next(data)
                },
                error: (error: Error) => {
                    if (isOfflineError(error)) {
                        this.handlers.add(subscribe);
                        return;
                    }
    
                    dispose()
                    observer.error(error)
                },
                complete: () => observer.complete()
            }

            const subscribe = () => {
                subscription = forward(operation).subscribe(_observer)
            }

            subscribe();
            
            return () => {
                dispose()
                if (subscription) {
                    subscription.unsubscribe();
                }
            }
        });
    }
}

export const withOffline = (options: OfflineLinkOptions) => new OfflineLink(options)
