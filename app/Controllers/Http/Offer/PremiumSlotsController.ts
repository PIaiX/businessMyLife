import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { ModelPaginatorContract } from '@ioc:Adonis/Lucid/Orm'
import PremiumSlot from 'App/Models/Offer/PremiumSlot'
import ExceptionService from 'App/Services/ExceptionService'
import PremiumSlotService from 'App/Services/PremiumSlotService'
import ApiValidator from 'App/Validators/ApiValidator'
import { ResponseCodes, ResponseMessages } from 'Config/response'
import { Err } from 'Contracts/response'

export default class PremiumSlotsController {
	public async paginate({ session, request, view, response }: HttpContextContract) {
		let payload: ApiValidator['schema']['props']

		try {
			payload = await request.validate(ApiValidator)
		} catch (err: any) {
			throw new ExceptionService({
				code: ResponseCodes.VALIDATION_ERROR,
				message: ResponseMessages.VALIDATION_ERROR,
				body: err.messages,
			})
		}

		try {
			const slots: ModelPaginatorContract<PremiumSlot> = await PremiumSlotService.paginate(payload)

			return view.render('pages/premium/slots/index', {
				slots,
			})
		} catch (err: Err | any) {
			session.flash('error', err.message)
			return response.redirect().back()
		}
	}
}
