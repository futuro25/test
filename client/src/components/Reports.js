import React, { useState } from "react";
import useSWR from 'swr'
import Spinner from "./common/Spinner";
import * as utils from '../utils/utils'
import * as XLSX from 'xlsx';
import Button from "./common/Button";
import { isMobile } from 'react-device-detect';


export default function Reports() {

  //URLS
  const API_URL_STUDENTS = '/api/students';
  const API_URL_INVOICES = '/api/billings?not_status=CREDIT_NOTE_CREATED';
  const API_URL_RECEIPTS = '/api/receipts?not_status=DEBIT_NOTE_CREATED';

  //DATA
  const { data: dataStudents, errorStudents, isLoadingStudents } = useSWR(API_URL_STUDENTS, (url) => fetch(url).then(res => res.json()))
  const { data: dataInvoices, errorInvoices, isLoadingInvoices } = useSWR(API_URL_INVOICES, (url) => fetch(url).then(res => res.json()))
  const { data: dataReceipts, errorReceipts, isLoadingReceipts } = useSWR(API_URL_RECEIPTS, (url) => fetch(url).then(res => res.json()))
  const isAnyLoading = !dataStudents || !dataInvoices || !dataReceipts;

  //STATES
  const [stage, setStage] = useState('LIST');
  const [year, setYear] = useState(new Date().getFullYear());

  if (errorStudents || errorInvoices || errorReceipts) {
    console.log(errorStudents || errorInvoices || errorReceipts)
  }

  const getStudentFullName = (student) => {
    return `${student.name} ${student.lastName}`.toUpperCase();
  }

  const getInvoicedTotalForStudentPeriod = (student, periodName) => {
    const invoicedPeriods = dataInvoices.flatMap(invoice =>
      invoice.periods.filter(period => period.name === `${periodName}/${year}` && period.student === student._id)
    );

    const totalInvoicedPeriods = invoicedPeriods.reduce((total, period) => total + parseFloat(period.price), 0);
    return totalInvoicedPeriods;
  };

  const getReceiptTotalForStudentPeriod = (student, periodName) => {
    const periodIds = new Set(
      dataInvoices.flatMap(invoice =>
        invoice.periods
          .filter(
            period =>
              period.name === `${periodName}/${year}` &&
              period.student === student._id &&
              period.receipts.length > 0
          )
          .map(period => period._id)
      )
    );
  
    const receiptIds = new Set(
      dataInvoices.flatMap(invoice =>
        invoice.periods
          .filter(
            period =>
              period.name === `${periodName}/${year}` &&
              period.student === student._id
          )
          .flatMap(period => period.receipts)
      )
    );
  
    const filteredReceipts = dataReceipts.filter(receipt =>
      receiptIds.has(receipt._id)
    );
  
    const totalReceiptPeriods = filteredReceipts
      .flatMap(receipt =>
        receipt.invoicedPeriods.filter(
          period =>
            period.student === student._id &&
            periodIds.has(period.periodId)
        )
      )
      .reduce((total, period) => total + parseFloat(period.amount), 0);
  
    const totalWithholdings = filteredReceipts
      .flatMap(receipt => receipt.withholdings || [])
      .reduce(
        (total, withholding) => total + parseFloat(withholding.amount),
        0
      );
  
    return totalReceiptPeriods + totalWithholdings;
  };  

  const getInvoicedTotalForStudent = (student) => {
    return utils.getCoursePeriods().reduce((total, periodName) => {
      return total + getInvoicedTotalForStudentPeriod(student, periodName);
    }, 0);
  };

  const getReceiptTotalForStudent = (student) => {
    return utils.getCoursePeriods().reduce((total, periodName) => {
      return total + getReceiptTotalForStudentPeriod(student, periodName);
    }, 0);
  }

  const getInvoicedTotalForPeriod = (period) => {
    return dataStudents.reduce((total, student) => {
      return total + getInvoicedTotalForStudentPeriod(student, period);
    }, 0);
  }

  const getReceiptTotalForPeriod = (period) => {
    return dataStudents.reduce((total, student) => {
      return total + getReceiptTotalForStudentPeriod(student, period);
    }, 0);
  }

  const getInvoicedGrandTotal = () => {
    return dataStudents.reduce((total, student) => {
      return total + getInvoicedTotalForStudent(student);
    }, 0);
  }

  const getReceiptGrandTotal = () => {
    return dataStudents.reduce((total, student) => {
      return total + getReceiptTotalForStudent(student);
    }, 0);
  }

  const formatCurrency = (value) => {
    return value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const exportToXLS = () => {
    const wsData = [
      ['Estudiante', ...utils.getCoursePeriods().flatMap(period => [period + ' Facturado', period + ' Recibido']), 'Total Facturado', 'Total Recibido']
    ];

    dataStudents.forEach(student => {
      const row = [
        getStudentFullName(student),
        ...utils.getCoursePeriods().flatMap(period => [
          formatCurrency(getInvoicedTotalForStudentPeriod(student, period)),
          formatCurrency(getReceiptTotalForStudentPeriod(student, period))
        ]),
        formatCurrency(getInvoicedTotalForStudent(student)),
        formatCurrency(getReceiptTotalForStudent(student))
      ];
      wsData.push(row);
    });

    wsData.push([
      'Totales',
      ...utils.getCoursePeriods().flatMap(period => [
        formatCurrency(getInvoicedTotalForPeriod(period)),
        formatCurrency(getReceiptTotalForPeriod(period))
      ]),
      formatCurrency(getInvoicedGrandTotal()),
      formatCurrency(getReceiptGrandTotal())
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Reportes');
    XLSX.writeFile(wb, `reportes_${year}.xlsx`);
  };

  return (
    <div className="h-full overflow-auto">
      <div className="w-full flex sticky top-0 z-10 bg-white shadow px-4 pb-4">
      <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight print:hidden">Informe Anual</h1>
      </div>
      {
        (isAnyLoading) && (
          <div>
            <Spinner />
          </div>
        )
      }
      {
        (errorInvoices || errorStudents || errorReceipts) && (
          <div className="text-red-500">
            {console.log(errorInvoices || errorStudents || errorReceipts)}
          </div>
        )
      }

      {
        (!isAnyLoading) && (
          <div>
            <Button variant="outlined" className="ml-4 mt-2" onClick={exportToXLS}>Exportar a XLS</Button>
          </div>
        )
      }

      {
        stage === 'LIST' && dataInvoices && dataReceipts && dataStudents && (
          <div className="mt-4 px-4">
            <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))]" style={{ "backgroundPosition": "10px 10px" }}></div>
              <div className="relative rounded-xl">
                <div className="shadow-sm overflow-x-auto max-h-[calc(100lvh-13rem)]">
                  <div className="w-full table-wrp block"> {/* Este es el div sugerido */}
                    <table className="border-collapse text-sm table-fixed">
                      <thead className="sticky top-0 z-20">
                        <tr>
                          <th className="sticky left-0 bg-gray-50 font-medium p-4 pb-3 text-slate-400 text-center">Estudiante</th>
                          {
                            utils.getCoursePeriods().map((periodName) => (
                              <th colSpan={2} key={`periodName.${periodName}`} className="bg-gray-50 font-medium p-4 pb-3 text-slate-400 text-center">{periodName}</th>
                            ))
                          }
                          <th colSpan={2} className="bg-gray-50 font-medium p-4 pb-3 text-slate-400 text-center">Totales</th>
                        </tr>
                        <tr>
                          <th className="sticky left-0 bg-gray-50 font-medium p-4 pb-3 text-slate-400 text-left"></th>
                          {
                            utils.getCoursePeriods().map((periodName) => (
                              <>
                                <th key={`invoicedPeriodColumn.${periodName}`} className="bg-gray-50 font-medium p-4 pb-3 text-slate-400 text-left">Facturado</th>
                                <th key={`receiptPeriodColumn.${periodName}`} className="bg-gray-50 font-medium p-4 pb-3 text-slate-400 text-left">Recibido</th>
                              </>
                            ))
                          }
                          <th className="bg-gray-50 font-medium p-4 pb-3 text-slate-400 text-left">Facturado</th>
                          <th className="bg-gray-50 font-medium p-4 pb-3 text-slate-400 text-left">Recibido</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white overflow-y-auto h-96">
                        {
                          dataStudents.length ? (
                            <>
                              {
                                dataStudents.map((student, index) => (
                                  <tr key={student._id} className={utils.cn('border-b last:border-b-0 hover:bg-gray-100', (index % 2 === 0) && 'bg-gray-50')}>
                                    <td className={utils.cn("sticky left-0 min-w-1 !text-xs border-slate-100 p-4 text-slate-500", !isMobile && 'whitespace-nowrap', (index % 2 === 0) && 'bg-gray-50',  (index % 2 === 1) && 'bg-white', student.enabled === "NO" && 'bg-gray-800 text-white')}>
                                      {
                                        getStudentFullName(student)
                                      }
                                      {
                                        student.enabled === "NO" && " (Baja)"
                                      }
                                    </td>
                                    {
                                      utils.getCoursePeriods().map((period) => {
                                        const invoicedTotal = getInvoicedTotalForStudentPeriod(student, period);
                                        const receiptTotal = getReceiptTotalForStudentPeriod(student, period);
                                        const hasDifference = invoicedTotal !== receiptTotal;

                                        return (
                                          <>
                                            <td key={`invoiceTotal.${period}`} className={utils.cn("border-b !text-xs border-slate-100 whitespace-nowrap w-full p-4 text-slate-500", hasDifference && 'bg-[#ffe6e6] hover:bg-red-300')}>
                                              ${formatCurrency(invoicedTotal)}
                                            </td>
                                            <td key={`receiptTotal.${period}`} className={utils.cn("border-b border-r !text-xs border-slate-100 whitespace-nowrap w-full p-4 text-slate-500", hasDifference && 'bg-[#ffe6e6] hover:bg-red-300')}>
                                              ${formatCurrency(receiptTotal)}
                                            </td>
                                          </>
                                        );
                                      })
                                    }
                                    {
                                      (() => {
                                        const invoicedTotal = getInvoicedTotalForStudent(student);
                                        const receiptTotal = getReceiptTotalForStudent(student);
                                        const hasDifference = invoicedTotal !== receiptTotal;

                                        return (
                                          <>
                                            <td className={utils.cn("border-b !text-xs border-slate-100 whitespace-nowrap w-full p-4 text-slate-500", hasDifference && 'bg-[#ffe6e6] hover:bg-red-300')}>
                                              ${formatCurrency(invoicedTotal)}
                                            </td>
                                            <td className={utils.cn("border-b !text-xs border-slate-100 whitespace-nowrap w-full p-4 text-slate-500", hasDifference && 'bg-[#ffe6e6] hover:bg-red-300')}>
                                              ${formatCurrency(receiptTotal)}
                                            </td>
                                          </>
                                        );
                                      })()
                                    }
                                  </tr>
                                ))
                              }
                              <tr>
                                <td className={utils.cn("sticky left-0 border-b border-r font-medium p-4 pt-0 pb-3 text-slate-400 text-left", !isMobile && 'whitespace-nowrap', (dataStudents.length % 2 === 0) && 'bg-gray-50',  (dataStudents.length  % 2 === 1) && 'bg-white')}>Totales</td>
                                {
                                  utils.getCoursePeriods().map((period) => {
                                    const invoicedTotal = getInvoicedTotalForPeriod(period);
                                    const receiptTotal = getReceiptTotalForPeriod(period);
                                    const hasDifference = invoicedTotal !== receiptTotal;

                                    return (
                                      <React.Fragment key={period}>
                                        <td key={`invoicedTotalForPeriod.${period}`} className={utils.cn("border-b !text-xs border-slate-100 whitespace-nowrap bg-white w-full p-4 text-slate-500", hasDifference && 'bg-[#ffe6e6] hover:bg-red-300')}>
                                          ${formatCurrency(invoicedTotal)}
                                        </td>
                                        <td key={`receiptTotalForPeriod.${period}`} className={utils.cn("border-b border-r !text-xs border-slate-100 whitespace-nowrap bg-white w-full p-4 text-slate-500", hasDifference && 'bg-[#ffe6e6] hover:bg-red-300')}>
                                          ${formatCurrency(receiptTotal)}
                                        </td>
                                      </React.Fragment>
                                    );
                                  })
                                }
                                {
                                  (() => {
                                    const invoicedGrandTotal = getInvoicedGrandTotal();
                                    const receiptGrandTotal = getReceiptGrandTotal();
                                    const hasDifference = invoicedGrandTotal !== receiptGrandTotal;

                                    return (
                                      <>
                                        <td className={utils.cn("border-b !text-xs border-slate-100 whitespace-nowrap bg-white w-full p-4 text-slate-500", hasDifference && 'bg-[#ffe6e6] hover:bg-red-300')}>
                                          ${formatCurrency(invoicedGrandTotal)}
                                        </td>
                                        <td className={utils.cn("border-b !text-xs border-slate-100 whitespace-nowrap bg-white w-full p-4 text-slate-500", hasDifference && 'bg-[#ffe6e6] hover:bg-red-300')}>
                                          ${formatCurrency(receiptGrandTotal)}
                                        </td>
                                      </>
                                    );
                                  })()
                                }
                              </tr>
                            </>
                          ) : (
                            <tr>
                              <td colSpan={4} className="border-b border-slate-100 bg-white w-full p-4 pl-8 text-slate-500">Sin registros</td>
                            </tr>
                          )
                        }
                      </tbody>
                    </table>
                  </div>
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
