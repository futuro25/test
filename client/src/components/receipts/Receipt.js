import React, { useState, useEffect, useRef } from "react";
import { split, replace } from "lodash";
import logo3 from '../../logo3.png';
import useSWR from 'swr'
import * as _utils from '../../utils/utils'
import InsuranceData from "../common/InsuranceData";
import { decode as base64_decode, encode as base64_encode } from 'base-64';
import QRCode from "react-qr-code";
import { config } from '../../config';
import { isMobile } from 'react-device-detect';


var moment = require('moment');
const conversor = require('conversor-numero-a-letras-es-ar');


window.onresize = window.onload = function () {
  var bill = document.querySelector("#bill");
  if (!bill) {
    setTimeout(window.onload, 1000)
    return
  }
  var style = window.getComputedStyle(bill.parentElement);
  var padding = parseInt(style.paddingInline.replace('px', '')) * 4
  if (!padding) {
    style = window.getComputedStyle(bill.parentElement.parentElement);
    padding = parseInt(style.paddingInline.replace('px', '')) * 4
  }
  if (!isMobile) padding += 140
  bill.className = 'my-4 min-w-[600px] min-h-full origin-top-left print:scale-100 scale-[' + Math.min(1, ((window.innerWidth - padding) / bill.scrollWidth)) + ']'
}

const numberToLetter = (number) => {
  const data = split(number, ".");
  const cents = data[1] || 0;
  let ClaseConversor = conversor.conversorNumerosALetras;
  let miConversor = new ClaseConversor();
  return miConversor.convertToText(data[0]) + " con " + cents + "/100";
}

const HeaderData = () => {
  return (
    <div className="flex-wrap flex items-stretch justify-between max-w-[1200px] w-full">
      {/* COL A */}
      <div className="flex-1 border-l border-b border-t overflow-auto p-4 pb-8">
        <div className="flex gap-2">
          <div className="flex gap-2 w-24">
            <img src={logo3} alt="logo" className="w-14 h-14 object-cover" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">Centro de Recup Adaptac y Recreacion SRL</h2>
            <h2 className=" mb-2 text-base font-bold">Instituto Educativo CREAR A-975</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <label>Juramento 4751 (C1431CKE) Cdad Aut de Bs As</label>
        </div>
        <div className="flex gap-2">
          <label>Tel/Fax 4522-6666 Lineas rotativas</label>
        </div>
        <div className="flex gap-2">
          <label>Email: facturacion@institutocrear.edu.ar</label>
        </div>
        <div className="flex gap-2">
          <label>IVA EXENTO</label>
        </div>
      </div>

      {/* COL B */}
      <div className="flex-1 border-r border-b border-t overflow-auto p-4 pb-8">
        <div className="flex gap-2">
          <label>CUIT: 30-64024169-8 ING BRUTOS: 785573-07</label>
        </div>
        <div className="flex gap-2">
          <label>Subvencion estatal N Inicial y EGB: 80%</label>
        </div>
        <div className="flex gap-2">
          <label>Subvencion estatal Post Primaria: 80%</label>
        </div>
        <div className="flex gap-2">
          <label>Inicio de actividades: 01/07/1990</label>
        </div>
        <div className="flex gap-2">
          <label className="font-bold">TE gratuito 147 CABA Defensa y protecc al</label>
        </div>
      </div>
    </div>
  );
}

const ParentInfo = ({ student }) => {
  return (
    student.invoiceHolder.includes('1') ? (
      <div className="border w-full h-[180px] p-4 pb-8">
        <div className="flex gap-2">
          <label className="font-bold text-lg">{`${student.parents[0]?.name} ${student.parents[0]?.lastName}`}</label>
        </div>
        <div className="flex gap-2">
          <label className="text-lg">{student.parents[0]?.phone}</label>
        </div>
        <div className="flex gap-2">
          <label className="text-lg">{student.parents[0]?.email}</label>
        </div>
      </div>
    ) : (
      <div className="border w-full h-[180px] p-4 pb-8">
        <div className="flex gap-2">
          <label className="font-bold text-lg">{student.parents[1]?.name}</label>
        </div>
        <div className="flex gap-2">
          <label className="text-lg">{student.parents[1]?.phone}</label>
        </div>
        <div className="flex gap-2">
          <label className="text-lg">{student.parents[1]?.email}</label>
        </div>
      </div>
    )
  );
};

