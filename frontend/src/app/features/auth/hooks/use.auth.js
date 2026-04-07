import { useDispatch } from "react-redux";
import { register, login, getMe ,logout} from "../services/auth.api";
import { setUser, setLoading, setError } from "../auth.slice";



export function useAuth() {
    const dispatch = useDispatch();

    async function handleRegister({ userName, email, password }) {
        try {
            dispatch(setLoading(true));


            const data = await register({ userName, email, password });

            return data;

        } catch (error) {
            dispatch(setError(
                error.response?.data?.message || error.message || "Something went wrong"
            ));
            throw error;

        } finally {
            dispatch(setLoading(false));
        }
    }

    async function handleLogin({ email, password }) {

        try {
            dispatch(setLoading(true))
            const data = await login({ email, password })

            dispatch(setUser(data.data.user))
            return data
        }
        catch (error) {
            // console.log(error.response.data)
            dispatch(setError(
                error.response?.data || "Something went wrong"
            ));
        }
        finally {
            dispatch(setLoading(false))
        }

    }

    async function handleGetMe() {
        try {
            dispatch(setLoading(true))
            const data = await getMe()
            dispatch(setUser(data.data.user))
        } catch (err) {
            dispatch(setError(err.response?.data?.message || "Failed to fetch user data"))
        } finally {
            dispatch(setLoading(false))
        }
    }


    async function handelLogout() {
        try{
            dispatch(setLoading(true))
            const response =await logout()
    
            dispatch(setUser(null))
        }catch (err) {
            dispatch(setError(err.response?.data?.message || "Failed to fetch user data"))
        }
        finally{
            dispatch(setLoading(false))
        }
    }

    return { handleRegister, handleLogin, handleGetMe ,handelLogout};
}
