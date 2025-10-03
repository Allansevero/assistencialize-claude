import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:8080', // A URL base da sua API
});

// Interceptor para adicionar o token a cada pedido
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;
