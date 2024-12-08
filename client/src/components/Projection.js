import { useNavigate } from "react-router-dom";
import React, {useState} from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR from 'swr'
import {useSWRConfig} from 'swr'
import Button from "./common/Button";
import { Dialog, DialogContent } from "./common/Dialog";
import { Pagination } from "./common/Pagination";
import Spinner from "./common/Spinner";
import {TrashIcon, ChecktIcon, EyeIcon, ReceiptIcon, CloseIcon} from "./icons";
import { Input } from "./common/Input";
import * as utils from '../utils/utils'
import Datepicker from "tailwind-datepicker-react"
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";
import { split, slice, range } from "lodash";
import {config} from '../config';
var moment = require('moment');

export default function Projection() {

  const API_URL_NOTIFICATIONS_NOW = '/api/notifications/add/0';
  const API_URL_NOTIFICATIONS_WEEK = '/api/notifications/add/7';
  const API_URL_NOTIFICATIONS_2WEEK = '/api/notifications/add/15';

  const { data: dataNow, error: errorNow, isLoading: isLoadingNow, isValidating: isValidatingNow } = useSWR(API_URL_NOTIFICATIONS_NOW, (url) => fetch(url).then(res => res.json()))
  const { data: dataWeek, error: errorWeek, isLoading: isLoadingWeek, isValidating: isValidatingWeek } = useSWR(API_URL_NOTIFICATIONS_WEEK, (url) => fetch(url).then(res => res.json()))
  const { data: data2Week, error: error2Week, isLoading: isLoading2Week, isValidating: isValidating2Week } = useSWR(API_URL_NOTIFICATIONS_2WEEK, (url) => fetch(url).then(res => res.json()))
  let totalNow = 0;
  let totalWeek = 0;
  let total2Week = 0;

  const isLoading = isLoadingNow & isLoadingWeek & isLoading2Week;
  const error = errorNow & errorWeek & error2Week;
  const data = dataNow && dataWeek && data2Week;

  if (dataNow) {
    for (const data of dataNow) {
      totalNow += +data.invoiceAmount;
    }
  }
  if (dataWeek) {
    for (const data of dataWeek) {
      totalWeek += +data.invoiceAmount;
    }
  }
  if (data2Week) {
    for (const data of data2Week) {
      total2Week += +data.invoiceAmount;
    }

  }

  return (
    <div className="px-4 h-full overflow-auto">
      <div className="w-full flex-wrap flex sticky top-0 z-10 bg-white rounded pb-4">
        <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight ">Proyeccion</h1>
      </div>

      {
        !!(isLoading) && (
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
        data && !isLoading && (
          <div className="flex flex-col justify-start">
            <div className="grid gap-4 place-content-center grid-cols-[repeat(auto-fill,300px)] auto-rows-[124px]">
              <div className="p-4 rounded-lg shadow-lg bg-emerald-500">
                <p className="text-2xl font-bold text-white">Hoy</p>
                <p className="text-2xl font-bold text-white">{utils.formatPriceSimbol(totalNow)}</p>
              </div>
              <div className="p-4 rounded-lg shadow-lg bg-amber-500">
                <p className="text-2xl font-bold text-white">7 dias</p>
                <p className="text-2xl font-bold text-white">{utils.formatPriceSimbol(totalWeek)}</p>
              </div>
              <div className="p-4 rounded-lg shadow-lg bg-red-500">
                <p className="text-2xl font-bold text-white">15 dias</p>
                <p className="text-2xl font-bold text-white">{utils.formatPriceSimbol(total2Week)}</p>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}
