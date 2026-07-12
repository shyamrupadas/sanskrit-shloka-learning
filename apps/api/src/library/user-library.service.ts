import { Inject, Injectable } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { notFoundError, validationError } from "../auth/api-error.js";
import { CatalogService } from "../catalog/catalog.service.js";
import {
  USER_LIBRARY_REPOSITORY,
  type UserLibraryRepository,
} from "./user-library.repository.js";

export type UserLibraryClock = () => Date;
export const USER_LIBRARY_CLOCK = Symbol("USER_LIBRARY_CLOCK");

@Injectable()
export class UserLibraryService {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(USER_LIBRARY_REPOSITORY)
    private readonly userLibrary: UserLibraryRepository,
    @Inject(USER_LIBRARY_CLOCK) private readonly now: UserLibraryClock,
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

  async getShloka(
    accountId: string,
    shlokaCode: string,
  ): Promise<{ status: 200; body: ApiTypes.LibraryShlokaDto } | { status: 404; body: ApiTypes.ApiError }> {
    const [shloka, statuses] = await Promise.all([
      this.catalog.getLibraryShloka(shlokaCode),
      this.userLibrary.listShlokaStatuses(accountId),
    ]);
    if (!shloka) {
      return { status: 404, body: notFoundError("Шлока не найдена") };
    }

    const personalStatus = statuses.find((status) => status.shlokaCode === shlokaCode)?.status ?? "available";

    return {
      status: 200,
      body: {
        ...shloka,
        personalStatus,
      },
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

    const [shloka, statuses] = await Promise.all([
      this.catalog.getLibraryShloka(shlokaCode),
      this.userLibrary.listShlokaStatuses(accountId),
    ]);
    if (!shloka) {
      return { status: 404, body: notFoundError("Шлока не найдена") };
    }

    const currentStatus = statuses.find(
      (status) => status.shlokaCode === shlokaCode,
    )?.status;
    if (currentStatus === "reviewing") {
      return {
        status: 400,
        body: validationError([
          "Шлоку в повторении нельзя вернуть в доступное состояние",
        ]),
      };
    }

    if (request.personalStatus === "learning") {
      await this.userLibrary.setShlokaStatus({
        accountId,
        shlokaCode,
        status: "learning",
      });
    } else {
      const removed = await this.userLibrary.clearShlokaStatus({
        accountId,
        shlokaCode,
      });
      if (currentStatus === "learning" && !removed) {
        const latestStatus = (
          await this.userLibrary.listShlokaStatuses(accountId)
        ).find((status) => status.shlokaCode === shlokaCode)?.status;
        if (latestStatus === "reviewing") {
          return {
            status: 400,
            body: validationError([
              "Шлоку в повторении нельзя вернуть в доступное состояние",
            ]),
          };
        }
      }
    }

    return {
      status: 200,
      body: {
        ...shloka,
        personalStatus: request.personalStatus,
      },
    };
  }

  async completeLearning(
    accountId: string,
    shlokaCode: string,
  ): Promise<
    | { status: 200; body: ApiTypes.CompleteLearningDto }
    | { status: 400; body: ApiTypes.ApiError }
    | { status: 404; body: ApiTypes.ApiError }
  > {
    const shloka = await this.catalog.getLibraryShloka(shlokaCode);
    if (!shloka) {
      return { status: 404, body: notFoundError("Шлока не найдена") };
    }

    const transition = await this.userLibrary.markShlokaLearned({
      accountId,
      reviewingStartedAt: this.now(),
      shlokaCode,
    });
    if (transition.kind === "not-learning") {
      return {
        status: 400,
        body: validationError([
          "Только шлоку в статусе «буду учить» можно отметить выученной",
        ]),
      };
    }

    const library = await this.getLibrary(accountId);

    return {
      status: 200,
      body: {
        remainingLearningShlokas: library.allShlokas.filter(
          (candidate) => candidate.personalStatus === "learning",
        ),
        shloka: {
          ...shloka,
          personalStatus: "reviewing",
        },
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
