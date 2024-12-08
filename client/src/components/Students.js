import React, { useState, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR from 'swr'
import { useSWRConfig } from 'swr'
import Button from "./common/Button";
import Spinner from "./common/Spinner";
import { EditIcon, WhatsappIcon, TrashIcon, EyeIcon, CloseIcon, CalendarIcon } from "./icons";
import * as utils from '../utils/utils'
import { Dialog, DialogContent } from "./common/Dialog";
import { Input } from "./common/Input";
import { capitalize, replace, size, upperCase } from "lodash";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";


export default function Students() {

  const API_URL = '/api/students';
  const API_URL_INSURANCES = '/api/insurances';
  const API_URL_COURSES = '/api/courses';
  const [search, setSearch] = useState('');
  const [submitErrors, setSubmitErrors] = useState('');
  const [stage, setStage] = useState('LIST');
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [cudDateForm, setCudDateForm] = useState(null);
  const [birthdayDateForm, setBirthdayDateForm] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pictureLink, setPictureLink] = useState();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm();
  const { data, error, isLoading, isValidating } = useSWR(API_URL, (url) => fetch(url).then(res => res.json()))
  const { data: dataInsurances } = useSWR(API_URL_INSURANCES, (url) => fetch(url).then(res => res.json()))
  const { data: dataCourses } = useSWR(API_URL_COURSES, (url) => fetch(url).then(res => res.json()))
  const { mutate } = useSWRConfig()
  const refSubmitButton = useRef();

  {/* Barra de FILTROS - ESTADO Y REFERENCIAS */ }
  const isFilterEnabled = true;
  const [insuranceFilter, setInsuranceFilter] = useState();
  const refInsuranceFilter = useRef(null);
  const clearFilters = () => {
    setInsuranceFilter('');
  };
  {/* Barra de FILTROS - ESTADO Y REFERENCIAS */ }

  const dataSearch = data ? data?.length > 0 && data?.filter((d) => search ? d.name.toLowerCase().includes(search.toLowerCase()) || d.lastName.toLowerCase().includes(search.toLowerCase()) : d) : [];

  const dataFiltered = dataSearch && dataSearch.filter((d) => {
    let result = d;
    if (insuranceFilter) {
      result = d.healthInsurance === insuranceFilter;
    }
    return result;
  });

  if (error) console.log(error)

  const removeSpacefromString = (string) => {
    return string.replace(/\s+/g, '');
  }

  const removeStudent = async (studentId) => {
    if (window.confirm("Seguro desea eliminar este estudiante?")) {
      try {
        await mutate(API_URL, utils.deleteRequest(`${API_URL}/${studentId}`), { optimisticData: true })
      } catch (e) {
        console.log(e);
      }
    }
  }

  const getInsuranceName = (insuranceId) => {
    return dataInsurances ? dataInsurances.find(insurance => insurance._id === insuranceId)?.plan || "" : "";
  }

  const getCourseName = (courseId) => {
    return dataCourses ? dataCourses.find(course => course._id === courseId)?.name || "" : "";
  }

  const onSubmit = async (data) => {

    try {
      setIsLoadingSubmit(true)
      let body = data;
      let resource;
      if (data.file.length) {
        resource = await utils.uploadResource(data);
      }

      const cudDueDate = cudDateForm || new Date(selectedStudent.cudDueDate)
      const birthdayDate = birthdayDateForm || new Date(selectedStudent.birthdayDate)
      const cudUrl = resource?.secure_url || selectedStudent.cudUrl

      body = {
        ...data,
        cudDueDate,
        birthdayDate,
        cudUrl,
      }

      if (selectedStudent) {
        await mutate(API_URL, utils.patchRequest(`${API_URL}/${selectedStudent._id}`, body), { optimisticData: true })
      } else {
        await mutate(API_URL, utils.postRequest(API_URL, body), { optimisticData: true })
      }
      setIsLoadingSubmit(false)
      setStage('LIST')
    } catch (e) {
      setIsLoadingSubmit(false)
      setSubmitErrors(e.message)
      console.log(e);
    }
  }

  const onEdit = (studentId) => {
    reset()
    const student = data.find(student => student._id === studentId) || null;
    setSelectedStudent(student);
    setStage('CREATE')
  }

  const onView = (studentId) => {
    const student = data.find(student => student._id === studentId) || null;
    setSelectedStudent(student);
    setViewOnly(true)
    setStage('CREATE')
  }

  const onCreate = () => {
    setSelectedStudent(null);
    setStage('CREATE')
  }

  const onCancel = () => {
    setSelectedStudent(null);
    setViewOnly(false)
    reset()
    setIsLoadingSubmit(false)
    setStage('LIST')
  }

  const onCloseModal = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsModalOpen(false)
  }

  const onOpenModal = (link) => {
    setPictureLink(link)
    setIsModalOpen(true)
  }

  const documentNumberValidation = (email) => {
    return !data.find(user => user.email === email);
  }

  return (
    <div className="h-full overflow-auto">
      <div className="w-full flex sticky top-0 z-10 bg-white shadow pb-4 px-4 flex-wrap">
        <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight ">Estudiantes</h1>

        {
          stage === 'LIST' && !viewOnly && (
            <Button variant="alternative" className="ml-auto" onClick={() => onCreate()}>Crear</Button>
          )
        }

        {
          stage === 'CREATE' && !viewOnly && (
            <div className="ml-auto gap-2 flex">
              <Button variant="destructive" onClick={() => onCancel()}>Cancelar</Button>
              <Button onClick={() => { handleSubmit(onSubmit)() }} disabled={isLoadingSubmit}>{isLoadingSubmit ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          )
        }

        {
          stage === 'CREATE' && viewOnly && (
            <Button variant="alternativeSecondary" className="ml-auto" onClick={() => onCancel()}>Volver</Button>
          )
        }
        {submitErrors && (
          <div role="alert" className="flex w-full px-4 py-2 my-2 text-base bg-red-500 text-white rounded-lg font-regular">
            <div className="mr-12 flex">{submitErrors}</div>
            <div className="ml-auto flex cursor-pointer" onClick={() => setSubmitErrors('')}>
              <CloseIcon />
            </div>
          </div>
        )}

      </div>
      {
        stage === 'LIST' && (
          <div className="w-full flex bg-white rounded pb-4 px-4">
            <Input onKeyDown={utils.handleKeyPress} rightElement={<div className="cursor-pointer" onClick={() => setSearch('')}>{search && <CloseIcon />}</div>} type="text" value={search} name="search" id="search" placeholder="Buscador..." onChange={(e) => setSearch(e.target.value)} />
          </div>
        )
      }

      {/* Barra de FILTROS - HTML */}
      {
        (isFilterEnabled && stage === 'LIST') && (
          <div className="w-full flex bg-white rounded pb-4 justify-start items-center gap-2 px-4">
            <div className="flex justify-center items-center gap-2">
              <label className="">Obra Social</label>
              <select onKeyDown={utils.handleKeyPress} value={insuranceFilter} onChange={() => setInsuranceFilter(refInsuranceFilter.current.value)} ref={refInsuranceFilter} className="w-40 mx-1 rounded border border-slate-200 p-1 text-slate-500 text-xs">
                <option>Seleccionar</option>
                {
                  dataInsurances?.map(insurance => {
                    return (
                      <option key={insurance._id} value={insurance._id} {...insuranceFilter === insurance._id ? 'selected' : null}>{upperCase(insurance.plan)}</option>
                    )
                  })
                }
              </select>
            </div>
            <p onClick={clearFilters} className="text-xs text-blue-500 cursor-pointer">Limpiar Filtros</p>
          </div>
        )
      }
      {/* Barra de FILTROS - HTML */}

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
          <div className="mt-4 -mb-3 px-4">
            <p className="pl-1 pb-1 text-slate-500">Total de alumnos {dataFiltered.length}</p>
            <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden  mb-32">
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] " style={{ "backgroundPosition": "10px 10px" }}></div>
              <div className="relative rounded-xl overflow-auto">
                <div className="shadow-sm overflow-auto my-8">
                  <table className="border-collapse table-auto w-full text-sm">
                    <thead>
                      <tr>
                        <th className="border-b  font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 text-left w-4">#</th>
                        <th className="border-b  font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 text-left">Nombre</th>
                        <th className="border-b  font-medium p-4 pt-0 pb-3 text-slate-400 text-left">Apellido</th>
                        <th className="border-b  font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-left">Obra Social</th>
                        <th className="border-b  font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white ">
                      {
                        dataFiltered.length ?
                          dataFiltered.map((student, index) => (
                            <tr key={student._id} className={utils.cn('border-b last:border-b-0 hover:bg-gray-100', (index % 2 === 0) && 'bg-gray-50')}>
                              <td className="text-left !text-xs border-b border-slate-100  p-4 pl-8 text-slate-500 ">{index + 1}</td>
                              <td className="text-left !text-xs border-b border-slate-100  p-4 pl-8 text-slate-500 ">{upperCase(student.name)}</td>
                              <td className="text-left !text-xs border-b border-slate-100  p-4 text-slate-500 ">{upperCase(student.lastName)}</td>
                              <td className="text-left !text-xs border-b border-slate-100  p-4 pr-8 text-slate-500 ">{getInsuranceName(student.healthInsurance)}</td>
                              <td className="text-left border-b border-slate-100  text-slate-500 w-10">
                                <div className="flex gap-2">
                                  <button className="flex items-center justify-center w-8 h-8" title="Ver detalle" onClick={() => onView(student._id)}><EyeIcon /></button>
                                  <button className="flex items-center justify-center w-8 h-8" title="Editar" onClick={() => onEdit(student._id)}><EditIcon /></button>
                                  <button className="flex items-center justify-center w-8 h-8" title="Eliminar" onClick={() => removeStudent(student._id)}><TrashIcon /></button>
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
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] " style={{ "backgroundPosition": "10px 10px" }}></div>
              <div className="relative rounded-xl overflow-auto">
                <div className="shadow-sm overflow-auto my-8">
                  <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col'>
                    <table className="border-collapse table-auto w-full text-sm bg-white">
                      <tbody>
                        {/* ================ */}
                        {/* Información del alumno */}
                        <tr className="bg-gray-200">
                          <td colSpan="2">
                            <h2 className="text-xl font-bold py-2 pl-2 text-left">Datos del alumno</h2>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2">
                            {/* <div className="p-4 gap-4 flex items-center">
                              <img src={selectedStudent?.cudUrl} alt={selectedStudent?._id} width={200} />
                            </div> */}
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Nombre:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.name}</label>
                                  :
                                  <input
                                    onKeyDown={utils.handleKeyPress}
                                    type="text"
                                    defaultValue={selectedStudent?.name || ''}
                                    {...register("name", { required: true })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
                              {errors.name && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Apellido:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.lastName}</label>
                                  :
                                  <input
                                    onKeyPress={utils.handleKeyPress}
                                    type="text"
                                    defaultValue={selectedStudent?.lastName || ''}
                                    {...register("lastName", { required: true })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
                              {errors.lastName && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Fecha Nacimiento:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{new Date(selectedStudent?.birthdayDate).toLocaleDateString('es-AR')}</label>
                                  :
                                  <Controller
                                    control={control}
                                    rules={{ required: selectedStudent?.birthdayDate ? false : true }}
                                    value={selectedStudent?.birthdayDate}
                                    id="birthdayDate"
                                    name="birthdayDate"
                                    render={({ field: { onChange } }) => {
                                      const birthdayDate = selectedStudent?.birthdayDate ? new Date(selectedStudent?.birthdayDate) : new Date()
                                      return (
                                        <div className="w-64 flex gap-2 items-center">
                                          <div className="w-4 h-4 z-10 ml-4 absolute text-slate-500"><CalendarIcon /></div>
                                          <div className="">
                                            <DatePicker
                                              onKeyDown={utils.handleKeyPress}
                                              dateFormat={"dd/MM/yyyy"}
                                              selected={birthdayDateForm || birthdayDate}
                                              onChange={(date) => {
                                                setBirthdayDateForm(date);
                                                onChange(date);
                                              }}
                                              showYearDropdown
                                              scrollableYearDropdown
                                              yearDropdownItemNumber={100}
                                            />
                                          </div>
                                        </div>
                                      )
                                    }}
                                  />
                              }
                              {errors.birthdayDate && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Curso:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64 text-xs">{upperCase(getCourseName(selectedStudent?.course))}</label>
                                  :
                                  <select
                                    onKeyDown={utils.handleKeyPress}
                                    defaultValue={selectedStudent?.course || ''}
                                    {...register("course", { required: true })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64 text-xs">
                                    <option value="" disabled>Select</option>
                                    {
                                      dataCourses && dataCourses.map(course =>
                                        <option key={course._id} value={course._id}>{upperCase(course.name)}</option>
                                      )
                                    }
                                  </select>
                              }
                              {errors.healthInsurance && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Obra Social:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64 text-xs">{upperCase(getInsuranceName(selectedStudent?.healthInsurance))}</label>
                                  :
                                  <select
                                    onKeyDown={utils.handleKeyPress}
                                    defaultValue={selectedStudent?.healthInsurance || ''}
                                    {...register("healthInsurance", { required: true })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64 text-xs">
                                    <option value="" disabled>Select</option>
                                    {
                                      dataInsurances && dataInsurances.map(insurance =>
                                        <option key={insurance._id} value={insurance._id}>{upperCase(insurance.plan)}</option>
                                      )
                                    }
                                  </select>
                              }
                              {errors.healthInsurance && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">DNI:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.documentNumber}</label>
                                  :
                                  <input
                                    onKeyDown={utils.handleKeyPress}
                                    type="text"
                                    id="documentNumber"
                                    name="documentNumber"
                                    defaultValue={selectedStudent?.documentNumber || ''}
                                    {...register("documentNumber", { required: true, validate: documentNumberValidation })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
                              {errors.documentNumber?.type === 'required' && <span className='px-2 text-red-500'>* Obligatorio</span>}
                              {errors.documentNumber?.type === 'validate' && <span className='px-2 text-red-500'>* DNI existente</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Email:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">
                                    <a className="text-blue-500" target="_blank" href={`mailto:${selectedStudent?.email}`}>{selectedStudent?.email}</a>
                                  </label>
                                  :
                                  <input
                                    onKeyDown={utils.handleKeyPress}
                                    type="text"
                                    defaultValue={selectedStudent?.email || ''}
                                    {...register("email", { required: true })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
                              {errors.email && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">CUD:</label>
                              {
                                viewOnly ?
                                  <Button variant="secondary" size="sm" onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onOpenModal(selectedStudent?.cudUrl)
                                  }}
                                  >Ver imagen</Button>
                                  :
                                  <div className="flex gap-2 items-end">
                                    <input
                                      onKeyDown={utils.handleKeyPress}
                                      type="file"
                                      {...register("file", { required: selectedStudent?.cudUrl !== "" ? false : true })}
                                      className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                    />
                                    {selectedStudent?.cudUrl !== "" && selectedStudent?.cudUrl !== undefined &&
                                      (<Button variant="secondary" size="sm" onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onOpenModal(selectedStudent?.cudUrl)
                                      }}>Ver imagen</Button>)
                                    }
                                  </div>
                              }
                              {errors.file && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">CUD Vto:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{new Date(selectedStudent?.cudDueDate).toLocaleDateString('es-AR')}</label>
                                  :
                                  <Controller
                                    control={control}
                                    rules={{ required: selectedStudent?.cudDueDate ? false : true }}
                                    value={cudDateForm}
                                    name="cudDueDate"
                                    render={({ field: { onChange } }) => {
                                      const dataDate = selectedStudent?.cudDueDate ? new Date(selectedStudent?.cudDueDate) : new Date()
                                      return (
                                        <div className="w-64 flex gap-2 items-center">
                                          <div className="w-4 h-4 z-10 ml-4 absolute text-slate-500"><CalendarIcon /></div>
                                          <div className="">
                                            <DatePicker
                                              onKeyDown={utils.handleKeyPress}
                                              name="cudDueDate"
                                              dateFormat={"dd/MM/yyyy"}
                                              selected={cudDateForm || dataDate}
                                              onChange={(date) => {
                                                setCudDateForm(date);
                                                onChange(date);
                                              }}
                                              showYearDropdown
                                              scrollableYearDropdown
                                              yearDropdownItemNumber={100}
                                            />
                                          </div>
                                        </div>
                                      )
                                    }}
                                  />
                              }
                              {errors.cudDueDate && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Habilitado:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64 text-xs">{upperCase(selectedStudent?.enabled)}</label>
                                  :
                                  <select
                                    onKeyDown={utils.handleKeyPress}
                                    defaultValue={selectedStudent?.enabled || ''}
                                    {...register("enabled", { required: true })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64 text-xs">
                                    <option value="" disabled>Select</option>
                                      <option key={"SI"} {...selectedStudent?.enabled === "SI" && "selected=selected"} value={"SI"}>SI</option>
                                      <option key={"NO"} {...selectedStudent?.enabled === "NO" && "selected=selected"} value={"NO"}>NO</option>
                                  </select>
                              }
                              {errors.enabled && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>

                        {/* ================ */}

                        {/* Datos del primer padre/madre/tutor */}
                        <tr className="bg-gray-200">
                          <td colSpan="2">
                            <h2 className="text-xl font-bold py-2 pl-2 text-left">Obra Social</h2>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Referente:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.affiliateRelative}</label>
                                  :
                                  <select
                                    onKeyDown={utils.handleKeyPress}
                                    defaultValue={selectedStudent?.affiliateRelative || ''}
                                    {...register("affiliateRelative", { required: true })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64 text-xs">
                                    <option value="" disabled>Select</option>
                                    <option {...selectedStudent?.affiliateRelative === "Obra Social" ? 'selected' : null} value="Obra Social">OBRA SOCIAL</option>
                                    <option {...selectedStudent?.affiliateRelative === "Estudiante" ? 'selected' : null} value="Estudiante">ESTUDIANTE</option>
                                    <option {...selectedStudent?.affiliateRelative === "Padre/Madre/Tutor 1" ? 'selected' : null} value="Padre/Madre/Tutor 1">PADRE / MADRE / TUTOR 1</option>
                                    <option {...selectedStudent?.affiliateRelative === "Padre/Madre/Tutor 2" ? 'selected' : null} value="Padre/Madre/Tutor 2">PADRE / MADRE / TUTOR 2</option>
                                  </select>
                              }
                              {errors.affiliateRelative && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Nro afiliado referente:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.affiliateNumber || ''}</label>
                                  : <input
                                    onKeyDown={utils.handleKeyPress}
                                    type="text"
                                    defaultValue={selectedStudent?.affiliateNumber || ''}
                                    {...register("affiliateNumber", { required: false })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Titular Factura:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.invoiceHolder}</label>
                                  :
                                  <select
                                    onKeyDown={utils.handleKeyPress}
                                    defaultValue={selectedStudent?.invoiceHolder || ''}
                                    {...register("invoiceHolder", { required: true })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64">
                                    <option value="" disabled>Select</option>
                                    <option {...selectedStudent?.invoiceHolder === "Obra Social" ? 'selected' : null} value="Obra Social">Obra Social</option>
                                    <option {...selectedStudent?.invoiceHolder === "Estudiante" ? 'selected' : null} value="Estudiante">Estudiante</option>
                                    <option {...selectedStudent?.invoiceHolder === "Padre/Madre/Tutor 1" ? 'selected' : null} value="Padre/Madre/Tutor 1">Padre/Madre/Tutor 1</option>
                                    <option {...selectedStudent?.invoiceHolder === "Padre/Madre/Tutor 2" ? 'selected' : null} value="Padre/Madre/Tutor 2">Padre/Madre/Tutor 2</option>
                                  </select>
                              }
                              {errors.invoiceHolder && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}

                        {/* Datos del primer padre/madre/tutor */}
                        <tr className="bg-gray-200">
                          <td colSpan="2">
                            <h2 className="text-xl font-bold py-2 pl-2 text-left">Datos del primer padre/madre/tutor</h2>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2">
                            {/* Campos para el primer padre */}
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Nombre:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.parents[0]?.name || ''}</label>
                                  : <input
                                    onKeyDown={utils.handleKeyPress}
                                    type="text"
                                    defaultValue={selectedStudent?.parents[0]?.name || ''}
                                    {...register("firstParentName", { required: true })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
                              {errors.firstParentName?.type === 'required' && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Apellido:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.parents[0]?.lastName || ''}</label>
                                  : <input
                                    onKeyDown={utils.handleKeyPress}
                                    type="text"
                                    defaultValue={selectedStudent?.parents[0]?.lastName || ''}
                                    {...register("firstParentLastName", { required: true })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
                              {errors.firstParentLastName?.type === 'required' && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Tipo Documento:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.parents[0]?.documentType || ''}</label>
                                  :
                                  <select
                                    onKeyDown={utils.handleKeyPress}
                                    defaultValue={selectedStudent?.parents[0]?.documentType || ''}
                                    {...register("firstParentDocumentType", { required: false })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64">
                                    <option {...selectedStudent?.parents[0]?.documentType === "DNI" ? 'selected' : null} value="DNI">DNI</option>
                                    <option {...selectedStudent?.parents[0]?.documentType === "CUIT" ? 'selected' : null} value="CUIT">CUIT</option>
                                    <option {...selectedStudent?.parents[0]?.documentType === "CUIL" ? 'selected' : null} value="CUIL">CUIL</option>
                                  </select>
                              }
                              {errors.firstParentDocumentType && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">DNI:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.parents[0]?.documentNumber || ''}</label>
                                  :
                                  <input
                                    onKeyDown={utils.handleKeyPress}
                                    type="text"
                                    id="firstParentDocumentNumber"
                                    name="firstParentDocumentNumber"
                                    defaultValue={selectedStudent?.parents[0]?.documentNumber || ''}
                                    {...register("firstParentDocumentNumber", { required: true })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
                              {errors.firstParentDocumentNumber?.type === 'required' && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Teléfono:</label>
                              {
                                viewOnly ?
                                  <>
                                    {
                                      !!size(selectedStudent?.parents[0]?.phone) &&
                                      <>
                                        <a target="_blank" href={`https://api.whatsapp.com/send?phone=${removeSpacefromString(selectedStudent?.parents[0]?.phone)}`}>{removeSpacefromString(selectedStudent?.parents[0]?.phone)}</a>
                                        <WhatsappIcon />
                                      </>
                                    }
                                  </>
                                  : <input
                                    onKeyDown={utils.handleKeyPress}
                                    type="text"
                                    placeholder="+5491151234567 Sin espacios"
                                    defaultValue={selectedStudent?.parents[0]?.phone || ''}
                                    {...register("firstParentPhone", { required: true })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
                              {errors.firstParentPhone?.type === 'required' && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Email:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">
                                    {
                                      selectedStudent?.parents[0]?.email ?
                                        <a className="text-blue-500" href={`mailto:${selectedStudent?.parents[0]?.email || ''}`}>{selectedStudent?.parents[0]?.email || ''}</a>
                                        :
                                        selectedStudent?.parents[0]?.email || ''
                                    }
                                  </label>
                                  : <input
                                    type="text"
                                    defaultValue={selectedStudent?.parents[0]?.email || ''}
                                    {...register("firstParentEmail", { required: true })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
                              {errors.firstParentEmail?.type === 'required' && <span className='px-2 text-red-500'>* Obligatorio</span>}
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
                                <label className="text-slate-500 w-64">{selectedStudent?.parents[0]?.address}</label>
                                :
                                <input onKeyDown={utils.handleKeyPress} type="text" defaultValue={selectedStudent?.parents[0]?.address || ''} {...register("firstParentAddress", { required: false })} className="rounded border border-slate-200  p-4 pl-8 text-slate-500  w-64" />
                              }
                              {errors.firstParentAddress?.type && <span className='px-2 text-red-500'>* Obligatorio</span>}
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
                                <label className="text-slate-500 w-64">{selectedStudent?.parents[0]?.city}</label>
                                :
                                <input onKeyDown={utils.handleKeyPress} type="text" defaultValue={selectedStudent?.parents[0]?.city || ''} {...register("firstParentCity", { required: false })} className="rounded border border-slate-200  p-4 pl-8 text-slate-500  w-64" />
                              }
                              {errors.firstParentCity?.type && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}

                        {/* Datos del segundo padre/madre/tutor */}
                        <tr className="bg-gray-200">
                          <td colSpan="2">
                            <h2 className="text-xl font-bold py-2 pl-2 text-left">Datos del segundo padre/madre/tutor</h2>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2">
                            {/* Campos para el segundo padre */}
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Nombre:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.parents[1]?.name || ''}</label>
                                  : <input
                                    onKeyDown={utils.handleKeyPress}
                                    type="text"
                                    defaultValue={selectedStudent?.parents[1]?.name || ''}
                                    {...register("secondParentName", { required: false })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Apellido:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.parents[1]?.lastName || ''}</label>
                                  : <input
                                    onKeyDown={utils.handleKeyPress}
                                    type="text"
                                    defaultValue={selectedStudent?.parents[1]?.lastName || ''}
                                    {...register("secondParentLastName", { required: false })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Tipo Documento:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.parents[1]?.documentType || ''}</label>
                                  :
                                  <select
                                    onKeyDown={utils.handleKeyPress}
                                    defaultValue={selectedStudent?.parents[0]?.documentType || ''}
                                    {...register("secondParentDocumentType", { required: false })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64">
                                    <option {...selectedStudent?.parents[1]?.documentType === "DNI" ? 'selected' : null} value="DNI">DNI</option>
                                    <option {...selectedStudent?.parents[1]?.documentType === "CUIT" ? 'selected' : null} value="CUIT">CUIT</option>
                                    <option {...selectedStudent?.parents[1]?.documentType === "CUIL" ? 'selected' : null} value="CUIL">CUIL</option>
                                  </select>
                              }
                              {errors.secondParentDocumentType && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        {/* ================ */}
                        {/* ================ */}
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">DNI:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.parents[1]?.documentNumber || ''}</label>
                                  :
                                  <input
                                    onKeyDown={utils.handleKeyPress}
                                    type="text"
                                    id="secondParentDocumentNumber"
                                    name="secondParentDocumentNumber"
                                    defaultValue={selectedStudent?.parents[1]?.documentNumber || ''}
                                    {...register("secondParentDocumentNumber", { required: false })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
                              {errors.secondParentDocumentNumber?.type === 'required' && <span className='px-2 text-red-500'>* Obligatorio</span>}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Teléfono:</label>
                              {
                                viewOnly ?
                                  <>
                                    {
                                      !!size(selectedStudent?.parents[1]?.phone) &&
                                      <>
                                        <a target="_blank" href={`https://api.whatsapp.com/send?phone=${removeSpacefromString(selectedStudent?.parents[1]?.phone)}`}>{removeSpacefromString(selectedStudent?.parents[1]?.phone)} ass</a>
                                        <WhatsappIcon />
                                      </>
                                    }
                                  </>
                                  : <input
                                    type="text"
                                    onKeyDown={utils.handleKeyPress}
                                    placeholder="+5491151234567 Sin espacios"
                                    defaultValue={selectedStudent?.parents[1]?.phone || ''}
                                    {...register("secondParentPhone", { required: false })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2">
                            <div className="p-4 gap-4 flex items-center">
                              <label className="text-slate-500 w-20 font-bold">Email:</label>
                              {
                                viewOnly ?
                                  <label className="text-slate-500 w-64">{selectedStudent?.parents[1]?.email || ''}</label>
                                  : <input
                                    onKeyDown={utils.handleKeyPress}
                                    type="text"
                                    defaultValue={selectedStudent?.parents[1]?.email || ''}
                                    {...register("secondParentEmail", { required: false })}
                                    className="rounded border border-slate-200  p-4 text-slate-500 w-64"
                                  />
                              }
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
                                <label className="text-slate-500 w-64">{selectedStudent?.parents[1]?.address}</label>
                                :
                                <input onKeyDown={utils.handleKeyPress} type="text" defaultValue={selectedStudent?.parents[1]?.address || ''} {...register("secondParentAddress", { required: false })} className="rounded border border-slate-200  p-4 pl-8 text-slate-500 w-64 " />
                              }
                              {errors.secondParentAddress?.type === 'required' && <span className='px-2 text-red-500'>* Obligatorio</span>}
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
                                <label className="text-slate-500 w-64">{selectedStudent?.parents[1]?.city}</label>
                                :
                                <input onKeyDown={utils.handleKeyPress} type="text" defaultValue={selectedStudent?.parents[1]?.city || ''} {...register("secondParentCity", { required: false })} className="rounded border border-slate-200  p-4 pl-8 text-slate-500 w-64 " />
                              }
                              {errors.secondParentCity?.type === 'required' && <span className='px-2 text-red-500'>* Obligatorio</span>}
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
                                  <label className="text-slate-500 w-full">{selectedStudent?.observations || ''}</label>
                                  : <textarea defaultValue={selectedStudent?.observations || ''} name="observations" {...register("observations")} className="rounded border border-slate-200  p-4 text-slate-500 w-64" />
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
                                    <Button ref={refSubmitButton} type="submit" disabled={isLoadingSubmit}>{isLoadingSubmit ? 'Guardando...' : 'Guardar'}</Button>
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

            <Dialog
              open={isModalOpen}
            >
              <DialogContent>
                <div>
                  <div className="flex justify-end items-center text-gray-500">
                    <button onClick={onCloseModal}>
                      <CloseIcon />
                    </button>
                  </div>
                  <div className="w-[500px] h-[400px] my-4 overflow-scroll always-visible">
                    <div className="flex justify-center items-center w-full">
                      <img src={replace(pictureLink, 'pdf', 'jpg')} className="border border-gray-200" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-center items-center">
                    <Button onClick={onCloseModal}>Close</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )
      }
    </div>
  );
}
