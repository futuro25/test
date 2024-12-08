import { useNavigate } from "react-router-dom";
import React, {useState} from "react";
import Button from "./common/Button";
import md5 from 'md5';
import {EyeIcon} from './icons'
import { useForm } from "react-hook-form";
import * as utils from '../utils/utils'

export default function Login() {
  const API_URL = '/api/users/login';
  const API_USERS_URL = '/api/users';
  const [errorLogin, setErrorLogin] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();

  const setCredentials = (userLogin) => {
    sessionStorage.username = userLogin.data.username;
    sessionStorage.name = userLogin.data.name;
    sessionStorage.lastName = userLogin.data.lastName;
    sessionStorage.securityLevel = userLogin.data.securityLevel;
    navigate("/home");
  }

  const onSubmit = async (formData) => {
    const body = {
      username: formData.username,
      password: md5(formData.password)
    }

    try {
      const userLogin = await utils.postRequest(API_URL, body);
      const userId = userLogin.data._id;
      await utils.patchRequest(`${API_USERS_URL}/${userId}`, {lastlogin: new Date()});
      setCredentials(userLogin)
    } catch (error) {
      console.log(error)
      setErrorLogin('Usuario o Clave erroneos')
    }
  }

  return (
    <div className="flex flex-col w-screen h-screen text-white bg-gray-900">
      <div className="flex h-[calc(100vh-4rem)]">
        <main className="flex-1">
          <div className="h-full overflow-auto mt-4">
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center justify-center p-4 rounded w-[400px] ">
                <h1 className="rounded p-4 text-white inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight ">LOGIN</h1>

                <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col'>
                  <input type="text" {...register("username", { required: true })} className="mt-2 rounded border border-slate-200  p-4 pl-8 text-slate-500 " />
                  {errors.username && <span className='px-2 text-red-500'>* Obligatorio</span>}
                  <div className="flex">
                    <input type={isPasswordVisible ? "text" : "password"} {...register("password", { required: true })} className="mt-2 w-full rounded border border-slate-200  p-4 pl-8 text-slate-500 " />
                    <div className="relative mt-8 -ml-5 right-2.5	text-gray-900 cursor-pointer" onClick={() => setIsPasswordVisible(!isPasswordVisible)}>
                      <EyeIcon className="w-4 h-4" />
                    </div>
                  </div>
                  {errors.password && <span className='px-2 text-red-500'>* Obligatorio</span>}
                  <Button className="mt-2">Login</Button>
                  {errorLogin && <span className='p-2 text-red-500'>{errorLogin}</span>}
                </form>

              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
