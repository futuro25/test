import React, {useState} from "react";
import { useForm } from "react-hook-form";
import useSWR from 'swr'
import {reverse} from 'lodash'
import * as utils from '../utils/utils'
import {useSWRConfig} from 'swr'
import Spinner from "./common/Spinner";

export default function Courses() {

  const API_URL = '/api/logs';
  const { data, error, isLoading, isValidating } = useSWR(API_URL, (url) => fetch(url).then(res => res.json()))

  if (error) console.log(error)

  
  return (
    <div className="px-4 h-full overflow-auto">
      <div className="w-full flex-wrap flex sticky top-0 z-10 bg-white rounded pb-4">
        <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight ">Actividad</h1>
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
        data && (
          <div className="mt-4 -mb-3">
            <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))]" style={{"backgroundPosition": "10px 10px"}}></div>
              <div className="relative rounded-xl overflow-auto">
                <div className="shadow-sm overflow-auto my-8">
                  <table className="border-collapse table-auto w-full text-sm">
                    <thead>
                      <tr>
                        <th className="border-b  font-medium p-4 pt-0 pb-3 text-slate-400 text-left">Fecha</th>
                        <th className="border-b  font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 text-left">Accion</th>
                        <th className="border-b  font-medium p-4 pt-0 pb-3 text-slate-400 text-left">Data</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {
                        data.length ? 
                          reverse(data).map((log, index) => (
                            <tr key={log._id} className={utils.cn('border-b last:border-b-0 hover:bg-gray-100', (index % 2 === 0) && 'bg-gray-50')}>
                              <td className="text-left border-b border-slate-100  p-4 text-slate-500 ">{log.createdAt}</td>
                              <td className="text-left border-b border-slate-100  p-4 pl-8 text-slate-500 ">{log.action}</td>
                              <td className="text-left border-b border-slate-100  p-4 text-slate-500 ">{log.data}</td>
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
              <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl"></div>
            </div>
          </div>
        )
      }
    </div>
  );
}
