import { Inject, Injectable } from "@nestjs/common";
import type { ApiTypes, BackendContract } from "@sanskrit-shloka-learning/api-contract";

import { AccountSettingsService } from "../accounts/account-settings.service.js";
import { AuthService } from "../auth/auth.service.js";
import {
  dataIntegrityError,
  forbiddenError,
  notFoundError,
  unauthorizedError,
  validationError,
} from "../auth/api-error.js";
import { CatalogService, ShlokaDataIntegrityError } from "../catalog/catalog.service.js";
import { DashboardService } from "../dashboard/dashboard.service.js";
import { StreakService } from "../dashboard/streak.service.js";
import { UserLibraryService } from "../library/user-library.service.js";
import { isValidTimeZone } from "../shared/user-day.js";

import { LEARNING_TIP_REPOSITORY, type LearningTipRepository } from "../learning/learning-tip.repository.js";

type AdminAuthorizationError =
  | { status: 401; body: ApiTypes.ApiError }
  | { status: 403; body: ApiTypes.ApiError };

@Injectable()
export class ApiHandlersService implements BackendContract.ApiHandlers {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AccountSettingsService) private readonly accountSettings: AccountSettingsService,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(DashboardService) private readonly dashboard: DashboardService,
    @Inject(StreakService) private readonly streak: StreakService,
    @Inject(UserLibraryService) private readonly userLibrary: UserLibraryService,
    @Inject(LEARNING_TIP_REPOSITORY) private readonly learningTips: LearningTipRepository,
  ) {}

  async getTips(request: BackendContract.GetTipsRequest): Promise<BackendContract.GetTipsResponse> {
    if (!(await this.auth.lookupSession(request.authorization))) {
      return { status: 401, body: unauthorizedError };
    }
    return { status: 200, body: { items: await this.learningTips.list("ru") } };
  }

  async tips(request: BackendContract.TipsRequest): Promise<BackendContract.TipsResponse> {
    const adminError = await this.authorizeAdmin(request.authorization);
    if (adminError) return adminError;
    const body = normalizeTip(request.body);
    if (!body) return { status: 400, body: validationError(["Заголовок должен содержать от 1 до 120 символов, текст — от 1 до 2000."]) };
    return { status: 201, body: await this.learningTips.create(body) };
  }

  async updateTip(request: BackendContract.UpdateTipRequest): Promise<BackendContract.UpdateTipResponse> {
    const adminError = await this.authorizeAdmin(request.authorization);
    if (adminError) return adminError;
    const body = normalizeTip(request.body);
    if (!body) return { status: 400, body: validationError(["Заголовок должен содержать от 1 до 120 символов, текст — от 1 до 2000."]) };
    const tip = await this.learningTips.update(request.tipId, body);
    return tip ? { status: 200, body: tip } : { status: 404, body: notFoundError("Совет не найден") };
  }

  async move(request: BackendContract.MoveRequest): Promise<BackendContract.MoveResponse> {
    const adminError = await this.authorizeAdmin(request.authorization);
    if (adminError) return adminError;
    const direction = request.body?.direction;
    if (direction !== "up" && direction !== "down") {
      return { status: 400, body: validationError(["Укажите направление up или down."]) };
    }
    const items = await this.learningTips.move(request.tipId, direction);
    if (items === "not-found") return { status: 404, body: notFoundError("Совет не найден") };
    if (items === "edge") return { status: 400, body: validationError(["Совет уже находится на краю списка."]) };
    return { status: 200, body: { items } };
  }

  async deleteTip(request: BackendContract.DeleteTipRequest): Promise<BackendContract.DeleteTipResponse> {
    const adminError = await this.authorizeAdmin(request.authorization);
    if (adminError) return adminError;
    const items = await this.learningTips.delete(request.tipId);
    return items ? { status: 200, body: { items } } : { status: 404, body: notFoundError("Совет не найден") };
  }

  async register(request: BackendContract.RegisterRequest): Promise<BackendContract.RegisterResponse> {
    return this.auth.register(request.body);
  }

  async login(request: BackendContract.LoginRequest): Promise<BackendContract.LoginResponse> {
    return this.auth.login(request.body);
  }

  async getSession(request: BackendContract.GetSessionRequest): Promise<BackendContract.GetSessionResponse> {
    return this.auth.getSession(request.authorization);
  }

  async logout(request: BackendContract.LogoutRequest): Promise<BackendContract.LogoutResponse> {
    return this.auth.logout(request.authorization);
  }

  async getSettings(request: BackendContract.GetSettingsRequest): Promise<BackendContract.GetSettingsResponse> {
    const session = await this.auth.lookupSession(request.authorization);
    if (!session) {
      return { status: 401, body: unauthorizedError };
    }

    return {
      status: 200,
      body: await this.accountSettings.get(session.account.id),
    };
  }

  async updateSettings(request: BackendContract.UpdateSettingsRequest): Promise<BackendContract.UpdateSettingsResponse> {
    const session = await this.auth.lookupSession(request.authorization);
    if (!session) {
      return { status: 401, body: unauthorizedError };
    }
    if (typeof request.body?.hardMode !== "boolean") {
      return {
        status: 400,
        body: validationError(["Hard mode должен быть логическим значением"]),
      };
    }

    return {
      status: 200,
      body: await this.accountSettings.update(session.account.id, request.body),
    };
  }

  async getDashboard(request: BackendContract.GetDashboardRequest): Promise<BackendContract.GetDashboardResponse> {
    if (!(await this.auth.lookupSession(request.authorization))) {
      return { status: 401, body: unauthorizedError };
    }

    return {
      status: 200,
      body: emptyDashboard(),
    };
  }

  async getLearningShlokas(
    request: BackendContract.GetLearningShlokasRequest,
  ): Promise<BackendContract.GetLearningShlokasResponse> {
    const session = await this.auth.lookupSession(request.authorization);
    if (!session) {
      return { status: 401, body: unauthorizedError };
    }
    if (!isValidDashboardLimit(request.limit)) {
      return {
        status: 400,
        body: validationError(["Лимит должен быть положительным целым числом"]),
      };
    }

    return {
      status: 200,
      body: await this.dashboard.getLearningShlokas(
        session.account.id,
        request.limit,
      ),
    };
  }

  async getReviewShlokas(
    request: BackendContract.GetReviewShlokasRequest,
  ): Promise<BackendContract.GetReviewShlokasResponse> {
    const session = await this.auth.lookupSession(request.authorization);
    if (!session) {
      return { status: 401, body: unauthorizedError };
    }
    const details = [
      ...(!isValidDashboardLimit(request.limit)
        ? ["Лимит должен быть положительным целым числом"]
        : []),
      ...(!isValidTimeZone(request.timeZone)
        ? ["Таймзона пользователя должна быть корректной IANA-таймзоной"]
        : []),
    ];
    if (details.length > 0) {
      return { status: 400, body: validationError(details) };
    }

    return {
      status: 200,
      body: await this.dashboard.getReviewShlokas(
        session.account.id,
        request.timeZone,
        request.limit,
      ),
    };
  }

  async getStreak(
    request: BackendContract.GetStreakRequest,
  ): Promise<BackendContract.GetStreakResponse> {
    const session = await this.auth.lookupSession(request.authorization);
    if (!session) {
      return { status: 401, body: unauthorizedError };
    }
    if (!isValidTimeZone(request.timeZone)) {
      return {
        status: 400,
        body: validationError([
          "Таймзона пользователя должна быть корректной IANA-таймзоной",
        ]),
      };
    }

    return {
      status: 200,
      body: await this.streak.getStreak(
        session.account.id,
        request.timeZone,
      ),
    };
  }

  async completeReview(
    request: BackendContract.CompleteReviewRequest,
  ): Promise<BackendContract.CompleteReviewResponse> {
    const session = await this.auth.lookupSession(request.authorization);
    if (!session) {
      return { status: 401, body: unauthorizedError };
    }

    const result = request.body?.result;
    const timeZone = request.body?.timeZone;
    const details = [
      ...(!isValidReviewResult(result)
        ? ["Результат повторения должен быть одним из четырех допустимых значений"]
        : []),
      ...(typeof timeZone !== "string" || !isValidTimeZone(timeZone)
        ? ["Таймзона пользователя должна быть корректной IANA-таймзоной"]
        : []),
    ];
    if (details.length > 0 || !isValidReviewResult(result) || typeof timeZone !== "string") {
      return { status: 400, body: validationError(details) };
    }

    return this.dashboard.completeReview(
      session.account.id,
      request.shlokaCode,
      result,
      timeZone,
    );
  }

  async getLibrary(request: BackendContract.GetLibraryRequest): Promise<BackendContract.GetLibraryResponse> {
    const session = await this.auth.lookupSession(request.authorization);
    if (!session) {
      return { status: 401, body: unauthorizedError };
    }

    return {
      status: 200,
      body: await this.userLibrary.getLibrary(session.account.id),
    };
  }

  async getItem(request: BackendContract.GetItemRequest): Promise<BackendContract.GetItemResponse> {
    const session = await this.auth.lookupSession(request.authorization);
    if (!session) {
      return { status: 401, body: unauthorizedError };
    }

    try {
      const shloka = await this.userLibrary.getShloka(session.account.id, request.shlokaCode);
      return shloka
        ? { status: 200, body: shloka }
        : { status: 404, body: notFoundError("Шлока не найдена") };
    } catch (error) {
      if (error instanceof ShlokaDataIntegrityError) {
        return { status: 500, body: dataIntegrityError };
      }
      throw error;
    }
  }

  async completeLearning(
    request: BackendContract.CompleteLearningRequest,
  ): Promise<BackendContract.CompleteLearningResponse> {
    const session = await this.auth.lookupSession(request.authorization);
    if (!session) {
      return { status: 401, body: unauthorizedError };
    }
    const timeZone = request.body?.timeZone;
    if (typeof timeZone !== "string" || !isValidTimeZone(timeZone)) {
      return {
        status: 400,
        body: validationError([
          "Таймзона пользователя должна быть корректной IANA-таймзоной",
        ]),
      };
    }

    return this.userLibrary.completeLearning(
      session.account.id,
      request.shlokaCode,
      timeZone,
    );
  }

  async updateItem(request: BackendContract.UpdateItemRequest): Promise<BackendContract.UpdateItemResponse> {
    const session = await this.auth.lookupSession(request.authorization);
    if (!session) {
      return { status: 401, body: unauthorizedError };
    }

    return this.userLibrary.updateItem(session.account.id, request.shlokaCode, request.body);
  }

  async sources(request: BackendContract.SourcesRequest): Promise<BackendContract.SourcesResponse> {
    const adminError = await this.authorizeAdmin(request.authorization);
    if (adminError) {
      return adminError;
    }

    return this.catalog.createSource(request.body);
  }

  async getCatalog(request: BackendContract.GetCatalogRequest): Promise<BackendContract.GetCatalogResponse> {
    const adminError = await this.authorizeAdmin(request.authorization);
    if (adminError) {
      return adminError;
    }

    return { status: 200, body: await this.catalog.getAdminCatalog() };
  }

  async getSource(request: BackendContract.GetSourceRequest): Promise<BackendContract.GetSourceResponse> {
    const adminError = await this.authorizeAdmin(request.authorization);
    if (adminError) {
      return adminError;
    }

    return this.catalog.getAdminSource(request.sourceCode);
  }

  async getOptions(request: BackendContract.GetOptionsRequest): Promise<BackendContract.GetOptionsResponse> {
    const adminError = await this.authorizeAdmin(request.authorization);
    if (adminError) {
      return adminError;
    }

    return { status: 200, body: await this.catalog.getSourceOptions() };
  }

  async updateSource(request: BackendContract.UpdateSourceRequest): Promise<BackendContract.UpdateSourceResponse> {
    const adminError = await this.authorizeAdmin(request.authorization);
    if (adminError) {
      return adminError;
    }

    return this.catalog.updateSource(request.sourceCode, request.body);
  }

  async shlokas(request: BackendContract.ShlokasRequest): Promise<BackendContract.ShlokasResponse> {
    const adminError = await this.authorizeAdmin(request.authorization);
    if (adminError) {
      return adminError;
    }

    return this.catalog.createShloka(request.body);
  }

  async getShloka(request: BackendContract.GetShlokaRequest): Promise<BackendContract.GetShlokaResponse> {
    const adminError = await this.authorizeAdmin(request.authorization);
    if (adminError) {
      return adminError;
    }

    return this.catalog.getAdminShloka(request.shlokaCode);
  }

  async updateShloka(request: BackendContract.UpdateShlokaRequest): Promise<BackendContract.UpdateShlokaResponse> {
    const adminError = await this.authorizeAdmin(request.authorization);
    if (adminError) {
      return adminError;
    }

    return this.catalog.updateShloka(request.shlokaCode, request.body);
  }

  private async authorizeAdmin(authorization: string | undefined): Promise<AdminAuthorizationError | undefined> {
    const session = await this.auth.lookupSession(authorization);
    if (!session) {
      return { status: 401, body: unauthorizedError };
    }
    if (!session.account.roles.includes("admin")) {
      return { status: 403, body: forbiddenError };
    }

    return undefined;
  }
}

function emptyDashboard(): ApiTypes.EmptyDashboardDto {
  return {
    hasPersonalShlokas: false,
    showStreak: false,
    showReviewBlock: false,
    primaryAction: {
      label: "Добавить",
      target: "/library",
    },
  };
}

function isValidDashboardLimit(limit: number | undefined): boolean {
  return limit === undefined || (Number.isInteger(limit) && limit > 0);
}

function normalizeTip(value: unknown): ApiTypes.SaveLearningTipRequest | undefined {
  if (!value || typeof value !== "object" || !("title" in value) || !("text" in value) ||
    typeof value.title !== "string" || typeof value.text !== "string") return undefined;
  const title = value.title.trim();
  const text = value.text.trim();
  if (!title || [...title].length > 120 || !text || [...text].length > 2000) return undefined;
  return { title, text };
}

function isValidReviewResult(value: unknown): value is ApiTypes.ReviewResult {
  return value === "remembered_without_error" ||
    value === "remembered_with_error" ||
    value === "remembered_with_hint" ||
    value === "forgot";
}
