import React, { useState, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import useSWR from 'swr'
import { Input } from "./common/Input";
import { useSWRConfig } from 'swr'
import { upperCase } from 'lodash'
import Button from "./common/Button";
import Spinner from "./common/Spinner";
import { EditIcon, TrashIcon, EyeIcon, CloseIcon } from "./icons";
import * as utils from '../utils/utils'

export default function Courses() {

  const API_URL = '/api/courses';
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('LIST');
  const [viewOnly, setViewOnly] = useState(false);
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { data, error, isLoading, isValidating } = useSWR(API_URL, (url) => fetch(url).then(res => res.json()))
  const currentYear = new Date().getFullYear()
  const currentYearString = currentYear.toString()
  const currentMonth = (new Date().getMonth() + 1).toString()
  const defaultPeriod = { month: "", year: currentYearString, price: "" }
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  const [otherPeriodsList, setOtherPeriodsList] = useState([]);
  const [periodError, setPeriodError] = useState(false);

  const dataSearch = data ? data?.length > 0 && data?.filter((d) => search ? d.name.toLowerCase().includes(search.toLowerCase()) : d) : [];

  const { mutate } = useSWRConfig()

  if (error) console.log(error)

  const removeCourse = async (courseId) => {
    if (window.confirm("Seguro desea eliminar este tipo de escolaridad?")) {
      try {
        await mutate(API_URL, utils.deleteRequest(`${API_URL}/${courseId}`), { optimisticData: true })
      } catch (e) {
        console.log(e);
      }
    }
  }

  const calculatePeriodList = () => {
    if (otherPeriodsList.length > 0) {
      return otherPeriodsList;
    }

    return [
      ...Array.from({ length: 12 }, (_, i) => ({
        month: (i + 1).toString(),
        year: currentYearString,
        price: "",
      })),
      {
        month: "Matrícula",
        year: currentYearString,
        price: "",
      },
    ];
  }

  const isDuplicatePeriod = (selectedPeriod, newPeriod) => {
    return selectedPeriod?.month === newPeriod.month && selectedPeriod?.year === newPeriod.year;
  };

  const onSubmit = async (data) => {
    try {
      setIsLoadingSubmit(true)

      if (invalidPeriod()) {
        setIsLoadingSubmit(false);
        return;
      }

      console.log('llege aca')

      const updatedData = {
        ...data,
        periods: [
          selectedPeriod,
          ...calculatePeriodList().filter((newPeriod) => !isDuplicatePeriod(selectedPeriod, newPeriod))
        ]
      };

      console.log('updatedData:', updatedData);

      if (selectedCourse) {
        await mutate(API_URL, utils.patchRequest(`${API_URL}/${selectedCourse._id}`, updatedData), { optimisticData: true })
      } else {
        await mutate(API_URL, utils.postRequest(API_URL, updatedData), { optimisticData: true })
      }
      setIsLoadingSubmit(false)
      setSelectedCourse(null)
      setSelectedPeriod(defaultPeriod)
      setOtherPeriodsList([])
      setStage('LIST')
    } catch (e) {
      console.log(e);
    }
  }

  const onEdit = (courseId) => {
    reset();
    const course = data.find((course) => course._id === courseId) || null;
    const currentPeriod = getCourseCurrentPeriod(course);

    setSelectedCourse(course);
    setSelectedPeriod(currentPeriod);

    const periodsWithoutSelected = course?.periods;

    // const periodsWithoutSelected = course?.periods.filter(
    //   (period) =>
    //     period.month !== currentPeriod?.month || period.year !== currentPeriod?.year
    // );

    setOtherPeriodsList(periodsWithoutSelected);
    setStage('CREATE');
  };

  const onView = (courseId) => {
    const course = data.find(course => course._id === courseId) || null;
    setSelectedCourse(course);

    const currentPeriod = getCourseCurrentPeriod(course);
    const periodsWithoutSelected = course?.periods.filter(
      (period) =>
        period.month !== currentPeriod?.month || period.year !== currentPeriod?.year
    );
    console.log('currentPeriod:', currentPeriod);
    setSelectedPeriod(currentPeriod);
    setOtherPeriodsList(periodsWithoutSelected);
    setViewOnly(true)
    setStage('CREATE')
  }

  const onCreate = () => {
    reset()
    setSelectedCourse(null);
    setStage('CREATE')
  }

  const onCancel = () => {
    reset()
    setSelectedCourse(null);
    setIsLoadingSubmit(false)
    setSelectedPeriod(defaultPeriod)
    setOtherPeriodsList([])
    setPeriodError(false)
    setViewOnly(false)
    setStage('LIST')
  }

  const handleOnChange = (index, name, value, isPeriodList) => {
    if (isPeriodList) {
      setOtherPeriodsList((prevPeriodList) => updatePeriods(prevPeriodList));
    } else {
      setSelectedPeriod((prevPeriod) => ({ ...prevPeriod, [name]: value }));
    }

    function updatePeriods(prevPeriodList) {
      return prevPeriodList.map((period, i) => {
        if (i >= index) {
          return { ...period, [name]: value };
        }
        return period;
      });
    }
  };

  const invalidPeriod = () => {
    const hasPrice = selectedPeriod?.price ?? false;
    setPeriodError(!hasPrice);
    return !hasPrice;
  };

  const getCourseCurrentPeriod = (course) => {
    const coursePeriods = course?.periods || [];
    return coursePeriods.find(period => period.year === currentYearString && period.month === currentMonth) || defaultPeriod;
  }

  const getMonthName = (month) => {
    const monthName = 'Matrícula' === month ? month : utils.getMonthName(month);
    return monthName;
  }

  return (
    <div className="px-4 h-full overflow-auto">
      <div className="w-full flex-wrap flex sticky top-0 z-10 bg-white rounded pb-4">
        <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight ">Cursos</h1>

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
        (isLoading || isValidating) && (
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
          <div className="w-full flex bg-white rounded pb-4">
            <Input onKeyDown={utils.handleKeyPress} rightElement={<div className="cursor-pointer" onClick={() => setSearch('')}>{search && <CloseIcon />}</div>} type="text" value={search} name="search" id="search" placeholder="Buscador..." onChange={(e) => setSearch(e.target.value)} />
          </div>
        )
      }
      {
        stage === 'LIST' && data && !isValidating && (
          <div className="mt-4 mb-28">
            <p className="pl-1 pb-1 text-slate-500">Total de cursos {data.length}</p>
            <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden ">
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] " style={{ "backgroundPosition": "10px 10px" }}></div>
              <div className="relative rounded-xl overflow-auto">
                <div className="shadow-sm overflow-hidden my-8">
                  <table className="border-collapse table-auto w-full text-sm">
                    <thead>
                      <tr>
                        <th className="border-b  font-medium p-4 pl-8 pt-0 w-4 pb-3 text-slate-400 text-left">#</th>
                        <th className="border-b  font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 text-left">Nombre</th>
                        <th className="border-b  font-medium p-4 pt-0 pb-3 text-slate-400 text-left">Cuota mes corriente</th>
                        <th className="border-b  font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white ">
                      {
                        dataSearch.length ?
                          dataSearch.map((course, index) => (
                            <tr key={course._id}>
                              <td className="text-left !text-xs border-b border-slate-100  p-4 pl-8 text-slate-500 ">{index+1}</td>
                              <td className="text-left !text-xs border-b border-slate-100  p-4 pl-8 text-slate-500 ">{upperCase(course.name)}</td>
                              <td className="text-left !text-xs border-b border-slate-100  p-4 text-slate-500 ">{getCourseCurrentPeriod(course)?.price || 0}</td>
                              <td className="text-left !text-xs border-b border-slate-100  text-slate-500 w-10">
                                <div className="flex gap-2">
                                  <button className="flex items-center justify-center w-8 h-8" title="Ver detalle" onClick={() => onView(course._id)}><EyeIcon /></button>
                                  <button className="flex items-center justify-center w-8 h-8" title="Editar" onClick={() => onEdit(course._id)}><EditIcon /></button>
                                  <button className="flex items-center justify-center w-8 h-8" title="Eliminar" onClick={() => removeCourse(course._id)}><TrashIcon /></button>
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
          <div className="mt-4 -mb-3">
            <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden ">
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] " style={{ "backgroundPosition": "10px 10px" }}></div>
              <div className="relative rounded-xl overflow-auto">
                <div className="shadow-sm overflow-hidden my-8">
                  <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col'>
                    <table className="border-collapse table-fixed w-full text-sm bg-white">
                      <tbody>
                        <div className="p-4 grid gap-4">
                          <div className="grid gap-4">
                            {/* ================ */}
                            <tr>
                              <td className="w-full" style={{width: '100%'}}>
                                <div className="gap-2 flex items-center w-full">
                                  <label className="text-slate-500 w-20 font-bold">Nombre:</label>
                                  {
                                    viewOnly ?
                                      <label className="text-slate-500">{selectedCourse?.name}</label>
                                      :
                                      <input onKeyDown={utils.handleKeyPress} type="text" defaultValue={selectedCourse?.name || ''} {...register("name", { required: true })} className="rounded border border-slate-200  p-4 text-slate-500 w-[500px]" />
                                  }
                                  {errors.name && <span className='px-2 text-red-500'>* Obligatorio</span>}
                                </div>
                              </td>
                            </tr>

                            {/* ================ */}
                            <tr>
                              <td className="w-full" style={{width: '100%'}}>
                                <div className="gap-2 flex items-center pl-1">
                                  <label className="text-slate-500 w-32 font-bold">Año:</label>
                                  {
                                    viewOnly ?
                                      <label className="text-slate-500">{selectedPeriod?.year}</label>
                                      :
                                      <select
                                        className="rounded border border-slate-200 p-4 text-slate-500 w-full"
                                        defaultValue={getCourseCurrentPeriod(selectedCourse)?.year || ''}
                                        {...register("year", { required: true })}
                                        disabled={viewOnly}
                                      >
                                        <option value="" disabled>Año</option>
                                        {[...Array(4).keys()].map((index) => (
                                          <option key={index} value={currentYear + index}>
                                            {currentYear + index}
                                          </option>
                                        ))}
                                      </select>
                                  }
                                  {errors.year && <span className='px-2 text-red-500'>* Obligatorio</span>}
                                </div>
                              </td>
                            </tr>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {/* <tr>
                              <td>
                                <div>
                                  {
                                    selectedCourse ? (
                                      <label className="text-slate-500 font-bold">Periodo actual</label>
                                    ) : (
                                      <label className="text-slate-500 font-bold">Periodo</label>
                                    )
                                  }
                                </div>
                              </td>
                            </tr> */}
                            <tr>
                              <td>
                                <div>
                                  {
                                    selectedCourse ? (
                                      <label className="text-slate-500 font-bold">Periodos</label>
                                    ) : (<></>)
                                  }
                                  {/* {
                                    selectedCourse ? (
                                      <label className="text-slate-500 font-bold">Otros periodos</label>
                                    ) : (<></>)
                                  } */}
                                </div>
                              </td>
                            </tr>
                            
                            <div>
                              {/* <tr>
                                <td>
                                  <div className="">
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 text-slate-400 border border-slate-200 rounded mb-2">
                                      <label className="text-slate-500 font-bold p-4">Mes</label>
                                      <label className="text-slate-500 font-bold p-4 text-center">Cuota</label>
                                    </div>
                                  </div>
                                </td>
                              </tr> */}

                              <tr>
                                <td>
                                  <div>
                                    <div>
                                      {viewOnly ? (
                                        <div className="grid grid-cols-2 gap-4" style={{ border: '2px solid #ccc' }}>
                                          <label className="text-slate-500 text-center p-4 w-20">{getMonthName(selectedPeriod?.month)}</label>
                                          <label className="text-slate-500 text-center p-4 w-20">{selectedPeriod?.price}</label>
                                        </div>
                                      ) : (
                                        <div>
                                          {
                                            // <PeriodRow
                                            //   key={`${selectedPeriod?.month}-${selectedPeriod?.year}`}
                                            //   period={selectedPeriod}
                                            //   onChange={(name, value) => handleOnChange(0, name, value, false)}
                                            //   error={periodError}
                                            // />
                                          }
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </div>


                            <div>
                              {otherPeriodsList.length > 0 && (
                                <>
                                  <tr>
                                    <td>
                                      <div>
                                        <div className="grid grid-cols-2 gap-4 bg-slate-50 text-slate-400 border border-slate-200 rounded mb-2">
                                          <label className="text-slate-500 font-bold p-4">Mes</label>
                                          <label className="text-slate-500 font-bold p-4 text-center">Cuota</label>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>

                                  <tr>
                                    <td>
                                      <div>
                                        <div>
                                          {viewOnly ? (
                                            otherPeriodsList.length > 0 ? (
                                              <div style={{ border: '2px solid #ccc' }}>
                                                <div className="grid grid-cols-2 gap-4">
                                                  {otherPeriodsList.map((period, index) => (
                                                    <React.Fragment key={`${period.month}-${period.year}`}>
                                                      <label className="text-slate-500 text-center p-4 w-20">{getMonthName(period.month)}</label>
                                                      <label className="text-slate-500 text-center p-4 w-20">{period.price}</label>
                                                    </React.Fragment>
                                                  ))}
                                                </div>
                                              </div>
                                            ) : (
                                              <p>No existen otros periodos cargados.</p>
                                            )
                                          ) : (
                                            <div>
                                              {otherPeriodsList.map((period, index) => (
                                                <PeriodRow
                                                  key={`${period.month}-${period.year}`}
                                                  period={period}
                                                  onChange={(name, value) => handleOnChange(index, name, value, true)}
                                                  error={index === 0 ? periodError : false}
                                                />
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>

                                </>
                              )}
                            </div>
                          </div>
                        </div>

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

  function PeriodRow({ period, onChange, error }) {
    const { month, price } = period;
    const [localPrice, setLocalPrice] = useState(price || '');

    return useMemo(() => (
      <div className="grid grid-cols-2 gap-2 pb-2">
        <label className="text-slate-500 border-slate-200 text-start flex items-center">
          {selectedCourse ? (
            <label className="w-40 text-xs pl-2">
              {upperCase(getMonthName(month))}
            </label>
          ) : (
            <select
              value={month}
              onChange={(e) => onChange("month", e.target.value)}
              className="rounded border border-slate-200  p-4 text-slate-500 w-40 text-center"
            >
              <option value="" disabled>Seleccionar</option>
              {utils.getMonths().map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
              <option value="tuition">Matrícula</option>
            </select>
          )}
        </label>
        <label className="text-slate-500 border-slate-200  text-center">
          <input
            type="text"
            onKeyDown={utils.handleKeyPress}
            value={localPrice}
            onBlur={() => {
              onChange("price", localPrice);
            }}
            onChange={(e) => setLocalPrice(e.target.value)}
            disabled={viewOnly}
            className="rounded border border-slate-200  p-4 text-slate-500 w-40 text-center"
            placeholder="Ingresar cuota"
          />
        </label>
        {error && <span className='px-2 text-red-500'>* Al menos un periodo debe tener Cuota</span>}
      </div>
    ), [localPrice, onChange]);
  }
}
