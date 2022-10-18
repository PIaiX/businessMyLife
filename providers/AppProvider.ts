// * Types
import type { PaginationConfig } from 'Contracts/database'
import type { ApplicationContract } from '@ioc:Adonis/Core/Application'
// * Types

export default class AppProvider {
  constructor(protected app: ApplicationContract) {}

  public register() {
    // Register your own bindings
  }

  public async boot() {
    // IoC container is ready

    const { ModelQueryBuilder } = this.app.container.use('Adonis/Lucid/Database')

    /**
     * * Paginate
     */

    ModelQueryBuilder.macro('getViaPaginate', async function(config: PaginationConfig) {
      config.orderByColumn = config.orderByColumn ?? 'id'
      config.limit = config.limit ?? 100
      const query = await this.orderBy(config.orderByColumn, config.orderBy).paginate(config.page, config.limit)

      if (config.baseUrl)
        return query.baseUrl(config.baseUrl)

      return query
    })

    /**
     * * Random
     */

    ModelQueryBuilder.macro('random', function() {
      return this.orderByRaw('RANDOM()')
    })
  }

  public async ready() {
    // App is ready
  }

  public async shutdown() {
    // Cleanup, since app is going down
  }
}