const StudentInfo = ({ student }) => {
  return (
    <div className="border w-full h-[180px] p-4 pb-8">
      <div className="flex gap-2">
        <label className="font-bold text-lg">{`${student.name} ${student.lastName}`}</label>
      </div>
      <div className="flex gap-2">
        <label className="text-lg">{student.email}</label>
      </div>
      <div className="flex gap-2">
        <label className="text-lg">DNI {student.documentNumber}</label>
      </div>
      <div className="flex gap-2">
        <label className="text-lg">Afiliado Nro {student.affiliateNumber}</label>
      </div>
    </div>
  );
}

function CreatedReceipt({ receipt, showDebitNote }) {
  const API_URL_STUDENTS = '/api/students';
  const API_URL_INSURANCES = '/api/insurances';
  const API_URL_COURSES = '/api/courses';

  const { data: dataStudents } = useSWR(API_URL_STUDENTS, url => fetch(url).then(res => res.json()));
  const { data: dataInsurances } = useSWR(API_URL_INSURANCES, url => fetch(url).then(res => res.json()));
  const { data: dataCourses } = useSWR(API_URL_COURSES, url => fetch(url).then(res => res.json()));

  const fetchInvoices = async (receipt) => {
    const invoiceIds = receipt.invoice
    const requests = invoiceIds.map(id => fetch(`/api/billings/${id}`).then(res => res.json()));
    return Promise.all(requests);
  };

  const { data: dataInvoices, error: loadingInvoicesError } = useSWR(() => receipt, fetchInvoices);

  if (loadingInvoicesError) {
    console.error("Error loading invoices:", loadingInvoicesError);
  }

  const isLoading = !dataStudents || !dataInvoices || !dataInsurances || !dataCourses;
  const firstStudentsOfInvoicesIds = dataInvoices?.map(invoice => invoice.students[0]);
  const firstStudentsOfInvoices = firstStudentsOfInvoicesIds?.map(id => dataStudents?.find(student => student._id === id));
  const invoiceHolders = firstStudentsOfInvoices?.map(student => student?.invoiceHolder);

  const monthInvoiceDetails = () => {
    if (!receipt || !dataCourses) return '';
  
    const periodIds = receipt.invoicedPeriods.map(p => p.periodId);
  
    const monthNumbers = dataCourses.flatMap(course =>
      course.periods
        .filter(period => periodIds.includes(period._id))
        .map(period => parseInt(period.month))
    );
  
    const uniqueMonthLabels = Array.from(new Set(monthNumbers.sort((a, b) => a - b)))
      .map(monthNumber =>
        _utils.getEnglishMonths().find(m => m.id === monthNumber)?.label || ''
      );
  
    return uniqueMonthLabels.join(', ');
  };
  
  // STATES
  const [insuranceInfo, setInsuranceInfo] = useState(null);

  const getInsuranceInfo = (insuranceId) => {
    setInsuranceInfo(dataInsurances?.find(insurance => insurance._id === insuranceId));
  }

  useEffect(() => {
    if (dataInvoices?.length && dataInvoices[0].insurance) {
      getInsuranceInfo(dataInvoices[0].insurance);
    }
  }, [dataInvoices, dataInsurances]);

  useEffect(() => {
    const textarea = document.querySelector('.auto-resize-textarea');
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [receipt.itemsDetail]);

  // UTILS

  const getAmountWithoutWithholdings = () => {
    const totalWithholdings = receipt.withholdings.reduce((total, withholding) => total + +withholding.amount, 0);
    return (+receipt.amount - totalWithholdings).toFixed(2);
  };

  let docRecepInfo = {};

  if (invoiceHolders && dataInsurances && dataStudents && firstStudentsOfInvoices) {
    if (invoiceHolders.includes('Obra Social')) {
      const insurance = dataInsurances.find(insurance => insurance._id === dataInvoices[0].insurance);
      docRecepInfo = {
        tipoDocRec: 80,
        nroDocRec: +replace(insurance.cuit, /-/g, "")
      };
    }

    if (invoiceHolders.some(holder => holder.includes('Padre') || holder.includes('Madre'))) {
      const docType = firstStudentsOfInvoices[0]?.parents[0]?.documentType === 'DNI' ? 96 :
        firstStudentsOfInvoices[0]?.parents[0]?.documentType === 'CUIL' ? 86 : 80;
      const documentNumber = firstStudentsOfInvoices[0]?.parents[0]?.documentNumber;

      docRecepInfo = {
        tipoDocRec: docType,
        nroDocRec: documentNumber
      };
    }

    if (invoiceHolders.includes('Estudiante')) {
      docRecepInfo = {
        tipoDocRec: 96,
        nroDocRec: +firstStudentsOfInvoices[0]?.documentNumber
      };
    }
  }

  const link = "https://www.afip.gob.ar/fe/qr/?p=";

  let jsonQrAfipReceiptData;
  if (receipt.debitNotes.length && showDebitNote) {
    jsonQrAfipReceiptData = {
      ver: 1,
      fecha: split(receipt.debitNotes[0].debitNoteDate, "T")[0],
      cuit: +replace(+config.debitNote.cuit, /-/g, ""),
      ptoVta: +config.debitNote.sellPoint,
      tipoCmp: +config.debitNote.receiptType,
      nroCmp: +split(receipt.debitNotes[0].debitNoteNumber, "-")[1],
      importe: +receipt.amount,
      moneda: "PES",
      ctz: 1,
      ...docRecepInfo,
      tipoCodAut: "E",
      codAut: +receipt.debitNotes[0].debitNoteCae
    };
  } else {
    jsonQrAfipReceiptData = {
      ver: 1,
      fecha: split(receipt.createdAt, "T")[0],
      cuit: +replace(+config.receipt.cuit, /-/g, ""),
      ptoVta: +config.receipt.sellPoint,
      tipoCmp: +config.receipt.receiptType,
      nroCmp: +split(receipt.receiptNumber, "-")[1],
      importe: +receipt.amount,
      moneda: "PES",
      ctz: 1,
      ...docRecepInfo,
      tipoCodAut: "E",
      codAut: +receipt.cae
    };
  }

  const encodedJsonQrAfipInvoiceData = base64_encode(JSON.stringify(jsonQrAfipReceiptData));
  const afipReceiptLink = link + encodedJsonQrAfipInvoiceData;

  return (
    <div className="px-4 h-full overflow-auto px-4 h-full min-w-[1000px]">
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>

          {receipt && dataInvoices && (
            <div id="bill" className="my-4 min-w-[600px] min-h-full origin-top-left print:scale-100 max-w-[1200px]">
              <div className="flex-wrap flex flex-col items-center justify-between max-w-[1200px] w-full mt-5">
                <HeaderData />

                <div className="flex items-center justify-between max-w-[1200px] w-full">
                  {dataInvoices[0]?.students && (
                    invoiceHolders.includes('Obra Social') ? (
                      <InsuranceData insuranceInfo={insuranceInfo} />
                    ) : (
                      invoiceHolders.some(holder => holder.includes('Padre') || holder.includes('Madre')) ? (
                        <ParentInfo student={firstStudentsOfInvoices[0]} />
                      ) : (
                        invoiceHolders.includes('Estudiante') && <StudentInfo student={firstStudentsOfInvoices[0]} />
                      )
                    )
                  )}

                  <div className="border-r border-b border-t w-full h-[180px] flex items-start p-4 pb-8">
                    <div>
                      <div className="flex gap-2">
                        <label className="font-bold">Nro Recibo: </label>
                        <label>{receipt.receiptNumber}</label>
                      </div>
                      <div className="flex gap-2">
                        <label className="font-bold">Fecha de Emision: </label>
                        <label>{moment(receipt.createdAt).format('DD/MM/YYYY')}</label>
                      </div>
                      {!!receipt.debitNotes.length && showDebitNote && (
                        <div className="flex gap-2">
                          <label className="font-bold">Nota de Debito: </label>
                          <label>{receipt.debitNotes[0].debitNoteNumber}</label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border w-full pl-4 bg-slate-300">
                  <div className="flex gap-2 items-center justify-between">
                    <div className="flex gap-2">
                      <label>SUBTOTAL</label>
                    </div>
                  </div>
                </div>

                <div className="border w-full">
                  <div className="flex gap-2 items-center justify-between">
                    <div className="flex flex-col gap-2 p-2 pl-4">
                      <label>Otros conceptos</label>
                    </div>
                    <div className="flex flex-col gap-2 p-2">
                      <div>${receipt.amount}</div>
                    </div>
                  </div>
                </div>
                <div className="border w-full">
                  <div className="flex flex-col gap-4">
                    <div className="h-[600px] flex flex-col gap-2 p-4">
                      <textarea
                        rows={8}
                        readOnly
                        value={receipt.itemsDetail || 'No hay detalle de items para mostrar.'}
                        className="auto-resize-textarea no-border no-resize"
                      />
                    </div>
                    <div className="px-4">
                      <label className="font-bold">Mes correspondiente: </label>
                      <label>{monthInvoiceDetails()}</label>
                    </div>
                    <div className="px-4">
                      <label className="font-bold">Segun facturas Nro: </label>
                      <label>{dataInvoices.map(invoice => invoice.invoiceNumber).join(', ')}</label>
                    </div>
                    <div className="px-4 pb-4">
                      <label className="font-bold">Detalle: </label>
                      <label>{receipt.detail || 'Ninguno.'}</label>
                    </div>
                  </div>

                  <div id="QRCode" className="flex text-sm w-full px-4 justify-start">
                    <div className="w-[100px] h-[100px] mb-2 cursor-pointer" onClick={() => { window.open(afipReceiptLink, '_blank') }}>
                      <QRCode size={100} value={afipReceiptLink} />
                    </div>
                  </div>
                </div>

                <div className="flex border text-sm w-full px-4 justify-end">
                  <div className="w-full py-4"></div>
                  <div className="w-[250px] py-4 flex justify-end">
                    RECIBO: ${getAmountWithoutWithholdings()}
                  </div>
                </div>

                <div className="flex border text-sm w-full px-4">
                  <div className="w-full p-4">
                    <label className="italic">Son Pesos: {numberToLetter(receipt.amount)}</label>
                  </div>
                  <div className="w-full py-4 flex justify-end">
                    <label className="">Total: ${receipt.amount}</label>
                  </div>
                </div>
              </div>
              <div className="p-4 font-bold italic print:hidden">
                <label>Este modelo de recibo aplica para todas las facturas/periodos seleccionados.</label>
              </div>
            </div>
          )}
        </>)}
    </div>
  );
}

function ReceiptPreview({ receiptPreviews, isGroupReceipt }) {
  // URLS
  const API_URL_STUDENTS = '/api/students';
  const API_URL_INSURANCES = '/api/insurances';

  // DATA
  const { data: dataStudents, isLoading: isLoadingStudents } = useSWR(API_URL_STUDENTS, (url) => fetch(url).then(res => res.json()));
  const { data: dataInsurances } = useSWR(API_URL_INSURANCES, (url) => fetch(url).then(res => res.json()))

  // UTILS
  const getFirstPreview = () => {
    return receiptPreviews[0];
  }

  const handleTextareaChange = (e) => {
    setItemsDetail(e.target.value);
    receiptPreviews.forEach(preview => {
      preview.itemsDetail = e.target.value;
    });
  };

  const getStudent = (studentId) => {
    return dataStudents?.find(student => student._id === studentId);
  }

  const getStudentData = (studentId) => {
    const student = getStudent(studentId);
    return `${student.name} ${student.lastName}, DNI: ${student.documentNumber}`;
  }

  function getPreviewFirstInvoice() {
    return getFirstPreview().invoice[0];
  }

  const getInitialItemsDetailPreview = () => {
    receiptPreviews.forEach(preview => {
      let msg = preview.periods.map(period => {
        const relatedInvoice = preview.invoice.find(invoice => 
          invoice.periods.some(invoicePeriod => invoicePeriod._id === period._id && invoicePeriod.student === period.student)
        );
        
        const invoiceNumber = relatedInvoice ? relatedInvoice.invoiceNumber : '';
        return `* ${getStudentData(period.student)}, ${invoiceNumber}, $${period.price}`;
      }).join('\n');

      if (preview.withholdings?.length > 0) {
        msg += '\n\nRetenciones:\n';
        msg += preview.withholdings?.map(withholding => `* ${withholding.name}, $${withholding.amount}`).join('\n');
      }
      preview.itemsDetail = msg;
    });

    if (isGroupReceipt) {
      return receiptPreviews.map(preview => preview.itemsDetail).join('\n\n');
    } else {
      return getFirstPreview().itemsDetail;
    }
  };

  // STATES

  const [insuranceInfo, setInsuranceInfo] = useState(null);

  const getInsuranceInfo = (insuranceId) => {
    setInsuranceInfo(dataInsurances?.find(insurance => insurance._id === insuranceId))
  }

  useEffect(() => {
    if (getPreviewFirstInvoice() && getPreviewFirstInvoice().insurance) {
      getInsuranceInfo(getPreviewFirstInvoice().insurance)
    }
  }, [getPreviewFirstInvoice(), dataInsurances])

  // State para el textarea
  const initialDetailRef = useRef(null);

  useEffect(() => {
    initialDetailRef.current = getInitialItemsDetailPreview();
    setItemsDetail(initialDetailRef.current);
  }, []);

  const [itemsDetail, setItemsDetail] = useState('');

  // State para un unico student de la factura
  const student = getStudent(getPreviewFirstInvoice().students[0]);

  return (
    <div className="px-4 h-full overflow-x-hidden overflow-y-visible">
      {
        getFirstPreview() && (
          <div className="my-4 min-w-[600px]">
            <div className="w-full flex items-center justify-center max-w-[1200px] -mb-[62px]">
              <div className="p-4 h-12 w-12 relative font-bold text-xl"></div>
            </div>

            <div id="bill" className="flex flex-col items-center justify-between max-w-[1200px] w-full origin-top-left">
              <HeaderData />

              <div className="flex items-center justify-between max-w-[1200px] w-full">
                {
                  getPreviewFirstInvoice().students && (
                    student?.invoiceHolder === 'Obra Social' ? (
                      <InsuranceData insuranceInfo={insuranceInfo} />
                    ) : (
                      student?.invoiceHolder?.includes('Padre') || student?.invoiceHolder?.includes('Madre') ? (
                        <ParentInfo student={student} />
                      ) : (
                        student?.invoiceHolder?.includes('Estudiante') ? (
                          <StudentInfo student={student} />
                        ) : null
                      )
                    )
                  )
                }
              </div>

              <div className="border w-full pl-4 bg-slate-300">
                <div className="flex gap-2 items-center justify-between">
                  <div className="flex gap-2">
                    <label>SUBTOTAL</label>
                  </div>
                </div>
              </div>

              {/* <div className="border w-full p-2">
                <div className="flex gap-2 items-center justify-between">
                  <div className="flex flex-col gap-2 p-4">
                    <label>Otros conceptos</label>
                  </div>
                  <div className="flex flex-col gap-2 p-4">
                    <div>${getPreviewExample().amount}</div>
                  </div>
                </div>
              </div> */}

              <div className="border w-full p-2">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 p-4">
                    <label className="font-bold italic print:hidden">Al editar este detalle, se aplicará el mismo contenido a todos los recibos a crear.</label>
                    <div className="flex flex-col gap-2 p-4">
                      <textarea
                        className="border p-2"
                        rows={8}
                        value={itemsDetail}
                        onChange={handleTextareaChange}
                      />
                    </div>
                  </div>
                  <div className="p-4">
                    <label className="font-bold">Detalle: </label>
                    <label>{getFirstPreview().formData.detail || 'Ninguno.'}</label>
                  </div>
                </div>
              </div>

              <div className="flex border text-sm w-full px-4 justify-end">
                <div className="w-full py-4"></div>
                <div className="w-[250px] py-4 flex justify-end">
                  RECIBO: ${getFirstPreview().amountWithoutWithholdings}
                </div>
              </div>

              <div className="flex border text-sm w-full px-4">
                <div className="w-full p-4">
                  <label className="italic">Son Pesos: {numberToLetter(getFirstPreview().amount)}</label>
                </div>
                <div className="w-full py-4 flex justify-end">
                  <label className="">Total: ${getFirstPreview().amount}</label>
                </div>
              </div>
            </div>
            <div className="p-4 font-bold italic print:hidden">
              <label>Este modelo de recibo aplica para todas las facturas/periodos seleccionados.</label>
            </div>
          </div>
        )
      }
    </div>
  );
}

export { ReceiptPreview, CreatedReceipt };
