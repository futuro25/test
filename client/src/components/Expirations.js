import { replace } from "lodash";
import React, {useState} from "react";
import { useForm } from "react-hook-form";
import useSWR from 'swr'
import {useSWRConfig} from 'swr'
import Button from "./common/Button";
import Spinner from "./common/Spinner";
import { Dialog, DialogContent } from "./common/Dialog";
import {EyeIcon, CloseIcon} from "./icons";
import * as utils from '../utils/utils'
var moment = require('moment');

export default function Insurances() {

  const API_URL = '/api/students/expirations';
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { data, error, isLoading, isValidating } = useSWR(API_URL, (url) => fetch(url).then(res => res.json()))
  const { mutate } = useSWRConfig()

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

  const onView = (student) => {
    console.log(student)
    setSelectedStudent(student)
    setIsModalOpen(true)
  }

  return (
    <div className="h-full overflow-auto">
      <div className="w-full flex flex-col sticky top-0 z-10 bg-white shadow px-4 pb-4">
        <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight ">Vencimientos</h1>
        <p className="flex">Aqui se visualizan los vencimientos de los proximos 30 dias</p>
      </div>
      {
        (isLoading) && (
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
        data && (
          <div className="mt-4 -mb-3 px-4">
            <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden ">
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] " style={{"backgroundPosition": "10px 10px"}}></div>
              <div className="relative rounded-xl overflow-auto">
                <div className="shadow-sm overflow-auto my-8">
                  <table className="border-collapse table-auto w-full text-sm">
                    <thead>
                      <tr>
                        <th className="border-b  font-medium p-4 pt-0 pb-3 text-slate-400 text-left">Estudiante</th>
                        <th className="border-b  font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-left">Fecha vencimiento</th>
                        <th className="border-b  font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white ">
                      {
                        data.length ? 
                          data.map(student => (
                            <tr key={student._id}>
                              <td className="border-b border-slate-100 text-xs p-4 text-slate-500 ">{student.name + ' ' + student.lastName}</td>
                              <td className="border-b border-slate-100 text-xs p-4 pr-8 text-slate-500 ">{moment(student.cudDueDate).format("DD-MM-YYYY")}</td>
                              <td className="border-b border-slate-100 text-xs text-slate-500 w-10">
                                <div className="flex gap-2">
                                  <button className="flex items-center justify-center w-8 h-8" title="Ver detalle" onClick={() => onView(student)}><EyeIcon/></button>
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

      <Dialog
        open={isModalOpen}
      >
        <DialogContent>
          <div>
            <div className="flex justify-end items-center text-gray-500">
              <button onClick={() => setIsModalOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <div className="w-[500px] h-[400px] my-4 overflow-scroll always-visible">
              <div className="flex justify-center items-center w-full">
                <img src={replace(selectedStudent?.cudUrl, 'pdf', 'jpg')} className="border border-gray-200" />
              </div>
            </div>
            <div className="flex gap-2 justify-center items-center">
              <Button onClick={() => setIsModalOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
