import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { register, login, getMe, logout } from "../services/auth.api";
import { setUser, setLoading, setError } from "../auth.slice";

export function useAuth() {
  const dispatch = useDispatch();

  const handleRegister = useCallback(async ({ userName, email, password }) => {
    try {
      dispatch(setLoading(true));

      const data = await register({ userName, email, password });
      dispatch(setError(null));
      return data;
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Something went wrong";
      dispatch(setError(message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const handleLogin = useCallback(async ({ email, password }) => {
    try {
      dispatch(setLoading(true));
      const data = await login({ email, password });
      dispatch(setUser(data?.data?.user || null));
      dispatch(setError(null));
      return data;
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Something went wrong";
      dispatch(setError(message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const handleGetMe = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      const data = await getMe();
      dispatch(setUser(data?.data?.user || null));
      dispatch(setError(null));
    } catch (err) {
      dispatch(setUser(null));
      dispatch(setError(err?.response?.data?.message || "Failed to fetch user data"));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const handelLogout = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      await logout();
      dispatch(setUser(null));
      dispatch(setError(null));
    } catch (err) {
      dispatch(setError(err?.response?.data?.message || "Failed to logout"));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  return { handleRegister, handleLogin, handleGetMe, handelLogout };
}
