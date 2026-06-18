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
    forbidden: "FORBIDDEN",
  }

  model ValidationErrorResponse {
    @statusCode statusCode: 400;
    @body error: ApiError;
  }

  model UnauthorizedResponse {
    @statusCode statusCode: 401;
    @body error: ApiError;
  }

  model ForbiddenResponse {
    @statusCode statusCode: 403;
    @body error: ApiError;
  }

  model ConflictErrorResponse {
    @statusCode statusCode: 409;
    @body error: ApiError;
  }

  model AccountDto {
    id: string;
    email: string;
    roles: AccountRole[];
  }

  enum AccountRole {
    admin: "admin",
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
    allShlokas: LibraryShlokaDto[];
  }

  model LibraryShlokaDto {
    code: string;
    displayTitle: string;
    sourceTitle: string;
    number: string;
    text: string;
    fullTranslation?: string;
  }

  model OkLibraryResponse {
    @statusCode statusCode: 200;
    @body library: LibraryResponseDto;
  }

  enum SourceStructureType {
    none: "none",
    chapters: "chapters",
    parts: "parts",
  }

  model CreateSourceChapterRequest {
    code: string;
    title: string;
    order: int32;
  }

  model CreateSourcePartRequest {
    code: string;
    title: string;
    order: int32;
    chapters: CreateSourceChapterRequest[];
  }

  model CreateSourceRequest {
    code: string;
    title: string;
    description?: string;
    structureType: SourceStructureType;
    chapters?: CreateSourceChapterRequest[];
    parts?: CreateSourcePartRequest[];
  }

  model SourceChapterOptionDto {
    code: string;
    title: string;
    order: int32;
  }

  model SourcePartOptionDto {
    code: string;
    title: string;
    order: int32;
    chapters: SourceChapterOptionDto[];
  }

  model SourceOptionDto {
    code: string;
    title: string;
    structureType: SourceStructureType;
    chapters: SourceChapterOptionDto[];
    parts: SourcePartOptionDto[];
  }

  model AdminSourceOptionsDto {
    sources: SourceOptionDto[];
  }

  model CreatedSourceResponse {
    @statusCode statusCode: 201;
    @body source: SourceOptionDto;
  }

  model OkAdminSourceOptionsResponse {
    @statusCode statusCode: 200;
    @body options: AdminSourceOptionsDto;
  }

  model CreateShlokaRequest {
    sourceCode: string;
    partCode?: string;
    chapterCode?: string;
    number: string;
    padas: string[];
    fullTranslation?: string;
  }

  model CreatedShlokaResponse {
    @statusCode statusCode: 201;
    @body shloka: LibraryShlokaDto;
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

  @tag("Admin")
  @route("/admin")
  namespace Admin {
    @post
    @route("/sources")
    op createSource(@header authorization?: string, @body request: CreateSourceRequest):
      CreatedSourceResponse | ValidationErrorResponse | UnauthorizedResponse | ForbiddenResponse | ConflictErrorResponse;

    @get
    @route("/sources/options")
    op getAdminSourceOptions(@header authorization?: string):
      OkAdminSourceOptionsResponse | UnauthorizedResponse | ForbiddenResponse;

    @post
    @route("/shlokas")
    op createShloka(@header authorization?: string, @body request: CreateShlokaRequest):
      CreatedShlokaResponse | ValidationErrorResponse | UnauthorizedResponse | ForbiddenResponse | ConflictErrorResponse;
  }
}
