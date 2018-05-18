import { withOffline } from './';
import { ApolloLink } from 'apollo-link';

const createStorage = () => ({
  async getItem(key: string) {
    try {
      return JSON.parse(localStorage.getItem(key))
    } catch (error) {
      return null
    }
  },

  async setItem(key: string, value: any) {
    localStorage.setItem(key, JSON.stringify(value))
  },

  async removeItem(key) {
    localStorage.removeItem(key)
  }
})

const appLink = withOffline({
  // Async storage implementation
  storage: createStorage(),
  // You link (example - http link)
  link: ApolloLink.empty()
})

/**
 * On app load initialize link
 * - Load persisted queries
 */
window.addEventListener('load', () => {
  appLink.init()
})

window.addEventListener('online', () => {
  appLink.sync()
})