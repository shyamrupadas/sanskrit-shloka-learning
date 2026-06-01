import "@typespec/http";

using TypeSpec.Http;

@service(#{
  title: "Sanskrit Shloka Learning API",
})
@server("http://localhost:3000", "Local development API")
@route("/api")
namespace SanskritShlokaLearning;

namespace SanskritShlokaLearning {
  model ApiError {
    code: ErrorCode;
    message: string;
    details?: string[];
  }

  enum ErrorCode {
    validationError: "VALIDATION_ERROR",
    invalidCredentials: "INVALID_CREDENTIALS",
    emailAlreadyRegistered: "EMAIL_ALREADY_REGISTERED",
    unauthorized: "UNAUTHORIZED",
  }

  model ValidationErrorResponse {
    @statusCode statusCode: 400;
    @body error: ApiError;
  }

  model UnauthorizedResponse {
    @statusCode statusCode: 401;
    @body error: ApiError;
  }

  model ConflictErrorResponse {
    @statusCode statusCode: 409;
    @body error: ApiError;
  }

  model AccountDto {
    id: string;
    email: string;
  }

  model AuthSessionDto {
    account: AccountDto;
    accessToken: string;
  }

  model RegisterRequest {
    email: string;

    @minLength(6)
    password: string;

    @minLength(6)
    passwordConfirmation: string;
  }

  model LoginRequest {
    email: string;

    @minLength(6)
    password: string;
  }

  model CreatedAuthSessionResponse {
    @statusCode statusCode: 201;
    @body session: AuthSessionDto;
  }

  model OkAuthSessionResponse {
    @statusCode statusCode: 200;
    @body session: AuthSessionDto;
  }

  model NoContentResponse {
    @statusCode statusCode: 204;
  }

  model EmptyDashboardDto {
    hasPersonalShlokas: false;
    showStreak: false;
    showReviewBlock: false;
    primaryAction: DashboardPrimaryActionDto;
  }

  model DashboardPrimaryActionDto {
    label: "Добавить";
    target: "/library";
  }

  model OkDashboardResponse {
    @statusCode statusCode: 200;
    @body dashboard: EmptyDashboardDto;
  }

  enum LibraryTab {
    reviewing: "reviewing",
    learning: "learning",
    all: "all",
  }

  model LibraryTabDto {
    id: LibraryTab;
    label: string;
    emptyTitle: string;
    emptyDescription: string;
  }

  model LibraryResponseDto {
    defaultTab: LibraryTab;
    tabs: LibraryTabDto[];
  }

  model OkLibraryResponse {
    @statusCode statusCode: 200;
    @body library: LibraryResponseDto;
  }
}

namespace SanskritShlokaLearning {
  @tag("Auth")
  @route("/auth")
  namespace Auth {
    @post
    @route("/register")
    op register(@body request: RegisterRequest):
      CreatedAuthSessionResponse | ValidationErrorResponse | ConflictErrorResponse;

    @post
    @route("/login")
    op login(@body request: LoginRequest):
      OkAuthSessionResponse | ValidationErrorResponse | UnauthorizedResponse;

    @get
    @route("/session")
    op getSession(@header authorization?: string):
      OkAuthSessionResponse | UnauthorizedResponse;

    @post
    @route("/logout")
    op logout(@header authorization?: string):
      NoContentResponse | UnauthorizedResponse;
  }

  @tag("Dashboard")
  @route("/dashboard")
  namespace Dashboard {
    @get
    op getDashboard(@header authorization?: string):
      OkDashboardResponse | UnauthorizedResponse;
  }

  @tag("Library")
  @route("/library")
  namespace Library {
    @get
    op getLibrary(@header authorization?: string):
      OkLibraryResponse | UnauthorizedResponse;
  }
}
