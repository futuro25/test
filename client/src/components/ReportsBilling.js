import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import React, { useState } from "react";
import useSWR from 'swr'
import { useSWRConfig } from 'swr'
import Spinner from "./common/Spinner";
import * as XLSX from 'xlsx';
import { EyeIcon, CloseIcon } from "./icons";
import { Input } from "./common/Input";
import * as utils from '../utils/utils'
import Button from "./common/Button";
import { upperCase } from "lodash";
import "react-datepicker/dist/react-datepicker.css";
import { config } from '../config';

var moment = require('moment');

import FiltersBar from './billing/FiltersBar';

const formatCurrency = (value) => {
  return value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ReportBilling() {

  const [searchParams, setSearchParams] = useSearchParams();
  
  const location = useLocation();
  const isPathCreditNote = (location.pathname.indexOf('credito') !== -1)
  const showCreditNotes = searchParams.get('nc') || isPathCreditNote || false;

  const API_URL = '/api/billings';
  const filters = '?not_status=CREDIT_NOTE_CREATED';
  const FETCH_BILLINGS_URL = API_URL + filters;
  const API_URL_STUDENTS = '/api/students?enabled=SI';
  const API_URL_COURSES = '/api/courses';
  const API_URL_INSURANCES = '/api/insurances';
  const [stage, setStage] = useState('LIST');
  const [showAlert, setShowAlert] = useState(true);

  const [search, setSearch] = useState('');
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [latestInvoice, setLatestInvoice] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  let { data, error, isLoading, isValidating } = useSWR(FETCH_BILLINGS_URL, (url) => fetch(url).then(res => res.json()))
  const { data: dataStudents } = useSWR(API_URL_STUDENTS, (url) => fetch(url).then(res => res.json()))
  const { data: dataCourses } = useSWR(API_URL_COURSES, (url) => fetch(url).then(res => res.json()))
  const { data: dataInsurances } = useSWR(API_URL_INSURANCES, (url) => fetch(url).then(res => res.json()))
  const isAnyLoading = !data || !dataStudents || !dataInsurances || !dataCourses;

  if (showCreditNotes) {
    data = data?.filter(invoice => invoice.creditNotes.length && !!invoice.creditNotes[0].creditNoteDate)
  }

  {/* Barra de FILTROS */ }

  const [creationFilter, setCreationFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [conceptFilter, setConceptFilter] = useState('');
  const [insuranceFilter, setInsuranceFilter] = useState('');

  let searchByParents = [];
  let searchByParentsIds = [];

  // -----------------------------------------------
  // Habilita busqueda por parents en facturacion
  // -----------------------------------------------
  // -----------------------------------------------
  // -----------------------------------------------
  // if (search) {
  //   searchByParents = dataStudents.filter(student => 
  //     student.parents[0].name.toLowerCase().includes(search.toLowerCase()) || 
  //     student.parents[0].lastName.toLowerCase().includes(search.toLowerCase()) || 
  //     student.parents[1].name.toLowerCase().includes(search.toLowerCase()) || 
  //     student.parents[1].lastName.toLowerCase().includes(search.toLowerCase())
  //   ) 
  //   searchByParentsIds  = searchByParents.map(a => a._id);
  // }
  // -----------------------------------------------

  const dataFiltered = data && data?.length > 0 && data?.filter((d) => {
    const matchesSearch = !search || 
      d.students?.find((studentId) => 
        dataStudents?.find((s) => s._id === studentId)?.name.toLowerCase().includes(search.toLowerCase()) || 
        dataStudents?.find((s) => s._id === studentId)?.lastName.toLowerCase().includes(search.toLowerCase()) || 
        searchByParentsIds.includes(dataStudents?.find((s) => s._id === studentId)?._id) || 
        d.invoiceNumber.toLowerCase().includes(search.toLowerCase())
      );
    
    
    const matchesPeriodFilter = !periodFilter || d.periods.some(a => a.name.includes(periodFilter));
    const matchesConceptFilter = !conceptFilter || d.concept.includes(conceptFilter);
    const matchesInsuranceFilter = !insuranceFilter || dataInsurances?.find((i) => i._id === d.insurance)?.plan.includes(insuranceFilter);
    const matchesCreationFilter = !creationFilter || moment(showCreditNotes ? d.creditNotes[0].creditNoteDate : d.invoiceDate).format('MMMM') === creationFilter;

    return matchesSearch && matchesPeriodFilter && matchesConceptFilter && matchesInsuranceFilter && matchesCreationFilter;
  });

  {/* Barra de FILTROS*/ }
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);

  const { mutate } = useSWRConfig()
  const navigate = useNavigate();

  if (errorMessage && showAlert) {
    window.alert(errorMessage);
    setErrorMessage('');
  }

  const onView = (invoiceId, callback) => {
    navigate("/factura/" + invoiceId);
  }

  const getStudentCompleteName = (student) => {
    return `${student?.name} ${student?.lastName}`;
  }

  const getInvoicePeriodsWithoutDuplicates = (invoice) => {
    return [...new Set(invoice.periods?.map(period => period.name))]
      .map(name => name.toUpperCase())
      .join(', ');
  }

  const totalFacturado = dataFiltered?.reduce((total, invoice) => total + parseFloat(invoice.invoiceAmount), 0);
  const totalDocumentos = dataFiltered?.length;

  const exportToXLS = () => {
    const wsData = [];

    wsData.push([
      'Nro Factura',
      'Fecha',
      'Periodos',
      'Estudiantes',
      'Importe',
    ]);

    dataFiltered.forEach(invoice => {
      const row = [
        upperCase(invoice.invoiceNumber),
        moment(invoice.invoiceDate).format("DD/MM/YYYY HH:mm"),
        getInvoicePeriodsWithoutDuplicates(invoice),
        invoice.students?.map(studentId => getStudentCompleteName(dataStudents?.find(student => student._id === studentId))).join(', '),
        invoice.invoiceAmount,
      ];
      wsData.push(row);
    });

    wsData.push([
      'Totales',
      '',
      totalDocumentos,
      '$' + formatCurrency(totalFacturado),
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Facturacion');
    XLSX.writeFile(wb, `reporte_facturacion.xlsx`);
  };


  

  return (
    <div className="h-full overflow-auto mt-4">
      <div className="w-full flex sticky top-0 z-10 bg-white pb-4 shadow px-4">
        {
          !isConfirmationDialogOpen && (
            <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Informe Facturación</h1>
          )
        }

      </div>

      <div className="w-full flex bg-white rounded pb-4 px-4 pt-2">
        {
          <Input
            autoComplete="false"
            rightElement={
              <div className="cursor-pointer" onClick={() => setSearch('')}>
                {search && <CloseIcon />}
              </div>
            }
            type="text"
            value={search}
            name="search"
            id="search"
            placeholder="Filtrar por estudiante/nro de factura"
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      </div>


      {/* Barra de FILTROS - HTML */}
  
      <div className="px-5 flex">
        <FiltersBar
          periodFilter={periodFilter}
          setPeriodFilter={setPeriodFilter}
          conceptFilter={conceptFilter}
          setConceptFilter={setConceptFilter}
          insuranceFilter={insuranceFilter}
          setInsuranceFilter={setInsuranceFilter}
          courses={dataCourses}
          insurances={dataInsurances}
          setCreationFilter={setCreationFilter}
          creationFilter={creationFilter}
        />
      </div>
      {/* Barra de FILTROS - HTML */}

      {
        (isAnyLoading) && (
          <div>
            <Spinner />
          </div>
        )
      }
      {
        data && (
          <div className="flex flex-col overflow-x-auto mb-20 px-4">
            
            <div className="flex items-center justify-start">
              <p className="pl-1 pb-1 text-slate-500">Total de facturas {totalDocumentos}</p>
              <p className="pl-1 pb-1 text-slate-500">Importe: ${formatCurrency(totalFacturado)}</p>
              <Button variant="outlined" size="sm" className="ml-2 mt-2 mb-4 text-xs" onClick={exportToXLS}>Exportar a XLS</Button>
            </div>


            <div className="sm:-mx-6 lg:-mx-8">
              <div className="inline-block w-full py-2 sm:px-6 lg:px-8">
                <div className="overflow-x-auto rounded-xl border">
                  <table className="text-left text-sm font-light rounded-xl table-auto w-full">
                    <thead className="border-b font-medium  bg-slate-50 rounded-xl">
                      <tr className="text-slate-400">
                        <th className="border-b  font-medium p-4 pl-8 pt-0 w-4 pb-3 text-slate-400 text-left">#</th>
                        <th scope="col" className="px-6 py-4">Nro de Factura</th>
                        <th scope="col" className="px-6 py-4 truncate">Fecha y Hora</th>
                        <th scope="col" className="px-6 py-4 truncate">Periodos</th>
                        <th scope="col" className="px-6 py-4 truncate">Conceptos</th>
                        <th scope="col" className="px-6 py-4 truncate">Estudiantes</th>
                        <th scope="col" className="px-6 py-4">Importe</th>
                        <th scope="col" className="px-6 py-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        dataFiltered.length ?
                            dataFiltered.map((invoice, index) => {
                              return (
                                <tr key={invoice._id} className={utils.cn('border-b last:border-b-0 hover:bg-gray-100', (index % 2 === 0) && 'bg-gray-50')}>
                                  <td className="text-left !text-xs border-b border-slate-100  p-4 pl-8 text-slate-500 ">{index + 1}</td>
                                  <td className="text-slate-500 !text-xs whitespace-nowrap px-6 py-4 font-medium">{upperCase(invoice.invoiceNumber)}</td>
                                  <td className="text-slate-500 !text-xs whitespace-nowrap px-6 py-4 font-medium">{moment(invoice.invoiceDate).format("DD/MM/YYYY HH:mm")}</td>
                                  <td className="text-slate-500 !text-xs whitespace-nowrap px-6 py-4 max-w-[180px] overflow-hidden" style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <div style={{ whiteSpace: 'nowrap' }}>
                                      {getInvoicePeriodsWithoutDuplicates(invoice)}
                                    </div>
                                  </td>
                                  <td className="text-slate-500 !text-xs whitespace-nowrap px-6 py-4 max-w-[180px] overflow-hidden" style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{upperCase(invoice.concept)}</td>
                                  {
                                    !showCreditNotes && (
                                      <td className="text-slate-500 !text-xs whitespace-nowrap px-6 py-4 max-w-[180px] overflow-hidden" style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invoice.students?.map(studentId => getStudentCompleteName(dataStudents?.find(student => student._id === studentId))).join(', ')}</td>
                                    )
                                  }
                                  <td className="text-slate-500 !text-xs whitespace-nowrap px-6 py-4">${invoice.invoiceAmount}</td>
                                  <td className="whitespace-nowrap px-6 py-4">
                                    <div className="flex gap-4">
                                      <button className="flex items-center justify-center w-8 h-8" title="Ver detalle" onClick={() => onView(invoice._id)}><EyeIcon /></button>
                                      {invoice.creditNotes[0]?.creditNoteCae}
                                    </div>
                                  </td>
                                </tr>
                              );
                          })
                          : (
                            <tr className="border-b last:border-b-0 ">
                              <td colSpan={6} className="whitespace-nowrap px-6 py-4 font-medium">
                                Sin registros
                              </td>
                            </tr>
                          )
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-center items-center p-4"></div>
          </div>
        )
      }
    </div>
  );
}

