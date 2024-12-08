import React, {useState} from "react";
import { useForm } from "react-hook-form";
import useSWR from 'swr'
import {useSWRConfig} from 'swr'
import {upperCase} from 'lodash'
import { Input } from "./common/Input";
import Button from "./common/Button";
import Spinner from "./common/Spinner";
import {EditIcon, CloseIcon, TrashIcon, EyeIcon} from "./icons";
import * as utils from '../utils/utils'
import { Tooltip, TooltipTrigger, TooltipArrow, TooltipContent } from "./common/Tooltip";

export default function Insurances() {

  const API_URL = '/api/insurances';
  const API_URL_STUDENTS = '/api/students';
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('LIST');
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { data, error, isLoading, isValidating } = useSWR(API_URL, (url) => fetch(url).then(res => res.json()))
  const { data: dataStudents } = useSWR(API_URL_STUDENTS, (url) => fetch(url).then(res => res.json()))
  const { mutate } = useSWRConfig()

  const dataSearch = data ? data?.length > 0 && data?.filter((d) => search ? d.plan.toLowerCase().includes(search.toLowerCase()) : d) : [];

  if (error) console.log(error)

  const removeInsurance = async (insuranceId) => {
    if (window.confirm("Seguro desea eliminar esta obra social?")) {
      try {
        await mutate(API_URL, utils.deleteRequest(`${API_URL}/${insuranceId}`), {optimisticData: true})
      } catch (e) {
        console.log(e);
      }
    }
  }

  const onSubmit = async (data) => {
    try {
      setIsLoadingSubmit(true)
      if (selectedInsurance) {
        await mutate(API_URL, utils.patchRequest(`${API_URL}/${selectedInsurance._id}`, data), {optimisticData: true})
      }else{
        await mutate(API_URL, utils.postRequest(API_URL, data), {optimisticData: true})
      }
      setIsLoadingSubmit(false)
      setStage('LIST')
    } catch (e) {
      console.log(e);
    }
  }

  const onEdit = (insuranceId) => {
    reset()
    const insurance = data.find(insurance => insurance._id === insuranceId) || null;
    setSelectedInsurance(insurance);
    setStage('CREATE')
  }

  const onView = (insuranceId) => {
    const insurance = data.find(insurance => insurance._id === insuranceId) || null;
    setSelectedInsurance(insurance);
    setViewOnly(true)
    setStage('CREATE')
  }

  const onCreate = () => {
    setSelectedInsurance(null);
    setStage('CREATE')
  }
  
  const onCancel = () => {
    setSelectedInsurance(null);
    setViewOnly(false)
    reset()
    setStage('LIST')
  }

  const billingDayValidation = (billingDay) => {
    return billingDay > 0 && billingDay < 29;
  }

  const cuitValidation = (cuit) => {
    if (!viewOnly) return null;
    return !data.find(insurance => insurance.cuit === cuit);
  }

  return (
    <div className="h-full overflow-auto">
      <div className="w-full flex sticky top-0 z-10 bg-white shadow pb-4 px-4 flex-wrap">
        <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight ">Obras Sociales</h1>
        
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
        stage === 'LIST' && (
          <div className="w-full flex bg-white rounded pb-4 px-4">
            <Input onKeyDown={utils.handleKeyPress} rightElement={<div className="cursor-pointer" onClick={() => setSearch('')}>{search && <CloseIcon />}</div>} type="text" value={search} name="search" id="search" placeholder="Buscador..." onChange={(e) => setSearch(e.target.value)} />
          </div>
        )
      }
      {
        stage === 'LIST' && data && (
          <div className="mt-4 mb-28 px-4">
            <p className="pl-1 pb-1 text-slate-500">Total de obras sociales {data.length}</p>
            <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden ">
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] " style={{"backgroundPosition": "10px 10px"}}></div>
              <div className="relative rounded-xl overflow-auto">
                <div className="shadow-sm overflow-auto my-8">
                  <table className="border-collapse table-auto w-full text-sm">
                    <thead>
                      <tr>
                        {/* <th className="border-b  font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 text-left">Nombre</th> */}
                        <th className="border-b  font-medium p-4 pt-0 pb-3 text-slate-400 text-left w-4">#</th>
                        <th className="border-b  font-medium p-4 pt-0 pb-3 text-slate-400 text-left">Obra Social</th>
                        <th className="border-b  font-medium p-4 pt-0 pb-3 text-slate-400 text-left">Alumnos</th>
                        <th className="border-b  font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-left">Dia de Facturacion</th>
                        <th className="border-b  font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-left">Plazo de pago</th>
                        <th className="border-b  font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white ">
                      {
                        dataSearch.length ? 
                          dataSearch.map((insurance, index) => (
                             <tr key={insurance._id} className={utils.cn('border-b last:border-b-0 hover:bg-gray-100', (index % 2 === 0) && 'bg-gray-50')}>  
                              {/* <td className="border-b border-slate-100  p-4 pl-8 text-slate-500 ">{insurance.name}</td> */}
                              <td className="border-b !text-xs border-slate-100  p-4 text-slate-500 ">{index+1}</td>
                              <td className="border-b !text-xs border-slate-100  p-4 text-slate-500 ">{upperCase(insurance.plan)}</td>
                              <td className="border-b !text-xs border-slate-100  p-4 text-slate-500 ">
                                <Tooltip>
                                  <TooltipTrigger>
                                    {dataStudents?.filter(student => student.healthInsurance===insurance._id).length}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <TooltipArrow intent="dark" />
                                      {
                                        dataStudents?.filter(student => student.healthInsurance===insurance._id).map((student, index) => (
                                          <div key={student._id} className="w-full text-xs">
                                            <div>{'•' + ' ' + (index+1) + ' ' + upperCase(student.name + ' ' + student.lastName)}</div>
                                          </div>
                                        ))
                                      }
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                              <td className="border-b !text-xs border-slate-100  p-4 pr-8 text-slate-500 ">{insurance.billingDay}</td>
                              <td className="border-b !text-xs border-slate-100  p-4 pr-8 text-slate-500 ">{insurance.daysForPayment}</td>
                              <td className="border-b border-slate-100  text-slate-500 w-10">
                                <div className="flex gap-2">
                                  <button className="flex items-center justify-center w-8 h-8" title="Ver detalle" onClick={() => onView(insurance._id)}><EyeIcon/></button>
                                  <button className="flex items-center justify-center w-8 h-8" title="Editar" onClick={() => onEdit(insurance._id)}><EditIcon/></button>
                                  <button className="flex items-center justify-center w-8 h-8" title="Eliminar" onClick={() => removeInsurance(insurance._id)}><TrashIcon/></button>
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
                    <table className="border-collapse table-auto w-full text-sm bg-white">
                      <tbody>
                        {/* ================ */}
                        <tr>
                          <td>
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Obra Social:</label>
                              {
                                viewOnly ? 
                                <label className="text-slate-500 w-64">{selectedInsurance?.plan}</label>
                                :
                                <input
                                  onKeyDown={utils.handleKeyPress}
                                  type="text"
                                  id="plan"
                                  name="plan"
                                  defaultValue={selectedInsurance?.plan || ''}
                                  {...register("plan", { required: true })}
                                  className="rounded border border-slate-200  p-4 pl-8 text-slate-500 "  
                                />
                              }
                              {errors.plan?.type === 'required' && <span className='px-2 text-red-500'>* Obligatorio</span>}
                              {errors.plan?.type === 'validate' && <span className='px-2 text-red-500'>* Nombre existente</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        {/* ================ */}
                        <tr>
                          <td>
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">CUIT:</label>
                              {
                                viewOnly ? 
                                <label className="text-slate-500 w-64">{selectedInsurance?.cuit}</label>
                                :
                                <input
                                  onKeyDown={utils.handleKeyPress}
                                  type="number"
                                  id="cuit"
                                  defaultValue={selectedInsurance?.cuit || ''}
                                  name="cuit"
                                  {...register("cuit", { required: true, validate: cuitValidation })}
                                  className="rounded border border-slate-200  p-4 pl-8 text-slate-500 "  
                                />
                              }
                              {errors.cuit?.type === 'required' && <span className='px-2 text-red-500'>* Obligatorio</span>}
                              {errors.cuit?.type === 'validate' && <span className='px-2 text-red-500'>* CUIT existente</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        {/* <tr>
                          <td>
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Plan:</label>
                              {
                                viewOnly ? 
                                <label className="text-slate-500 w-20">{selectedInsurance?.plan}</label>
                                :
                                <input type="text" defaultValue={selectedInsurance?.plan || ''} {...register("plan", { required: true })} className="rounded border border-slate-200  p-4 pl-8 text-slate-500 " />
                              }
                              {errors.plan && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr> */}
                        {/* ================ */}
                        <tr>
                          <td>
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Persona de contacto:</label>
                              {
                                viewOnly ? 
                                <label className="text-slate-500 w-64">{selectedInsurance?.contact}</label>
                                :
                                <input onKeyDown={utils.handleKeyPress} type="text" defaultValue={selectedInsurance?.contact || ''} {...register("contact", { required: true })} className="rounded border border-slate-200  p-4 pl-8 text-slate-500 " />
                              }
                              {errors.contact && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td>
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Email:</label>
                              {
                                viewOnly ? 
                                <label className="text-slate-500 w-64">{selectedInsurance?.email}</label>
                                :
                                <input onKeyDown={utils.handleKeyPress} type="text" defaultValue={selectedInsurance?.email || ''} {...register("email", { required: true })} className="rounded border border-slate-200  p-4 pl-8 text-slate-500 " />
                              }
                              {errors.email && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td>
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Telefono:</label>
                              {
                                viewOnly ? 
                                <label className="text-slate-500 w-64">{selectedInsurance?.phone}</label>
                                :
                                <input onKeyDown={utils.handleKeyPress} type="text" defaultValue={selectedInsurance?.phone || ''} {...register("phone", { required: true })} className="rounded border border-slate-200  p-4 pl-8 text-slate-500 " />
                              }
                              {errors.phone && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td>
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Direccion:</label>
                              {
                                viewOnly ? 
                                <label className="text-slate-500 w-64">{selectedInsurance?.address}</label>
                                :
                                <input onKeyDown={utils.handleKeyPress} type="text" defaultValue={selectedInsurance?.address || ''} {...register("address", { required: true })} className="rounded border border-slate-200  p-4 pl-8 text-slate-500 " />
                              }
                              {errors.address && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td>
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Localidad:</label>
                              {
                                viewOnly ? 
                                <label className="text-slate-500 w-64">{selectedInsurance?.city}</label>
                                :
                                <input onKeyDown={utils.handleKeyPress} type="text" defaultValue={selectedInsurance?.city || ''} {...register("city", { required: true })} className="rounded border border-slate-200  p-4 pl-8 text-slate-500 " />
                              }
                              {errors.city && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td>
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Categoria:</label>
                              {
                                viewOnly ? 
                                <label className="text-slate-500 w-64">{selectedInsurance?.category}</label>
                                :
                                <input onKeyDown={utils.handleKeyPress} type="text" defaultValue={selectedInsurance?.category || ''} {...register("category", { required: true })} className="rounded border border-slate-200  p-4 pl-8 text-slate-500 " />
                              }
                              {errors.category && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td>
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Plazo de pago:</label>
                              {
                                viewOnly ? 
                                <label className="text-slate-500 w-64">{selectedInsurance?.daysForPayment}</label>
                                :
                                <input onKeyDown={utils.handleKeyPress} type="number" defaultValue={selectedInsurance?.daysForPayment || ''} {...register("daysForPayment", { required: true })} className="rounded border border-slate-200  p-4 pl-8 text-slate-500 " />
                              }
                              {errors.daysForPayment && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td>
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Dia de facturacion:</label>
                              {
                                viewOnly ? 
                                <label className="text-slate-500 w-64">{selectedInsurance?.billingDay}</label>
                                :
                                <input
                                  onKeyDown={utils.handleKeyPress}
                                  type="text"
                                  id="billingDay"
                                  name="billingDay"
                                  defaultValue={selectedInsurance?.billingDay || ''}
                                  {...register("billingDay", { required: true, validate: billingDayValidation })}
                                  className="rounded border border-slate-200  p-4 pl-8 text-slate-500 "  
                                />
                              }
                              {errors.billingDay?.type === 'required' && <span className='px-2 text-red-500'>* Obligatorio</span>}
                              {errors.billingDay?.type === 'validate' && <span className='px-2 text-red-500'>* Nro entre 1 y 28</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Notas:</label>
                              {
                                viewOnly ? 
                                   <label className="text-slate-500 w-full">{selectedInsurance?.observations || ''}</label>
                                : <textarea defaultValue={selectedInsurance?.observations || ''} name="observations" {...register("observations")} className="rounded border border-slate-200  p-4 text-slate-500 w-64"/>
                              }
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td>
                            <div className="p-4 gap-4 flex items-center">
                              {
                                viewOnly ? 
                                  <div>
                                    <Button variant="alternativeSecondary" onClick={() => onCancel()}>Volver</Button>
                                </div>
                                :
                                  <div className="gap-4 flex">
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
