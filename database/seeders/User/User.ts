import User from 'App/Models/User/User'
import Logger from '@ioc:Adonis/Core/Logger'
import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import { DateTime } from 'luxon'
import { UserFactory } from 'Database/factories'
import { RoleNames, UserExperienceTypes, UserTypeNames } from 'Config/user'

export default class extends BaseSeeder {
  public async run () {

    try {
      await User.createMany([
        {
          firstName: 'Admin',
          lastName: 'Admin',
          patronymic: 'Admin',

          email: 'admin@mail.ru',
          password: '1234Admin',

          placeOfWork: 'Business my life',
          companyName: 'Business my life',
          experienceType: UserExperienceTypes.AFTER_THREE_YEARS,

          birthday: DateTime.now(),
          city: 'Kazan',
          phone: '+79999999999',
          hobby: 'Programming',

          roleId: RoleNames.ADMIN + 1,
          typeId: UserTypeNames.PHYSICAL_PERSON + 1,
        },
        {
          firstName: 'Moderator',
          lastName: 'Moderator',
          patronymic: 'Moderator',

          email: 'moderator@mail.ru',
          password: '1234Moderator',

          placeOfWork: 'Business my life',
          companyName: 'Business my life',
          experienceType: UserExperienceTypes.AFTER_THREE_YEARS,

          birthday: DateTime.now(),
          city: 'Kazan',
          phone: '+79999999999',
          hobby: 'Programming',

          roleId: RoleNames.MODERATOR + 1,
          typeId: UserTypeNames.PHYSICAL_PERSON + 1,
        },
      ])

      await UserFactory.createMany(20)
    } catch (err: any) {
      Logger.error(err)
    }

  }
}
