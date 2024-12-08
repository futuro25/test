import React, {useState} from "react";
import { useForm } from "react-hook-form";
import { fill } from "lodash";
import useSWR from 'swr'
import {useSWRConfig} from 'swr'
import {upperCase} from 'lodash'
import Button from "./common/Button";
import Spinner from "./common/Spinner";
import {EditIcon, TrashIcon, EyeIcon, CloseIcon} from "./icons";
import { Input } from "./common/Input";
import * as utils from '../utils/utils'

export default function Banks() {

  const API_URL = '/api/banks';
  const [stage, setStage] = useState('LIST');
  const [viewOnly, setViewOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { data, error, isLoading, isValidating } = useSWR(API_URL, (url) => fetch(url).then(res => res.json()))
  const dataFiltered = data && data?.length > 0 && data?.filter((d) => search ? d.name.toLowerCase().includes(search.toLowerCase()) : d);

  const { mutate } = useSWRConfig()

  if (error) console.log(error)

  const removeBank = async (bankId) => {
    if (window.confirm("Seguro desea eliminar este banco?")) {
      try {
        await mutate(API_URL, utils.deleteRequest(`${API_URL}/${bankId}`), {optimisticData: true})
      } catch (e) {
        console.log(e);
      }
    }
  }

  const onSubmit = async (data) => {
    try {
      setIsLoadingSubmit(true)
      if (selectedBank) {
        await mutate(API_URL, utils.patchRequest(`${API_URL}/${selectedBank._id}`, data), {optimisticData: true})
      }else{
        await mutate(API_URL, utils.postRequest(API_URL, data), {optimisticData: true})
      }
      setIsLoadingSubmit(false)
      setSelectedBank(null)
      setStage('LIST')
    } catch (e) {
      console.log(e);
    }
  }

  const onEdit = (bankId) => {
    reset()
    const bank = data.find(bank => bank._id === bankId) || null;
    setSelectedBank(bank);
    setStage('CREATE')
  }

  const onView = (bankId) => {
    const bank = data.find(bank => bank._id === bankId) || null;
    setSelectedBank(bank);
    setViewOnly(true)
    setStage('CREATE')
  }

  const onCreate = () => {
    setSelectedBank(null);
    setStage('CREATE')
  }
  
  const onCancel = () => {
    setSelectedBank(null);
    setViewOnly(false)
    reset()
    setStage('LIST')
  }

  return (
    <div className="h-full overflow-auto">
      <div className="w-full flex sticky top-0 z-10 bg-white shadow px-4 pb-4">
        <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight ">Bancos</h1>
        
        {
          stage === 'LIST' && !viewOnly && (
            <Button variant="alternative" className="ml-auto" onClick={() => onCreate()}>Crear</Button>
          )
        }

        {
          stage === 'CREATE' && !viewOnly && (
            <div className="ml-auto gap-2 flex">
              <Button variant="destructive" onClick={() => onCancel()}>Cancelar</Button>
              <Button onClick={() => { handleSubmit(onSubmit)()}} disabled={isLoadingSubmit}>{isLoadingSubmit ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          )
        }

        {
          stage === 'CREATE' && viewOnly && (
            <Button variant="alternativeSecondary" className="ml-auto" onClick={() => onCancel()}>Volver</Button>
          )
        }

      </div>
      {
        (!data) && (
          <div>
            <Spinner />
          </div>
        )
      }
      {
        error && (
          <div className="text-red-500">
            {/* ERROR... */}
          </div>
        )
      }
      {
        stage === 'LIST' && data && (
          <div className="w-full flex bg-white rounded pb-4 px-4">
            <Input rightElement={<div className="cursor-pointer" onClick={() => setSearch('')}>{search && <CloseIcon />}</div>} type="text" value={search} name="search" id="search" placeholder="Buscador..." onChange={(e) => setSearch(e.target.value)} />
          </div>
        )
      }
      {
        stage === 'LIST' && data && (
          <div className="mt-4 -mb-3 px-4">
            <p className="pl-1 pb-1 text-slate-500">Total de bancos {data.length}</p>
            <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden ">
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] " style={{"backgroundPosition": "10px 10px"}}></div>
              <div className="relative rounded-xl overflow-auto">
                <div className="shadow-sm overflow-auto my-8">
                  <table className="border-collapse table-auto w-full text-sm">
                    <thead>
                      <tr>
                        <th className="border-b  font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 text-left">Nombre</th>
                        <th className="border-b  font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white ">
                      {
                        dataFiltered.length ? 
                          dataFiltered.map((bank, index) => (
                            <tr key={bank._id} className={utils.cn('border-b last:border-b-0 hover:bg-gray-100', (index % 2 === 0) && 'bg-gray-50')}>
                              <td className="text-left !text-xs border-b border-slate-100  p-4 pl-8 text-slate-500 ">{upperCase(bank.name)}</td>
                              <td className="text-left border-b border-slate-100  text-slate-500 w-10">
                                <div className="flex gap-2">
                                  <button className="flex items-center justify-center w-8 h-8" title="Ver detalle" onClick={() => onView(bank._id)}><EyeIcon/></button>
                                  <button className="flex items-center justify-center w-8 h-8" title="Editar" onClick={() => onEdit(bank._id)}><EditIcon/></button>
                                  <button className="flex items-center justify-center w-8 h-8" title="Eliminar" onClick={() => removeBank(bank._id)}><TrashIcon/></button>
                                </div>
                              </td>
                            </tr>
                          ))
                          :
                          (
                            <tr>
                              <td colSpan={4} className="border-b border-slate-100  p-4 pl-8 text-slate-500 ">No data</td>
                            </tr>
                          )
                      }
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl "></div>
            </div>
          </div>
        )
      }

      {
        stage === 'CREATE' && (
          <div className="mt-4 -mb-3 px-4">
            <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden ">
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] " style={{"backgroundPosition": "10px 10px"}}></div>
              <div className="relative rounded-xl overflow-auto">
                <div className="shadow-sm overflow-hidden my-8">
                  <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col'>
                    <table className="border-collapse table-fixed w-full text-sm bg-white">
                      <tbody>
                        {/* ================ */}
                        <tr>
                          <td>
                            <div className="p-4 gap-2 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Nombre:</label>
                              {
                                viewOnly ? 
                                <label className="text-slate-500 w-20">{selectedBank?.name}</label>
                                :
                                <input onKeyDown={utils.handleKeyPress} type="text" defaultValue={selectedBank?.name || ''} {...register("name", { required: true })} className="rounded border border-slate-200  p-4 pl-8 text-slate-500 " />
                              }
                              {errors.name && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td>
                            <div className="p-4 gap-2 flex items-center">
                              {
                                viewOnly ? 
                                  <div>
                                    <Button variant="alternativeSecondary" onClick={() => onCancel()}>Volver</Button>
                                </div>
                                :
                                  <div className="gap-2 flex">
                                    <Button variant="destructive" onClick={() => onCancel()}>Cancelar</Button>
                                    <Button type="submit" disabled={isLoadingSubmit}>{isLoadingSubmit ? 'Guardando...' : 'Guardar'}</Button>
                                  </div>
                              }
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </form>
                </div>
              </div>
              <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl "></div>
            </div>
          </div>
        )
      }
    </div>
  );
}
