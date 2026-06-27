import { Inject, Injectable } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { notFoundError, validationError } from "../auth/api-error.js";
import { CatalogService } from "../catalog/catalog.service.js";
import {
  USER_LIBRARY_REPOSITORY,
  type UserLibraryRepository,
} from "./user-library.repository.js";

@Injectable()
export class UserLibraryService {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(USER_LIBRARY_REPOSITORY)
    private readonly userLibrary: UserLibraryRepository,
  ) {}

  async getLibrary(accountId: string): Promise<ApiTypes.LibraryResponseDto> {
    const [allShlokas, statuses] = await Promise.all([
      this.catalog.listLibraryShlokas(),
      this.userLibrary.listShlokaStatuses(accountId),
    ]);
    const statusByShlokaCode = new Map(
      statuses.map((status) => [status.shlokaCode, status.status]),
    );

    return {
      ...emptyLibrary(),
      allShlokas: allShlokas.map((shloka) => ({
        ...shloka,
        personalStatus: statusByShlokaCode.get(shloka.code) ?? "available",
      })),
    };
  }

  async updateItem(
    accountId: string,
    shlokaCode: string,
    request: ApiTypes.UpdateLibraryItemRequest,
  ): Promise<
    | { status: 200; body: ApiTypes.LibraryShlokaDto }
    | { status: 400; body: ApiTypes.ApiError }
    | { status: 404; body: ApiTypes.ApiError }
  > {
    if (request.personalStatus !== "available" && request.personalStatus !== "learning") {
      return {
        status: 400,
        body: validationError(["Статус шлоки должен быть доступна или буду учить"]),
      };
    }

    const shloka = await this.catalog.getLibraryShloka(shlokaCode);
    if (!shloka) {
      return { status: 404, body: notFoundError("Шлока не найдена") };
    }

    if (request.personalStatus === "learning") {
      await this.userLibrary.setShlokaStatus({
        accountId,
        shlokaCode,
        status: "learning",
      });
    } else {
      await this.userLibrary.clearShlokaStatus({ accountId, shlokaCode });
    }

    return {
      status: 200,
      body: {
        ...shloka,
        personalStatus: request.personalStatus,
      },
    };
  }
}

function emptyLibrary(): ApiTypes.LibraryResponseDto {
  return {
    defaultTab: "reviewing",
    allShlokas: [],
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
