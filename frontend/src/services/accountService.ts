import axios, { AxiosError } from "axios";
import config from "../config/config";
import { User } from "../types";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

interface UserSettings {
  theme?: "light" | "dark";
  defaultPage?: "notes" | "calendar" | "home";
  defaultNoteSort?: "date" | "title" | "lastModified";
  confirmDelete?: boolean;
  notifications_enabled?: boolean;
  language?: string;
}

interface UpdateUserData {
  username: string;
  email: string;
  currentPassword: string;
  newPassword?: string;
}

interface UpdateResponse {
  user: User;
  message?: string;
}

interface ApiErrorData {
  message?: string;
  error?: string;
}

export const accountService = {
  getUserSettings: async (userId: string): Promise<UserSettings> => {
    try {
      const response = await api.get("/account/settings");

      if (!response.data) {
        throw new Error("No se encontró la configuración");
      }

      return response.data;
    } catch (error: unknown) {
      console.error("Error al obtener la configuración:", error);
      const axiosError = error as AxiosError<ApiErrorData>;

      if (axiosError.response?.status === 404) {
        try {
          const defaultSettings: UserSettings = {
            theme: "dark",
            defaultPage: "notes",
            defaultNoteSort: "date",
            confirmDelete: true,
            notifications_enabled: true,
            language: "es",
          };

          const newSettings = await accountService.updateUserSettings(
            userId,
            defaultSettings
          );
          return newSettings;
        } catch (createError) {
          console.error(
            "Error al crear configuración por defecto:",
            createError
          );
          return {
            theme: "dark",
            defaultPage: "notes",
            defaultNoteSort: "date",
            confirmDelete: true,
          };
        }
      }

      return {
        theme: "dark",
        defaultPage: "notes",
        defaultNoteSort: "date",
        confirmDelete: true,
      };
    }
  },

  updateUserSettings: async (
    userId: string,
    settings: UserSettings
  ): Promise<UserSettings> => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No hay token de autenticación");
      }

      const response = await api.put("/account/settings", settings);

      if (!response.data) {
        throw new Error("No se recibió respuesta del servidor");
      }

      return response.data;
    } catch (error: unknown) {
      console.error("Error al actualizar la configuración:", error);
      const axiosError = error as AxiosError<ApiErrorData>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Error al actualizar la configuración del usuario"
      );
    }
  },

  updateUser: async (userData: UpdateUserData): Promise<UpdateResponse> => {
    try {
        const response = await api.put<UpdateResponse>('/account/update', userData);
        return response.data;
    } catch (error: unknown) {
        const axiosError = error as AxiosError<ApiErrorData>;
        console.error("Error detallado:", {
            config: axiosError.config,
            response: axiosError.response,
            message: axiosError.message
        });

        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                throw new Error('Contraseña actual incorrecta');
            } else if (error.response?.status === 404) {
                throw new Error('Usuario no encontrado');
            } else if (error.response?.data?.error) {
                throw new Error(error.response.data.error);
            }
        }
        throw new Error('Error al actualizar el usuario');
    }
  },

  updateUserProfileImage: async (formData: FormData): Promise<string> => {
    try {
        const response = await api.post("/account/upload-profile-image", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        if (!response.data || !response.data.profile_image) {
            throw new Error("No se recibió la URL de la imagen");
        }

        // Extraer solo la parte relativa de la URL
        const imageUrl = response.data.profile_image;
        return imageUrl.replace(`${config.BASE_URL}/api`, '');
    } catch (error) {
        console.error("Error en updateUserProfileImage:", error);
        throw error;
    }
  },

  deleteUserAccount: async (userId, password) => {
    if (!userId) throw new Error("ID de usuario no proporcionado");
    
    try {
      const response = await api.delete(`/account/delete`, {
        data: { password } // Envía la contraseña en el cuerpo de la petición DELETE
      });
      return response.data;
    } catch (error) {
      console.error("Error al eliminar cuenta:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Error al eliminar la cuenta");
      }
      throw error;
    }
  }
};

// Interceptor para añadir el token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default accountService;
