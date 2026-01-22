"use strict";
/**
 * Error Classes - Centralized Export
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapError = exports.isAppError = exports.DatabaseError = exports.ServiceUnavailableError = exports.InternalError = exports.TooManyRequestsError = exports.ValidationError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.AppError = void 0;
var AppError_1 = require("./AppError");
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return AppError_1.AppError; } });
Object.defineProperty(exports, "BadRequestError", { enumerable: true, get: function () { return AppError_1.BadRequestError; } });
Object.defineProperty(exports, "UnauthorizedError", { enumerable: true, get: function () { return AppError_1.UnauthorizedError; } });
Object.defineProperty(exports, "ForbiddenError", { enumerable: true, get: function () { return AppError_1.ForbiddenError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return AppError_1.NotFoundError; } });
Object.defineProperty(exports, "ConflictError", { enumerable: true, get: function () { return AppError_1.ConflictError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return AppError_1.ValidationError; } });
Object.defineProperty(exports, "TooManyRequestsError", { enumerable: true, get: function () { return AppError_1.TooManyRequestsError; } });
Object.defineProperty(exports, "InternalError", { enumerable: true, get: function () { return AppError_1.InternalError; } });
Object.defineProperty(exports, "ServiceUnavailableError", { enumerable: true, get: function () { return AppError_1.ServiceUnavailableError; } });
Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function () { return AppError_1.DatabaseError; } });
Object.defineProperty(exports, "isAppError", { enumerable: true, get: function () { return AppError_1.isAppError; } });
Object.defineProperty(exports, "wrapError", { enumerable: true, get: function () { return AppError_1.wrapError; } });
