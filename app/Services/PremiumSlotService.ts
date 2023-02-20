import Logger from '@ioc:Adonis/Core/Logger'
import { ModelPaginatorContract, ModelQueryBuilderContract } from '@ioc:Adonis/Lucid/Orm'
import PremiumSlot from 'App/Models/Offer/PremiumSlots/PremiumSlot'
import PremiumSlotsFilterValidator from 'App/Validators/PremiumSlots/PremiumSlotsFilterValidator'
import PremiumSlotsValidator from 'App/Validators/PremiumSlots/PremiumSlotsValidator'
import { ResponseCodes, ResponseMessages } from 'Config/response'
import { Err } from 'Contracts/response'
import { PaginateConfig } from 'Contracts/services'

export default class PremiumSlotService {
	public static async paginate(
		config: PaginateConfig<PremiumSlot>,
		filter?: PremiumSlotsFilterValidator['schema']['props'],
	): Promise<ModelPaginatorContract<PremiumSlot>> {
		let query: ModelQueryBuilderContract<typeof PremiumSlot> = PremiumSlot.query()
		if (filter) query = this.filter(query, filter)

		try {
			return await query.getViaPaginate(config)
		} catch (err: any) {
			Logger.error(err)
			throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
		}
	}

	public static async get(id: PremiumSlot['id']): Promise<PremiumSlot> {
		let item: PremiumSlot | null

		try {
			item = await PremiumSlot.find(id)
		} catch (err: any) {
			Logger.error(err)
			throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
		}

		if (!item) throw { code: ResponseCodes.CLIENT_ERROR, message: ResponseMessages.ERROR } as Err

		return item
	}

	public static async create(payload: PremiumSlotsValidator['schema']['props']): Promise<void> {
		try {
			await PremiumSlot.create(payload)
		} catch (err: any) {
			Logger.error(err)
			throw { code: ResponseCodes.DATABASE_ERROR, message: ResponseMessages.ERROR } as Err
		}
	}

	public static async update(id: PremiumSlot['id'], payload: PremiumSlotsValidator['schema']['props']): Promise<void> {
		let item: PremiumSlot

		try {
			item = await this.get(id)
		} catch (err: Err | any) {
			throw err
		}

		try {
			await item.merge(payload).save()
		} catch (err: any) {
			Logger.error(err)
			throw { code: ResponseCodes.SERVER_ERROR, message: ResponseMessages.ERROR } as Err
		}
	}

	public static async delete(id: PremiumSlot['id']): Promise<void> {
		let item: PremiumSlot

		try {
			item = await this.get(id)
		} catch (err: Err | any) {
			throw err
		}

		try {
			await item.delete()
		} catch (err: any) {
			Logger.error(err)
			throw { code: ResponseCodes.SERVER_ERROR, message: ResponseMessages.ERROR } as Err
		}
	}

	/**
	 * * Private methods
	 */

	private static filter(
		query: ModelQueryBuilderContract<typeof PremiumSlot>,
		payload: PremiumSlotsFilterValidator['schema']['props'],
	): ModelQueryBuilderContract<typeof PremiumSlot> {
		for (const key in payload) {
			if (payload[key]) {
				switch (key) {
					// Skip this api's keys
					case 'page':
					case 'limit':
					case 'orderBy':
					case 'orderByColumn':
						break
					// Skip this api's keys

					case 'query':
						query = query.withScopes((scopes) => scopes.search(payload[key]!))

						break

					default:
						break
				}
			}
		}

		return query
	}
}