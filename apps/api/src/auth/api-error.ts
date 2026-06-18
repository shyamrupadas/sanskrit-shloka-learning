import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

export const invalidCredentialsError: ApiTypes.ApiError = {
  code: "INVALID_CREDENTIALS",
  message: "Неверный email или пароль",
};

export const unauthorizedError: ApiTypes.ApiError = {
  code: "UNAUTHORIZED",
  message: "Требуется вход",
};

export const forbiddenError: ApiTypes.ApiError = {
  code: "FORBIDDEN",
  message: "Недостаточно прав",
};

export function validationError(details: string[]): ApiTypes.ApiError {
  return {
    code: "VALIDATION_ERROR",
    message: "Проверьте поля формы",
    details,
  };
}

export function emailAlreadyRegisteredError(): ApiTypes.ApiError {
  return {
    code: "EMAIL_ALREADY_REGISTERED",
    message: "Email уже зарегистрирован",
  };
}
