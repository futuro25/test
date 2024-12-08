import React, {useState} from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR from 'swr'
import {useSWRConfig} from 'swr'
import Button from "./common/Button";
import Spinner from "./common/Spinner";
import {EditIcon} from "./icons";
import * as utils from '../utils/utils'
import Datepicker from "tailwind-datepicker-react"
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";
import { union, uniqBy } from "lodash";
var moment = require('moment');
var billingStates = require('../utils/billingStates.js');

const options = utils.getDatePickerOptions(ArrowLeftIcon, ArrowRightIcon)

export default function Billings() {

  const [stage, setStage] = useState('LIST');
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [show, setShow] = useState(false)
  const [selectedBilling, setSelectedBilling] = useState(null);
  const { register, handleSubmit, trigger, control, reset, formState: { errors } } = useForm();
  const API_URL = '/api/billings';
  const API_URL_NOTIFICATIONS_NOW = '/api/notifications/add/0';
  const API_URL_NOTIFICATIONS_WEEK = '/api/notifications/add/7';
  const API_URL_NOTIFICATIONS_2WEEK = '/api/notifications/add/15';
  const { mutate } = useSWRConfig()
  const { data: dataNow, error: errorNow, isLoading: isLoadingNow, isValidating: isValidatingNow } = useSWR(API_URL_NOTIFICATIONS_NOW, (url) => fetch(url).then(res => res.json()))
  const { data: dataWeek, error: errorWeek, isLoading: isLoadingWeek, isValidating: isValidatingWeek } = useSWR(API_URL_NOTIFICATIONS_WEEK, (url) => fetch(url).then(res => res.json()))
  const { data: data2Week, error: error2Week, isLoading: isLoading2Week, isValidating: isValidating2Week } = useSWR(API_URL_NOTIFICATIONS_2WEEK, (url) => fetch(url).then(res => res.json()))
  const [reminderOption, setReminderOption] = useState('');

  const isLoading = isLoadingNow & isLoadingWeek & isLoading2Week;
  const error = errorNow & errorWeek & error2Week;
  const data = uniqBy(union(dataNow, dataWeek, data2Week), "_id");

  const onEdit = (billingId) => {
    const billing = data.find(bill => bill._id === billingId) || null;
    if (billing.details === "") {
      billing.details = [];
    }
    setSelectedBilling(billing);
    setStage('EDIT')
  }
  const handleClose = (state) => {
		setShow(state)
	}

  const onSubmit = async (formData) => {
    try {
      setIsLoadingSubmit(true);

      const body = {
        details: [...selectedBilling.details, moment().format('DD/MM/YYYY') + ' ' + formData.details],
        rememberDate: formData.rememberDate,
        ...(reminderOption === 'payDateUpdate' && {
          payDate: formData.rememberDate,
          status: billingStates.PAY_ORDER_UPDATED,
        }),
      };

      await mutate(API_URL, utils.patchRequest(`${API_URL}/${selectedBilling._id}`, body), {optimisticData: true})

      setSelectedBilling(null);
      setReminderOption('');
      reset()
      setIsLoadingSubmit(false)
      setStage('LIST')
    } catch (e) {
      console.log(e);
    }
  }

  const onCancel = () => {
    setSelectedBilling(null);
    setReminderOption('');
    setIsLoadingSubmit(false)
    reset()
    setStage('LIST')
  }

  const handleReminderOptionChange = (value) => {
    setReminderOption(value);
  };

  const getInvoicePeriodsWithoutDuplicates = (invoice) => {
    return [...new Set(invoice.periods?.map(period => period.name))]
      .map(name => name.toUpperCase())
      .join(', ');
  }

  return (
    <div className="h-full overflow-auto">
      <div className="w-full flex flex-col sticky top-0 z-10 bg-white pl-4 pb-4 shadow">
        <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Seguimiento</h1>
      </div>

      {
        (!dataNow) && (
          <div>
            <Spinner />
          </div>
        )
      }
      {
        !!error && (
          <div className="text-red-500">
            {/* ERROR... */}
          </div>
        )
      }

      {
        stage === 'TEST' && (
          <div className='border border-slate-200 rounded p-1'>
            <table>
              <thead>
                <tr className="text-slate-400">
                  <th scope="col" className="capitalize font-bold px-6 py-4">Fecha</th>
                  <th scope="col" className="capitalize font-bold px-6 py-4">Nro de Factura</th>
                  <th scope="col" className="capitalize font-bold px-6 py-4">Periodo</th>
                  <th scope="col" className="capitalize font-bold px-6 py-4">Concepto</th>
                  <th scope="col" className="capitalize font-bold px-6 py-4">Estudiante</th>
                  <th scope="col" className="capitalize font-bold px-6 py-4">Importe</th>
                  <th scope="col" className="capitalize font-bold px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {
                  data.length ?
                    data.map((billing) => (
                      <tr>
                        <td data-label="Fecha" className="whitespace-nowrap px-6 py-4 font-medium">{moment(billing.rememberDate).format('DD-MM-YYYY')}</td>
                        <td data-label="Nro de Factura" className="whitespace-nowrap px-6 py-4 font-medium">{billing.invoiceNumber}</td>
                        <td data-label="Periodo" className="whitespace-nowrap px-6 py-4 font-medium">{getInvoicePeriodsWithoutDuplicates(billing)}</td>
                        <td data-label="Concepto" className="whitespace-nowrap px-6 py-4 font-medium">{billing.concept}</td>
                        <td data-label="Estudiante" className="whitespace-nowrap px-6 py-4 font-medium">{billing.student}</td>
                        <td data-label="Importe" className="whitespace-nowrap px-6 py-4 font-medium">${billing.invoiceAmount}</td>
                        <td data-label="" className="whitespace-nowrap px-6 py-4 font-medium flex gap-4 items-center justify-center">
                            <button className="flex items-center justify-center w-8 h-8" title="Editar" onClick={() => onEdit(billing._id)}><EditIcon/></button>
                        </td>
                      </tr>
                    )
                  ) : (
                    <tr className="border-b last:border-b-0 ">
                      <td colSpan={7} className="whitespace-nowrap px-6 py-4 font-medium">Sin registros</td>
                    </tr>
                  )
                }
                </tbody>
            </table>
          </div>
          )
      }
      {
        stage === 'LIST' && data && !isLoading && (

          <div className="flex flex-col overflow-x-auto mb-20 px-4">
            <div className="sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8">
                <div className="overflow-x-auto rounded-xl border">
                  <table className="min-w-full text-left text-sm font-light rounded-xl">
                    <thead className="border-b font-medium  bg-slate-50 rounded-xl">
                      <tr className="text-slate-400">
                        <th scope="col" className="px-6 py-4">Fecha de recordatorio</th>
                        <th scope="col" className="px-6 py-4">Nro de Factura</th>
                        <th scope="col" className="px-6 py-4">Periodo</th>
                        <th scope="col" className="px-6 py-4">Concepto</th>
                        <th scope="col" className="px-6 py-4">Estudiante</th>
                        <th scope="col" className="px-6 py-4">Importe</th>
                        <th scope="col" className="px-6 py-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        data.length ?
                          data.map((billing, index) => (
                            <tr key={billing._id} className={utils.cn('border-b last:border-b-0 hover:bg-gray-100', (index % 2 === 0) && 'bg-gray-50', billing.status === 'PAY_ORDER_UPDATED' && '#ffdddd')}>
                              <td className="whitespace-nowrap px-6 py-4 font-medium">{moment(billing.rememberDate).format('DD-MM-YYYY')}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-medium">{billing.invoiceNumber}</td>
                              <td className="whitespace-nowrap px-6 py-4">{getInvoicePeriodsWithoutDuplicates(billing)}</td>
                              <td className="whitespace-nowrap px-6 py-4 max-w-[200px] text-ellipsis overflow-hidden">{billing.concept}</td>
                              <td className="whitespace-nowrap px-6 py-4">{billing.student}</td>
                              <td className="whitespace-nowrap px-6 py-4">${billing.invoiceAmount}</td>
                              <td className="whitespace-nowrap px-6 py-4">
                                <div className="flex gap-4">
                                  <button className="flex items-center justify-center w-8 h-8" title="Editar" onClick={() => onEdit(billing._id)}><EditIcon/></button>
                                </div>
                              </td>
                            </tr>
                          )) : (
                            <tr className="border-b last:border-b-0 ">
                              <td colSpan={6} className="whitespace-nowrap px-6 py-4 font-medium">Sin registros</td>
                            </tr>
                          )
                        }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        stage === 'EDIT' && !isLoading && (
          <div className="my-4 px-4">
            <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden ">
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] " style={{"backgroundPosition": "10px 10px"}}></div>
              <div className="relative rounded-xl overflow-auto">
                <div className="shadow-sm overflow-hidden my-8">
                  {selectedBilling && (
                    <div className="p-4 w-full bg-white">
                      <div className="flex gap-4 mb-4">
                        <label className="text-slate-500 font-bold w-36">Fecha de Factura</label>
                        <label className="text-slate-500 w-36">{moment(selectedBilling.invoiceDate).format('DD/MM/YYYY')}</label>
                      </div>
                      <div className="flex gap-4 mb-4">
                        <label className="text-slate-500 font-bold w-36">Importe</label>
                        <label className="text-slate-500 w-36">{utils.formatPriceSimbol(selectedBilling.invoiceAmount)}</label>
                      </div>

                      <div className="flex gap-4 mb-4">
                        <label className="text-slate-500 w-36 font-bold">Historico</label>
                        {
                          !!selectedBilling?.details.length ? (

                          
                        <ul className="list-disc pl-4">
                          {selectedBilling?.details?.map(detail => {
                            return (
                              <li className="pl-2 text-slate-500">{detail}</li>
                            ) 
                          })}
                        </ul>
                        ) : (
                          <label className="text-slate-500 w-36">Sin registros</label>
                        )
                      }
                      </div>

                      <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col'>
                        <table className="border-collapse table-fixed w-full bg-white">
                          <tbody>
                            <tr>
                              <td>
                                <div className="p-4 pl-0 gap-4 flex items-center">
                                  <label className="text-slate-500 font-bold w-36">Observaciones:</label>
                                  {
                                    <textarea {...register("details", { required: true })} className="rounded border border-slate-200  p-4 text-slate-500 " />
                                  }
                                  {errors.details && <span className='px-2 text-red-500'>* Obligatorio</span>}
                                </div>
                              </td>
                            </tr>
                            {/* ================ */}
                            <tr>
                              <td>
                                <div className="p-4 pl-0 gap-4 flex items-center">
                                  <label className="text-slate-500 font-bold w-36">Fecha de recordatorio:</label>
                                  {
                                    <Controller
                                      control={control}
                                      rules={{required: selectedBilling?.rememberDate ? false : true}}
                                      value={selectedBilling?.rememberDate}
                                      onChange={(data) => {console.log(data)}}
                                      name="rememberDate"
                                      render={({ field: { onChange} }) => {
                                        // options.defaultDate = selectedBilling?.rememberDate ? new Date(selectedBilling?.rememberDate) : "";
                                        options.defaultDate = null;
                                        return (
                                          <div className="w-48">
                                            <Datepicker options={options} onChange={onChange} show={show} setShow={handleClose} />
                                          </div>
                                      )}}
                                    />
                                  }
                                  {errors.rememberDate && <span className='px-2 text-red-500'>* Obligatorio</span>}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <div className="p-4 pl-0 flex flex-col items-start">
                                  <label className="text-slate-500 font-bold mb-2">Opciones de recordatorio:</label>

                                  <div className="flex flex-col items-start ml-4">
                                    <Controller
                                      control={control}
                                      name="reminderOption"
                                      rules={{ required: true }}
                                      render={({ field }) => (
                                        <div className="flex items-center mt-2">
                                          <input
                                            type="radio"
                                            id="payDateUpdate"
                                            value="payDateUpdate"
                                            {...field}
                                            checked={reminderOption === 'payDateUpdate'}
                                            onChange={() => {
                                              field.onChange('payDateUpdate');
                                              handleReminderOptionChange('payDateUpdate');
                                            }}
                                          />
                                          <label htmlFor="payDateUpdate" className="text-slate-500 ml-2">Actualizar fecha de pago y recordatorio</label>
                                        </div>
                                      )}
                                    />

                                    <Controller
                                      control={control}
                                      name="reminderOption"
                                      rules={{ required: true }}
                                      render={({ field }) => (
                                        <div className="flex items-center mt-2">
                                          <input
                                            type="radio"
                                            id="rememberDateUpdate"
                                            value="rememberDateUpdate"
                                            {...field}
                                            checked={reminderOption === 'rememberDateUpdate'}
                                            onChange={() => {
                                              field.onChange('rememberDateUpdate');
                                              handleReminderOptionChange('rememberDateUpdate');
                                            }}
                                          />
                                          <label htmlFor="rememberDateUpdate" className="text-slate-500 ml-2">Actualizar sólo fecha de recordatorio</label>
                                        </div>
                                      )}
                                    />

                                    {errors.reminderOption && <span className='px-2 text-red-500'>* Obligatorio</span>}
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {/* ================ */}
                            <tr>
                              <td>
                                <div className="p-4 gap-4 flex items-center">
                                  {
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
                  )}
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
