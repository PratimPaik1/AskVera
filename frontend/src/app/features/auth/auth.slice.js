import { createSlice } from "@reduxjs/toolkit";

const authSlice=createSlice(
    {
        name:"auth",
        initialState:{
            user:null,
            loading:false,
            error:null
        },
        reducers:{
            setError:(state,action)=>{
                state.error=action.payload
            },
            setUser:(state,action)=>{
                state.user=action.payload
            },
            setLoading:(state,action)=>{
                state.loading=action.payload
            }
        }
    }
)


export const {setError,setLoading,setUser}=authSlice.actions

export default authSlice.reducer