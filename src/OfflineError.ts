export const OFFLINE_ERROR_KEY = Symbol('offline');

export interface OfflineError extends Error {
    [OFFLINE_ERROR_KEY]: boolean
}

export const isOfflineError = (error: any): error is OfflineError =>
    error[OFFLINE_ERROR_KEY] === true;

export const createOfflineError = (): OfflineError => {
    const error: any = new Error();
    error[OFFLINE_ERROR_KEY] = true;
    return error;
};