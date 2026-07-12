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
    notFound: "NOT_FOUND",
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

  model NotFoundResponse {
    @statusCode statusCode: 404;
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

  model AccountSettingsDto {
    hardMode: boolean;
  }

  model UpdateAccountSettingsRequest {
    hardMode: boolean;
  }

  model OkAccountSettingsResponse {
    @statusCode statusCode: 200;
    @body settings: AccountSettingsDto;
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

  enum LibraryShlokaStatus {
    available: "available",
    learning: "learning",
    reviewing: "reviewing",
  }

  enum UpdateLibraryShlokaStatus {
    available: "available",
    learning: "learning",
  }

  model UpdateLibraryItemRequest {
    personalStatus: UpdateLibraryShlokaStatus;
  }

  model LibraryShlokaDto {
    code: string;
    displayTitle: string;
    sourceTitle: string;
    number: string;
    text: string;
    personalStatus: LibraryShlokaStatus;
    fullTranslation?: string;
  }

  model OkLibraryResponse {
    @statusCode statusCode: 200;
    @body library: LibraryResponseDto;
  }

  model OkLibraryShlokaResponse {
    @statusCode statusCode: 200;
    @body shloka: LibraryShlokaDto;
  }

  model CompleteLearningDto {
    shloka: LibraryShlokaDto;
    remainingLearningShlokas: LibraryShlokaDto[];
  }

  model OkCompleteLearningResponse {
    @statusCode statusCode: 200;
    @body result: CompleteLearningDto;
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

  model AdminSourceDto {
    code: string;
    title: string;
    description?: string;
    structureType: SourceStructureType;
    chapters: SourceChapterOptionDto[];
    parts: SourcePartOptionDto[];
  }

  model AdminCatalogShlokaDto {
    code: string;
    partCode?: string;
    chapterCode?: string;
    number: string;
    text: string;
    fullTranslation?: string;
  }

  model AdminCatalogSourceDto {
    code: string;
    title: string;
    description?: string;
    structureType: SourceStructureType;
    chapters: SourceChapterOptionDto[];
    parts: SourcePartOptionDto[];
    shlokas: AdminCatalogShlokaDto[];
  }

  model AdminCatalogDto {
    sources: AdminCatalogSourceDto[];
  }

  model CreatedSourceResponse {
    @statusCode statusCode: 201;
    @body source: SourceOptionDto;
  }

  model OkAdminCatalogResponse {
    @statusCode statusCode: 200;
    @body catalog: AdminCatalogDto;
  }

  model OkAdminSourceOptionsResponse {
    @statusCode statusCode: 200;
    @body options: AdminSourceOptionsDto;
  }

  model OkAdminSourceResponse {
    @statusCode statusCode: 200;
    @body source: AdminSourceDto;
  }

  model UpdateSourceChapterRequest {
    code: string;
    title: string;
    order: int32;
  }

  model UpdateSourcePartRequest {
    code: string;
    title: string;
    order: int32;
    chapters: UpdateSourceChapterRequest[];
  }

  model UpdateSourceRequest {
    title: string;
    description?: string;
    chapters?: UpdateSourceChapterRequest[];
    parts?: UpdateSourcePartRequest[];
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

  model AdminShlokaDto {
    code: string;
    sourceCode: string;
    sourceTitle: string;
    partCode?: string;
    partTitle?: string;
    chapterCode?: string;
    chapterTitle?: string;
    number: string;
    text: string;
    padas: string[];
    fullTranslation?: string;
  }

  model UpdateShlokaRequest {
    padas: string[];
    fullTranslation?: string;
  }

  model OkAdminShlokaResponse {
    @statusCode statusCode: 200;
    @body shloka: AdminShlokaDto;
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

  @tag("Account")
  @route("/account")
  namespace Account {
    @get
    @route("/settings")
    op getAccountSettings(@header authorization?: string):
      OkAccountSettingsResponse | UnauthorizedResponse;

    @patch
    @route("/settings")
    op updateAccountSettings(@header authorization?: string, @body request: UpdateAccountSettingsRequest):
      OkAccountSettingsResponse | ValidationErrorResponse | UnauthorizedResponse;
  }

  @tag("Library")
  @route("/library")
  namespace Library {
    @get
    op getLibrary(@header authorization?: string):
      OkLibraryResponse | UnauthorizedResponse;

    @get
    @route("/items/{shlokaCode}")
    op getItem(@path shlokaCode: string, @header authorization?: string):
      OkLibraryShlokaResponse | UnauthorizedResponse | NotFoundResponse;

    @patch
    @route("/items/{shlokaCode}")
    op updateItem(@path shlokaCode: string, @header authorization?: string, @body request: UpdateLibraryItemRequest):
      OkLibraryShlokaResponse | ValidationErrorResponse | UnauthorizedResponse | NotFoundResponse;

    @post
    @route("/items/{shlokaCode}/complete-learning")
    op completeLearning(@path shlokaCode: string, @header authorization?: string):
      OkCompleteLearningResponse | ValidationErrorResponse | UnauthorizedResponse | NotFoundResponse;
  }

  @tag("Admin")
  @route("/admin")
  namespace Admin {
    @get
    @route("/catalog")
    op getAdminCatalog(@header authorization?: string):
      OkAdminCatalogResponse | UnauthorizedResponse | ForbiddenResponse;

    @post
    @route("/sources")
    op createSource(@header authorization?: string, @body request: CreateSourceRequest):
      CreatedSourceResponse | ValidationErrorResponse | UnauthorizedResponse | ForbiddenResponse | ConflictErrorResponse;

    @get
    @route("/sources/{sourceCode}")
    op getAdminSource(@path sourceCode: string, @header authorization?: string):
      OkAdminSourceResponse | UnauthorizedResponse | ForbiddenResponse | NotFoundResponse;

    @patch
    @route("/sources/{sourceCode}")
    op updateSource(@path sourceCode: string, @header authorization?: string, @body request: UpdateSourceRequest):
      OkAdminSourceResponse | ValidationErrorResponse | UnauthorizedResponse | ForbiddenResponse | NotFoundResponse | ConflictErrorResponse;

    @get
    @route("/sources/options")
    op getAdminSourceOptions(@header authorization?: string):
      OkAdminSourceOptionsResponse | UnauthorizedResponse | ForbiddenResponse;

    @post
    @route("/shlokas")
    op createShloka(@header authorization?: string, @body request: CreateShlokaRequest):
      CreatedShlokaResponse | ValidationErrorResponse | UnauthorizedResponse | ForbiddenResponse | ConflictErrorResponse;

    @get
    @route("/shlokas/{shlokaCode}")
    op getAdminShloka(@path shlokaCode: string, @header authorization?: string):
      OkAdminShlokaResponse | UnauthorizedResponse | ForbiddenResponse | NotFoundResponse;

    @patch
    @route("/shlokas/{shlokaCode}")
    op updateShloka(@path shlokaCode: string, @header authorization?: string, @body request: UpdateShlokaRequest):
      OkAdminShlokaResponse | ValidationErrorResponse | UnauthorizedResponse | ForbiddenResponse | NotFoundResponse;
  }
}
