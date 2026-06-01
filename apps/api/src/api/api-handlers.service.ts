import { Inject, Injectable } from "@nestjs/common";
import type { ApiTypes, BackendContract } from "@sanskrit-shloka-learning/api-contract";

import { AuthService } from "../auth/auth.service.js";
import { unauthorizedError } from "../auth/api-error.js";

@Injectable()
export class ApiHandlersService implements BackendContract.ApiHandlers {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

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
    if (!(await this.auth.lookupSession(request.authorization))) {
      return { status: 401, body: unauthorizedError };
    }

    return {
      status: 200,
      body: emptyLibrary(),
    };
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

function emptyLibrary(): ApiTypes.LibraryResponseDto {
  return {
    defaultTab: "reviewing",
    tabs: [
      {
        id: "reviewing",
        label: "Повторяю",
        emptyTitle: "Пока нет шлок в повторении",
        emptyDescription: "Добавьте первую шлоку из общей библиотеки, чтобы начать повторение.",
      },
      {
        id: "learning",
        label: "Буду учить",
        emptyTitle: "Пока нет шлок для заучивания",
        emptyDescription: "Выберите шлоку из общего списка и добавьте ее в личную библиотеку.",
      },
      {
        id: "all",
        label: "Все",
        emptyTitle: "Библиотека пока пуста",
        emptyDescription: "Опубликованные шлоки появятся здесь после наполнения каталога.",
      },
    ],
  };
}
