"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeQuery = void 0;
const database_1 = require("../database");
const executeQuery = async (query, params) => {
    try {
        const result = await database_1.pool.query(query, params);
        return result.rows;
    }
    catch (error) {
        console.error('Error ejecutando query:', error);
        throw error;
    }
};
exports.executeQuery = executeQuery;
