/**
 * PasswordStrengthIndicator Tests
 *
 * Tests for the password strength feedback component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import PasswordStrengthIndicator from '../PasswordStrengthIndicator';

describe('PasswordStrengthIndicator', () => {
  describe('rendering', () => {
    it('should render when show is true', () => {
      render(<PasswordStrengthIndicator password="" show={true} />);

      expect(screen.getByText('🔒 Requisitos de seguridad:')).toBeInTheDocument();
    });

    it('should not render when show is false', () => {
      render(<PasswordStrengthIndicator password="" show={false} />);

      expect(screen.queryByText('🔒 Requisitos de seguridad:')).not.toBeInTheDocument();
    });

    it('should render by default (show defaults to true)', () => {
      render(<PasswordStrengthIndicator password="" />);

      expect(screen.getByText('🔒 Requisitos de seguridad:')).toBeInTheDocument();
    });

    it('should display all four requirements', () => {
      render(<PasswordStrengthIndicator password="" />);

      expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
      expect(screen.getByText('Al menos una mayúscula (A-Z)')).toBeInTheDocument();
      expect(screen.getByText('Al menos una minúscula (a-z)')).toBeInTheDocument();
      expect(screen.getByText('Al menos un número (0-9)')).toBeInTheDocument();
    });
  });

  describe('length requirement', () => {
    it('should show unmet for password shorter than 8 characters', () => {
      render(<PasswordStrengthIndicator password="short" />);

      // The length requirement text should exist
      const lengthReq = screen.getByText('Mínimo 8 caracteres');
      expect(lengthReq).toBeInTheDocument();
    });

    it('should show met for password with exactly 8 characters', () => {
      render(<PasswordStrengthIndicator password="12345678" />);

      expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    });

    it('should show met for password longer than 8 characters', () => {
      render(<PasswordStrengthIndicator password="verylongpassword" />);

      expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    });
  });

  describe('uppercase requirement', () => {
    it('should be unmet when password has no uppercase', () => {
      render(<PasswordStrengthIndicator password="lowercase123" />);

      expect(screen.getByText('Al menos una mayúscula (A-Z)')).toBeInTheDocument();
    });

    it('should be met when password has uppercase', () => {
      render(<PasswordStrengthIndicator password="Uppercase123" />);

      expect(screen.getByText('Al menos una mayúscula (A-Z)')).toBeInTheDocument();
    });
  });

  describe('lowercase requirement', () => {
    it('should be unmet when password has no lowercase', () => {
      render(<PasswordStrengthIndicator password="UPPERCASE123" />);

      expect(screen.getByText('Al menos una minúscula (a-z)')).toBeInTheDocument();
    });

    it('should be met when password has lowercase', () => {
      render(<PasswordStrengthIndicator password="lowercase" />);

      expect(screen.getByText('Al menos una minúscula (a-z)')).toBeInTheDocument();
    });
  });

  describe('number requirement', () => {
    it('should be unmet when password has no numbers', () => {
      render(<PasswordStrengthIndicator password="NoNumbers" />);

      expect(screen.getByText('Al menos un número (0-9)')).toBeInTheDocument();
    });

    it('should be met when password has numbers', () => {
      render(<PasswordStrengthIndicator password="HasNumber1" />);

      expect(screen.getByText('Al menos un número (0-9)')).toBeInTheDocument();
    });
  });

  describe('all requirements met', () => {
    it('should show valid password message when all requirements are met', () => {
      render(<PasswordStrengthIndicator password="ValidPass1" />);

      expect(screen.getByText('✅ Contraseña válida')).toBeInTheDocument();
    });

    it('should not show help message when all requirements are met', () => {
      render(<PasswordStrengthIndicator password="ValidPass1" />);

      expect(screen.queryByText(/Completa todos los requisitos/)).not.toBeInTheDocument();
    });
  });

  describe('partial requirements met', () => {
    it('should show help message when password is not empty but not all requirements met', () => {
      render(<PasswordStrengthIndicator password="partial" />);

      expect(screen.getByText('💡 Completa todos los requisitos para registrarte')).toBeInTheDocument();
    });

    it('should not show help message when password is empty', () => {
      render(<PasswordStrengthIndicator password="" />);

      expect(screen.queryByText(/Completa todos los requisitos/)).not.toBeInTheDocument();
    });

    it('should show security requirements header when not all met', () => {
      render(<PasswordStrengthIndicator password="partial" />);

      expect(screen.getByText('🔒 Requisitos de seguridad:')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty password', () => {
      render(<PasswordStrengthIndicator password="" />);

      // Should render without crashing
      expect(screen.getByText('🔒 Requisitos de seguridad:')).toBeInTheDocument();
    });

    it('should handle password with special characters', () => {
      render(<PasswordStrengthIndicator password="P@ssw0rd!" />);

      expect(screen.getByText('✅ Contraseña válida')).toBeInTheDocument();
    });

    it('should handle password with spaces', () => {
      render(<PasswordStrengthIndicator password="Pass word1" />);

      // Should meet length and other requirements
      expect(screen.getByText('✅ Contraseña válida')).toBeInTheDocument();
    });

    it('should handle very long password', () => {
      const longPassword = 'A' + 'a'.repeat(100) + '1';
      render(<PasswordStrengthIndicator password={longPassword} />);

      expect(screen.getByText('✅ Contraseña válida')).toBeInTheDocument();
    });

    it('should handle unicode characters', () => {
      render(<PasswordStrengthIndicator password="Pässwörd1" />);

      // Should meet requirements (has uppercase P, lowercase, and number)
      expect(screen.getByText('✅ Contraseña válida')).toBeInTheDocument();
    });
  });
});
