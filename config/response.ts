export enum ResponseCodes {
  SUCCESS = 'SUCCESS',

  CLIENT_ERROR = 'CLIENT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  MAILER_ERROR = 'MAILER_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  VERIFY_CODE_EXISTS = 'VERIFY_CODE_EXISTS',
}

export enum ResponseMessages {
  SUCCESS = 'Успешно!',
  ERROR = 'Что-то пошло не так, повторите попытку еще раз!',

  /**
   * * Auth
   */

  USER_NOT_FOUND = 'Пользователь не найден!',
  CODE_VERIFICATION_NOT_FOUND = 'Код верификации не найден!',
  VALIDATION_ERROR = 'Заполните пожалуйста все поля правильно!',
  TOKEN_ERROR = 'Токен верификации пользователя не найден или просрочен!',
  MISS_AUTH_HEADERS = 'Не найдены необходимые заголовки для авторизации!',

  SOCKET_USER_ID_UNDEFINED = 'ID пользователя при соединении не определен!',
}
