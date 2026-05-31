import { Request, Response, NextFunction } from 'express';
import { requireXRequestedWith } from '../middleware/csrf';

function mockRes(): Partial<Response> {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

describe('requireXRequestedWith', () => {
  it('permite métodos seguros (GET) sin la cabecera', () => {
    const req = { method: 'GET', headers: {} } as Request;
    const next = jest.fn();
    requireXRequestedWith(req, mockRes() as Response, next as NextFunction);
    expect(next).toHaveBeenCalled();
  });

  it('rechaza POST sin la cabecera con 403', () => {
    const req = { method: 'POST', headers: {} } as Request;
    const res = mockRes();
    const next = jest.fn();
    requireXRequestedWith(req, res as Response, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('permite POST con la cabecera correcta', () => {
    const req = {
      method: 'POST',
      headers: { 'x-requested-with': 'XMLHttpRequest' },
    } as unknown as Request;
    const next = jest.fn();
    requireXRequestedWith(req, mockRes() as Response, next as NextFunction);
    expect(next).toHaveBeenCalled();
  });

  it('rechaza DELETE con cabecera incorrecta', () => {
    const req = {
      method: 'DELETE',
      headers: { 'x-requested-with': 'fetch' },
    } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    requireXRequestedWith(req, res as Response, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
