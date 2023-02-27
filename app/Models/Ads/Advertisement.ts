import Subsection from 'App/Models/Offer/Subsection'
import Drive from '@ioc:Adonis/Core/Drive'
import { beforeDelete, BelongsTo, computed, scope } from '@ioc:Adonis/Lucid/Orm'
// * Types
import type { DateTime } from 'luxon'
// * Types

import { BaseModel, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import User from '../User/User'
import { GLOBAL_DATETIME_FORMAT } from 'Config/app'
import AdvertisementType from './AdvertisementType'

export default class Advertisement extends BaseModel {
	public static readonly columns = [
		'id',
		'image',
		'paymentStatus',
		'subsectionId',
		'place',
		'userId',
		'description',
		'placedAt',
		'placedUntill',
		'isVerified',
		'viewsCount',
		'createdAt',
		'updatedAt',
	] as const

	/**
	 * * Columns
	 */

	@column({ isPrimary: true })
	public id: number

	@column({ columnName: 'image' })
	public image: string

	@column({ columnName: 'ads_type_id' })
	public adsTypeId: number

	@column({ columnName: 'subsection_id' })
	public subsectionId: Subsection['id']

	@column()
	public description: string

	@column({ columnName: 'payment_status' })
	public paymentStatus: string

	@column({ columnName: 'user_id' })
	public userId: User['id']

	@column({ columnName: 'isVerified' })
	public isVerified: boolean

	@column({ columnName: 'viewsCount' })
	public viewsCount: number

	@column.dateTime({ autoCreate: true, columnName: 'placed_at' })
	public placedAt: DateTime

	@column.dateTime({ columnName: 'placed_untill' })
	public placedUntill: DateTime

	@column.dateTime({ autoCreate: true, columnName: 'created_at' })
	public createdAt: DateTime

	@column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
	public updatedAt: DateTime

	@belongsTo(() => User)
	public owner: BelongsTo<typeof User>

	@belongsTo(() => Subsection)
	public subsection: BelongsTo<typeof Subsection>

	@belongsTo(() => AdvertisementType, { foreignKey: 'adsTypeId' })
	public adsType: BelongsTo<typeof AdvertisementType>

	/**
	 * * Computed properties
	 */

	@computed()
	public get placedAtForUser(): string {
		return this.placedAt ? this.placedAt.setLocale('ru-RU').toFormat(GLOBAL_DATETIME_FORMAT) : ''
	}

	@computed()
	public get placedUntillForUser(): string {
		return this.placedUntill ? this.placedUntill.setLocale('ru-RU').toFormat(GLOBAL_DATETIME_FORMAT) : ''
	}

	@computed()
	public get placedUntillForPicker(): string {
		return this.placedUntill ? this.placedUntill.toFormat('dd MMMM, yyyy') : ''
	}

	/**
	 * * Query scopes
	 */

	public static getBySubsectionId = scope((query, subsectionId: number) => {
		query.where('subsectionId', subsectionId)
	})

	public static getByIsVerified = scope((query, isVerified: boolean) => {
		query.where('isVerified', isVerified)
	})

	/**
	 * * Hooks
	 */

	@beforeDelete()
	public static async deleteStoredImage(item: Advertisement) {
		if (item.image) await Drive.delete(item.image)
	}
}