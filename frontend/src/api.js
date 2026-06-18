import axios from 'axios'
import {ACCESS_TOKEN, REFRESH_TOKEN} from "./constants"
import {jwtDecode} from "jwt-decode";

const authApi = axios.create({
    baseURL: import.meta.env.VITE_API_URL
})

const refreshToken = async () => {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN);
        try {
            const res = await authApi.post("/api/auth/refresh/", {
                refresh: refreshToken,
            });
            if (res.status === 200) {
                localStorage.setItem(ACCESS_TOKEN, res.data.access)
                return res.data.access
            }
            return null
        } catch (error) {
            console.log(error);
            localStorage.removeItem(ACCESS_TOKEN)
            localStorage.removeItem(REFRESH_TOKEN)
            return null
        }
    };

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL
})

api.interceptors.request.use(
    async (config) => {
        let token = localStorage.getItem(ACCESS_TOKEN)

        if (!token) return config

        let tokenExpiration
        try {
            tokenExpiration = jwtDecode(token).exp
        } catch (error) {
            localStorage.removeItem(ACCESS_TOKEN)
            localStorage.removeItem(REFRESH_TOKEN)
            return config
        }

        const now = Date.now() / 1000;

        if (tokenExpiration < now) {
            const refreshedToken = await refreshToken();
            if (!refreshedToken) {
                return config
            }
            token = localStorage.getItem(ACCESS_TOKEN)
        }

        config.headers.Authorization = `Bearer ${token}`
        
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

export default api