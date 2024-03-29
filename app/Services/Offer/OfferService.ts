// * Types
import type User from 'App/Models/User/User'
import type Subsection from 'App/Models/Offer/Subsection'
import type OfferValidator from 'App/Validators/Offer/OfferValidator'
import type OfferFilterValidator from 'App/Validators/Offer/OfferFilterValidator'
import type OfferFavoriteValidator from 'App/Validators/Offer/OfferFavoriteValidator'
import type OfferBlockDescriptionValidator from 'App/Validators/Offer/OfferBlockDescriptionValidator'
import type { Err } from 'Contracts/response'
import type { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser'
import type { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import type { OfferServicePaginateConfig, ServiceConfig } from 'Contracts/services'
import type {
  ManyToManyQueryBuilderContract, ModelAttributes,
  ModelObject, ModelPaginatorContract, ModelQueryBuilderContract
} from '@ioc:Adonis/Lucid/Orm'
// * Types

import Offer from 'App/Models/Offer/Offer'
import Drive from '@ioc:Adonis/Core/Drive'
import Logger from '@ioc:Adonis/Core/Logger'
import UserService from '../User/UserService'
import Database from '@ioc:Adonis/Lucid/Database'
import SubsectionService from './SubsectionService'
import OfferImageService from './OfferImageService'
import { OfferCategories } from 'Config/offer'
import { OFFER_FOLDER_PATH } from 'Config/drive'
import { ResponseCodes, ResponseMessages } from 'Config/response'

type FilterDependencies = {
  subsectionsIds: Subsection['id'][],
}

type OfferConfig = ServiceConfig<Offer> & {
  preloadArea?: boolean,
  addViewCount?: boolean,
}

export default class OfferService {
  public static async paginate(config: OfferServicePaginateConfig, filter?: OfferFilterValidator['schema']['props']): Promise<ModelPaginatorContract<Offer>> {
    let query: ModelQueryBuilderContract<typeof Offer, ModelObject> | ManyToManyQueryBuilderContract<typeof Offer, ModelObject> = Offer.query()

    if (config.userIdForFavorites) {
      try {
        const user: User = await UserService.get(config.userIdForFavorites)
        query = user.related('favoriteOffers').query()
      } catch (err: Err | any) {
        throw err
      }
    }

    if (config.isArchived !== undefined)
      query = query.withScopes((scopes) => scopes.getByArchived(config.isArchived!))

    if (config.isVerified !== undefined)
      query = query.withScopes((scopes) => scopes.getByVerified(config.isVerified!))

    if (config.isBanned !== undefined)
      query = query.withScopes((scopes) => scopes.getByBanned(config.isBanned!))

    if (config.userId !== undefined)
      query = query.withScopes((scopes) => scopes.getByUserId(config.userId!))

    if (config.preloadArea) {
      query = query.preload('subsection', (subsection) => {
        subsection.preload('area')
      })
    }

    if (config.relations) {
      for (const item of config.relations) {
        query = query.preload(item)
      }
    }

    if (config.aggregates) {
      for (const item of config.aggregates) {
        query = query.withCount(item)
      }
    }

    if (filter) {
      let dependencies: FilterDependencies | undefined = undefined

      if (filter.areaId) {
        try {
          const subsectionsIds: Subsection['id'][] = await SubsectionService.getSubsectionsIdsByAreaId(filter.areaId)

          dependencies = { subsectionsIds }
        } catch (err: Err | any) {
          throw err
        }
      }

      query = this.filter(query, filter, dependencies)
    }

    try { // @ts-ignore
      return await query.getViaPaginate(config)
    } catch (err: any) {
      Logger.error(err)
      throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
    }
  }

  public static async get(id: Offer['id'], { relations, trx, preloadArea, addViewCount }: OfferConfig = {}): Promise<Offer> {
    let item: Offer | null

    try {
      item = await Offer.find(id, { client: trx })
    } catch (err: any) {
      Logger.error(err)
      throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
    }

    if (!item)
      throw { code: ResponseCodes.CLIENT_ERROR, message: ResponseMessages.ERROR } as Err

    if (addViewCount) {
      const newViewCount: Offer['viewsCount'] = ++item.viewsCount

      try {
        await item.merge({ viewsCount: newViewCount }).save()

        item.viewsCount = newViewCount
      } catch (err: any) {
        Logger.error(err)
        throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
      }
    }

    try {
      if (relations) {
        for (const relation of relations) {
          await item.load(relation)
        }
      }

      if (preloadArea) {
        await item.load('subsection', (query) => {
          query.preload('area')
        })
      }

      return item
    } catch (err: any) {
      Logger.error(err)
      throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
    }
  }

  public static async getOffersIdsBySubSectionIds(subsectionsIds: Subsection['id'][]): Promise<Offer['id'][]> {
    try {
      const offers: { id: Offer['id'] }[] = await Offer
        .query()
        .select('id')
        .withScopes((scopes) => scopes.getBySubsectionsIds(subsectionsIds))

      return offers.map((item) => item.id)
    } catch (err: any) {
      Logger.error(err)
      throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
    }
  }

  public static async getOffersIdsByCategory(category: OfferCategories): Promise<Offer['id'][]> {
    try {
      const offers: { id: Offer['id'] }[] = await Offer
        .query()
        .select('id')
        .withScopes((scopes) => scopes.getByCategories([category]))

      return offers.map((item) => item.id)
    } catch (err: any) {
      Logger.error(err)
      throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
    }
  }

  public static async getOffersIdsByQuery(query: string): Promise<Offer['id'][]> {
    try {
      const offers: { id: Offer['id'] }[] = await Offer
        .query()
        .select('id')
        .withScopes((scopes) => scopes.search(query))

      return offers.map((item) => item.id)
    } catch (err: any) {
      Logger.error(err)
      throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
    }
  }

  public static async create(payload: OfferValidator['schema']['props']): Promise<void> {
    let item: Offer
    const trx: TransactionClientContract = await Database.transaction()
    const itemPayload: Partial<ModelAttributes<Offer>> = this.getOfferDataFromPayload(payload)

    try {
      item = await Offer.create(itemPayload, { client: trx })
    } catch (err: any) {
      await trx.rollback()

      Logger.error(err)
      throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
    }

    if (payload.image) {
      let image: Offer['image']

      try {
        image = await this.uploadImage(item.id, payload.image)
      } catch (err: Err | any) {
        await trx.rollback()

        throw err
      }

      try {
        await item.merge({ image }).save()
      } catch (err: any) {
        await trx.rollback()

        Logger.error(err)
        throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
      }
    }

    if (payload.images) {
      try {
        await OfferImageService.createMany(item.id, payload.images, trx)
      } catch (err: Err | any) {
        await trx.rollback()

        throw err
      }
    }

    await trx.commit()
  }

  public static async update(id: Offer['id'], payload: OfferValidator['schema']['props']): Promise<void> {
    let item: Offer
    const trx: TransactionClientContract = await Database.transaction()
    const itemPayload: Partial<ModelAttributes<Offer>> = this.getOfferDataFromPayload(payload)

    try {
      item = await this.get(id, { trx })
    } catch (err: any) {
      await trx.rollback()

      throw err
    }

    try {
      await item.merge(itemPayload).save()
    } catch (err: any) {
      await trx.rollback()

      throw err
    }

    if (payload.image) {
      let image: Offer['image']

      if (item.image)
        await Drive.delete(item.image)

      try {
        image = await this.uploadImage(item.id, payload.image)
      } catch (err: Err | any) {
        await trx.rollback()

        throw err
      }

      try {
        await item.merge({ image }).save()
      } catch (err: any) {
        await trx.rollback()

        Logger.error(err)
        throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
      }
    }

    if (payload.images) {
      try {
        await OfferImageService.createMany(item.id, payload.images, trx)
      } catch (err: Err | any) {
        await trx.rollback()

        throw err
      }
    }

    await trx.commit()
  }

  public static async updateBlockDescription(id: Offer['id'], payload: OfferBlockDescriptionValidator['schema']['props']): Promise<void> {
    let item: Offer

    try {
      item = await this.get(id)
    } catch (err: Err | any) {
      throw err
    }

    try {
      await item.merge(payload).save()
    } catch (err: any) {
      Logger.error(err)
      throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
    }
  }

  public static async delete(id: Offer['id']): Promise<void> {
    let item: Offer

    try {
      item = await this.get(id)
    } catch (err: Err | any) {
      throw err
    }

    try {
      await item.delete()
    } catch (err: any) {
      Logger.error(err)
      throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
    }
  }

  public static async verifyAll(): Promise<void> {
    try {
      await Offer
        .query()
        .withScopes((scopes) => scopes.getByVerified(false))
        .update({
          isVerified: true,
          isArchived: false,
        })
    } catch (err: any) {
      Logger.error(err)
      throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
    }
  }

  /**
   * * Actions
   */

  public static async actions(id: Offer['id'], actionType: 'archive' | 'ban' | 'verify', actionValue: boolean): Promise<void> {
    let item: Offer
    const offerData: Partial<ModelAttributes<Offer>> = {}

    switch (actionType) {
      case 'archive':
        offerData.isArchived = actionValue
        break

      case 'ban':
        offerData.isBanned = actionValue
        break

      case 'verify':
        offerData.isVerified = actionValue
        break

      default:
        break
    }

    try {
      item = await this.get(id)
    } catch (err: Err | any) {
      throw err
    }

    try {
      await item.merge(offerData).save()
    } catch (err: any) {
      Logger.error(err)
      throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
    }
  }

  public static async favoriteAction(payload: OfferFavoriteValidator['schema']['props'], action: 'attach' | 'detach'): Promise<void> {
    let user: User

    try {
      user = await UserService.get(payload.userId)
    } catch (err: Err | any) {
      throw err
    }

    try {
      await user.related('favoriteOffers')[action]([payload.offerId])
    } catch (err: any) {
      Logger.error(err)
      throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
    }
  }

  /**
   * * Private methods
   */

  private static filter(query: ModelQueryBuilderContract<typeof Offer, ModelObject> | ManyToManyQueryBuilderContract<typeof Offer, ModelObject>, payload: OfferFilterValidator['schema']['props'], dependencies?: FilterDependencies): ModelQueryBuilderContract<typeof Offer> | ManyToManyQueryBuilderContract<typeof Offer, ModelObject> {
    for (const key in payload) {
      if (payload[key] !== undefined) {

        switch (key) {
          // Skip this api's keys
          case 'page':
          case 'limit':
          case 'orderBy':
          case 'orderByColumn':
            break
          // Skip this api's keys

          case 'random':
            query = query.random()

            break

          case 'query':
            query = query.withScopes((scopes) => scopes.search(payload[key]!))

            break

          case 'category':
            query = query.withScopes((scopes) => scopes.getByCategories([payload[key]!]))

            break

          case 'investmentsFrom':
            query = query.withScopes((scopes) => scopes.getByInvestmentsFrom(payload[key]!))

            break

          case 'investmentsTo':
            query = query.withScopes((scopes) => scopes.getByInvestmentsTo(payload[key]!))

            break

          case 'priceFrom':
            query = query.withScopes((scopes) => scopes.getByPriceFrom(payload[key]!))

            break

          case 'priceTo':
            query = query.withScopes((scopes) => scopes.getByPriceTo(payload[key]!))

            break

          case 'profitFrom':
            query = query.withScopes((scopes) => scopes.getByProfitFrom(payload[key]!))

            break

          case 'profitTo':
            query = query.withScopes((scopes) => scopes.getByProfitTo(payload[key]!))

            break

          case 'profitPerMonthFrom':
            query = query.withScopes((scopes) => scopes.getByProfitPerMonthFrom(payload[key]!))

            break

          case 'profitPerMonthTo':
            query = query.withScopes((scopes) => scopes.getByProfitPerMonthTo(payload[key]!))

            break

          case 'projectStage':
            query = query.withScopes((scopes) => scopes.getByProjectStages([payload[key]!]))

            break

          case 'paybackTime':
            query = query.withScopes((scopes) => scopes.getByPaybackTimes([payload[key]!]))

            break

          case 'city':
            query = query.withScopes((scopes) => scopes.getByCity(payload[key]!))

            break

          case 'areaId':
            if (dependencies?.subsectionsIds)
              query = query.withScopes((scopes) => scopes.getBySubsectionsIds(dependencies.subsectionsIds))

            break

          case 'subsectionId':
            query = query.withScopes((scopes) => scopes.getBySubsectionsIds([payload[key]!]))

            break

          default:
            break
        }

      }
    }

    // @ts-ignore
    return query
  }

  private static getOfferDataFromPayload(payload: OfferValidator['schema']['props']): Partial<ModelAttributes<Offer>> {
    return {
      title: payload.title,
      description: payload.description,
      city: payload.city,

      video: payload.video,
      category: payload.category,

      cooperationTerms: payload.cooperationTerms,
      businessPlan: payload.businessPlan,
      benefits: payload.benefits,

      about: payload.about,
      aboutCompany: payload.aboutCompany,

      projectStage: payload.projectStage,
      paybackTime: payload.paybackTime,

      investments: payload.investments,
      dateOfCreation: payload.dateOfCreation,

      profit: payload.profit,
      profitPerMonth: payload.profitPerMonth,

      branchCount: payload.branchCount,
      soldBranchCount: payload.soldBranchCount,

      price: payload.price,
      pricePerMonth: payload.pricePerMonth,

      userId: payload.userId,
      subsectionId: payload.subsectionId,
    }
  }

  private static async uploadImage(id: Offer['id'], image: MultipartFileContract): Promise<string> {
    const path: string = `${OFFER_FOLDER_PATH}/${id}`

    try {
      await image.moveToDisk(path)
      return `${path}/${image.fileName}`
    } catch (err: any) {
      Logger.error(err)
      throw { code: ResponseCodes.SERVER_ERROR, message: ResponseMessages.ERROR } as Err
    }
  }
}
