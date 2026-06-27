import { Inject, Injectable } from "@nestjs/common";
import type { ApiTypes, BackendContract } from "@sanskrit-shloka-learning/api-contract";

import { AccountSettingsService } from "../accounts/account-settings.service.js";
import { AuthService } from "../auth/auth.service.js";
import { forbiddenError, unauthorizedError, validationError } from "../auth/api-error.js";
import { CatalogService } from "../catalog/catalog.service.js";
import { UserLibraryService } from "../library/user-library.service.js";

type AdminAuthorizationError =
  | { status: 401; body: ApiTypes.ApiError }
  | { status: 403; body: ApiTypes.ApiError };

@Injectable()
export class ApiHandlersService implements BackendContract.ApiHandlers {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AccountSettingsService) private readonly accountSettings: AccountSettingsService,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(UserLibraryService) private readonly userLibrary: UserLibraryService,
  ) {}

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

    return this.userLibrary.getShloka(session.account.id, request.shlokaCode);
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
