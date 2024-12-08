import { useNavigate, useParams } from "react-router-dom";
import React, { useEffect, useState, useRef } from "react";
import useSWR from 'swr'
import { upperCase } from 'lodash'
import Button from "./common/Button";
import Spinner from "./common/Spinner";
import { split, replace } from "lodash";
import logo3 from '../logo3.png';
import { useReactToPrint } from 'react-to-print';
import {decode as base64_decode, encode as base64_encode} from 'base-64';
import QRCode from "react-qr-code";
import { isMobile } from 'react-device-detect';

var moment = require('moment');
const conversor = require('conversor-numero-a-letras-es-ar');


window.onresize = window.onload =function() {
  var bill = document.querySelector("#bill");
  if(!bill){
    setTimeout(window.onload, 1000)
    return
  }
  var style = window.getComputedStyle(bill.parentElement);
  var padding = parseInt(style.paddingInline.replace('px',''))*4
  if(!padding){
    style = window.getComputedStyle(bill.parentElement.parentElement);
    padding = parseInt(style.paddingInline.replace('px',''))*4
  }
  if(!isMobile) padding+=140
  bill.className='flex-wrap flex items-stretch justify-between max-w-[1200px] w-full origin-top-left print:scale-100 scale-['+Math.min(((window.innerWidth - padding) / bill.scrollWidth), 1)+']'  
}

const numberToLetter = (number) => {
  const data = split(number, ".");
  const cents = data[1] || 0;
  let ClaseConversor = conversor.conversorNumerosALetras;
  let miConversor = new ClaseConversor();
  return miConversor.convertToText(data[0]) + " con " + cents + "/100";
}

const getInvoicePeriods = (periods) => {
  return [...new Set(periods?.map(period => period.name))]
    .map(name => name.toUpperCase())
    .join(', ');
}

const InvoiceHeader = ({ receiptType }) => {
  return (
    <div className="flex-wrap flex items-stretch justify-between max-w-[1200px] w-full">
      {/* COL A */}
      <div className="flex-1 border-l border-b border-t overflow-auto p-4 pb-8">
        <div className="flex gap-2">
          <div className="flex gap-2 w-24">
            <img src={logo3} alt="logo" className="w-14 h-14 object-cover mr-2" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-bold">Centro de Recup Adaptac y Recreacion SRL</h2>
            <h2 className="mb-2 text-sm font-bold">Instituto Educativo CREAR A-975</h2>
          </div>
        </div>
        <div className="flex gap-2 text-sm mt-2">
          <label>Juramento 4751 (C1431CKE) Cdad Aut de Bs As</label>
        </div>
        <div className="flex gap-2 text-sm">
          <label>Tel/Fax 4522-6666 Lineas rotativas</label>
        </div>
        <div className="flex gap-2 text-sm">
          <label>Email: facturacion@institutocrear.edu.ar</label>
        </div>
        <div className="flex gap-2 text-sm">
          <label>IVA EXENTO</label>
        </div>
      </div>

      {/* COL B */}
      <div className="w-12 overflow-auto flex flex-col items-center">
        <div className="p-4 border w-12 h-16 relative font-bold text-xl flex items-center justify-center">
          C
        </div>
        {
          receiptType && (
            <div className="mt-2 flex flex-col items-center">
              <label style={{ fontSize: '14px' }}>Código</label>
              <span style={{ fontSize: '14px' }} className="text-center">{receiptType}</span>
            </div>
          )
        }
      </div>

      {/* COL C */}
      <div className="flex-1 border-r border-b border-t overflow-auto flex p-4 pb-8">
        <div>
          <div className="flex gap-2 text-sm">
            <label>CUIT: 30-64024169-8 ING BRUTOS: 785573-07</label>
          </div>
          <div className="flex gap-2 text-sm">
            <label>Subvencion estatal N Inicial y EGB: 80%</label>
          </div>
          <div className="flex gap-2 text-sm">
            <label>Subvencion estatal Post Primaria: 80%</label>
          </div>
          <div className="flex gap-2 text-sm">
            <label>Inicio de actividades: 01/07/1990</label>
          </div>
          <div className="flex gap-2 text-sm">
            <label className="font-bold">TE gratuito 147 CABA Defensa y protecc al</label>
          </div>
        </div>
      </div>
    </div>
  );
}

const InsuranceInfo = ({ insuranceInfo }) => {
  return (
    <div className="border w-full h-[180px] p-4 pb-8">
      <div className="flex gap-2">
        <label className="font-bold text-lg">{insuranceInfo?.plan}</label>
      </div>
      <div className="flex gap-2">
        <label className="text-lg">{insuranceInfo?.address}</label>
      </div>
      <div className="flex gap-2">
        <label className="text-lg">{insuranceInfo?.city}</label>
      </div>
      <div className="flex gap-2">
        <label>CUIT: {insuranceInfo?.cuit}</label>
      </div>
      <div className="flex gap-2">
        <label>Categoria: {insuranceInfo?.category}</label>
      </div>
      <div className="flex gap-2">
        <label>Cond de Venta: CONTADO</label>
      </div>
    </div>
  );
};

const ParentInfo = ({ student }) => {
  return (
    student.invoiceHolder.includes('1') ? (
      <div className="border w-full h-[180px] p-4 pb-8">
        <div className="flex gap-2">
          <label className="font-bold text-lg">{`${student.parents[0]?.name} ${student.parents[0]?.lastName}`}</label>
        </div>
        <div className="flex gap-2">
          <label className="text-lg">{student.parents[0]?.address}</label>
        </div>
        <div className="flex gap-2">
          <label className="text-lg">{student.parents[0]?.city}</label>
        </div>
        <div className="flex gap-2">
          <label>{student.parents[0]?.documentType}: {student.parents[0]?.documentNumber}</label>
        </div>
      </div>
    ) : (
      <div className="border w-full h-[180px] p-4 pb-8">
        <div className="flex gap-2">
        <label className="font-bold text-lg">{`${student.parents[1]?.name} ${student.parents[1]?.lastName}`}</label>
        </div>
        <div className="flex gap-2">
          <label className="text-lg">{student.parents[1]?.address}</label>
        </div>
        <div className="flex gap-2">
          <label className="text-lg">{student.parents[1]?.city}</label>
        </div>
        <div className="flex gap-2">
          <label>{student.parents[1]?.documentType}: {student.parents[1]?.documentNumber}</label>
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
        <label className="text-lg">DNI {student.documentNumber}</label>
      </div>
      <div className="flex gap-2">
        <label className="text-lg">Afiliado Nro {student.affiliateNumber}</label>
      </div>
    </div>
  );
}

function CreditNote() {
  const params = useParams();
  const [insuranceInfo, setInsuranceInfo] = useState(null);
  const [hasPrinted, setHasPrinted] = useState(false);
  let navigate = useNavigate();

  const API_URL = '/api/billings/' + params.invoiceId;
  const API_URL_INSURANCES = '/api/insurances';
  const API_URL_STUDENTS = '/api/students';

  const { data, error, isLoading, isValidating } = useSWR(API_URL, (url) => fetch(url).then(res => res.json()))
  const { data: dataInsurances, isLoading: isLoadingInsurances } = useSWR(API_URL_INSURANCES, (url) => fetch(url).then(res => res.json()))
  const { data: dataStudents, isLoading: isLoadingStudents } = useSWR(API_URL_STUDENTS, (url) => fetch(url).then(res => res.json()))

  const firstStudentOfInvoiceId = data?.students[0];
  const firstStudentOfInvoice = dataStudents?.find(student => student._id === firstStudentOfInvoiceId);
  const invoiceHolder = firstStudentOfInvoice?.invoiceHolder

  const cuit = "30-64024169-8";
  const sellPoint = 4
  const receiptType = data?.receiptType == 11 ? 13 : 213;
  let encodedJsonQrAfipInvoiceData;
  let afipInvoiceLink;
  const link2 = "https://www.afip.gob.ar/fe/qr/?p=";
  const creditNoteNumber = data?.creditNotes[0].creditNoteNumber;
  const createdDate = split(data?.creditNotes[0].creditNoteDate, "T")[0];

  if (invoiceHolder && dataInsurances && dataStudents && firstStudentOfInvoice) {

    let docRecepInfo = {}

    if (invoiceHolder === 'Obra Social') {
      const insurance = dataInsurances?.find(insurance => insurance._id === data.insurance)
      docRecepInfo = {
        tipoDocRec: +80,
        nroDocRec: +replace(insurance.cuit, /-/g, ""),
      }
    }

    if (invoiceHolder.includes('Padre') || invoiceHolder.includes('Madre')) {
      let docType = 0;
      docType = firstStudentOfInvoice.parents[0].documentType === 'DNI' && 96;
      docType = firstStudentOfInvoice.parents[0].documentType === 'CUIL' && 86;
      docType = firstStudentOfInvoice.parents[0].documentType === 'CUIT' && 80;
      const documentNumber = firstStudentOfInvoice.parents[0].documentNumber;

      docRecepInfo = {
        tipoDocRec: +docType,
        nroDocRec: +documentNumber,
      }
    }

    if (invoiceHolder.includes('Estudiante')) {
      docRecepInfo = {
        tipoDocRec: +96,
        nroDocRec: +firstStudentOfInvoice.documentNumber,
      }
    }

    if (data) {

      const cae = data.creditNotes[0].creditNoteCae;
      const amount = data.creditNotes[0].creditNoteAmount;

      const jsonQrAfipInvoiceDataB = {
        ver: 1,
        fecha: split(data.invoiceDate, "T")[0],
        cuit: +replace(cuit, /-/g, ""),
        ptoVta: +sellPoint,
        tipoCmp: +13,
        nroCmp: +split(creditNoteNumber, "-")[1],
        importe: +amount,
        moneda: "PES",
        ctz: 1,
        ...docRecepInfo,
        tipoCodAut: "E",
        codAut: +cae
      }

      encodedJsonQrAfipInvoiceData = base64_encode(JSON.stringify(jsonQrAfipInvoiceDataB));
      afipInvoiceLink = link2 + encodedJsonQrAfipInvoiceData

    }


  }

  if (error) console.log(error)

  const getInsuranceInfo = (insuranceId) => {
    setInsuranceInfo(dataInsurances?.find(insurance => insurance._id === insuranceId))
  }

  const onPrint = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: () => setHasPrinted(true),
  });

  const onClose = () => {
    window.close();
  }

  useEffect(() => {
    if (data && data.insurance) {
      getInsuranceInfo(data.insurance)
    }
  }, [data, dataInsurances])

  const printRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: () => setHasPrinted(true),
  });

  useEffect(() => {
    if (data && data.insurance) {
      getInsuranceInfo(data.insurance);
    }
  }, [data, dataInsurances]);

  useEffect(() => {
    if (params.route === 'print' && !hasPrinted) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [params.route, handlePrint, hasPrinted]);

  return (
    <div className="px-4 h-full  overflow-x-hidden overflow-y-auto" ref={printRef}>

      <div className="w-full flex justify-end items-end">
        {
          params.route === 'child' ?
            <Button variant="alternativeSecondary" className="ml-auto" onClick={() => onClose()}>Cerrar</Button>
            :
            <div className="ml-auto gap-2">
            <Button variant="alternative" className="mr-2 print:hidden" onClick={() => onPrint()}>Imrpimir</Button>
            <Button variant="alternativeSecondary" className="print:hidden" onClick={() => navigate(-1)}>Volver</Button>
            </div>
        }
      </div>

      {
        (isLoadingInsurances || isLoadingStudents || isLoading) && (
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
        data && dataStudents && insuranceInfo && (
          <div id="bill" className="my-4 min-w-[600px]">
            <div className="flex flex-col items-center justify-between max-w-[1200px] w-full  origin-top-left">
              <InvoiceHeader receiptType={receiptType} />

              <div className="flex items-center justify-between max-w-[1200px] w-full">
                {/* COL A */}
                {
                  invoiceHolder === 'Obra Social' ?
                    <InsuranceInfo insuranceInfo={insuranceInfo} />
                    : invoiceHolder.includes('Padre') || invoiceHolder.includes('Madre') ?
                      <ParentInfo student={firstStudentOfInvoice} />
                      : invoiceHolder.includes('Estudiante') ?
                        <StudentInfo student={firstStudentOfInvoice} />
                        : null
                }

                {/* COL B */}
                <div className="border-r border-b border-t w-full h-[180px] flex items-start p-4 pb-8">
                  <div>
                    <div className="flex gap-2">
                      <label>Nota de Credito: {creditNoteNumber}</label>
                    </div>
                    <div className="flex gap-2">
                      <label>Fecha de Emision {moment(createdDate).format('DD/MM/YYYY')}</label>
                    </div>
                    <div className="flex gap-2 bg-slate-300 border pr-8">
                      <label>Fecha de Vencimiento {moment(createdDate).format('DD/MM/YYYY')}</label>
                    </div>
                    <div className="flex gap-2">
                      <label>Total: - ${data.invoiceAmount}</label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border w-full h-18 p-4">
                <div className="flex gap-2 items-center">
                  <div className="flex gap-2">
                    <label className="font-bold">Periodos Facturados: </label>
                    <label>{getInvoicePeriods(data.periods)}</label>
                  </div>
                </div>
              </div>

              <div className="border w-full pl-4 bg-slate-300">
                <div className="flex gap-2 items-center">
                  <div className="flex gap-2">
                    <label className="font-bold">{insuranceInfo?.plan}</label>
                  </div>
                </div>
              </div>

              <div className="border w-full p-2">
                <div className="flex gap-2 items-center justify-between">
                  <div className="flex flex-col gap-2 p-4">
                    <label>Otros conceptos</label>
                  </div>
                  <div className="flex flex-col gap-2 p-4">
                    <div>-${data.invoiceAmount}</div>
                  </div>
                </div>
              </div>

              <div className="h-64 border-r border-l border-t w-full p-2">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 p-4">
                    <div className="h-full w-full whitespace-pre-line">
                      Nota de credito segun factura Nro {data.invoiceNumber}
                    </div>
                  </div>
                  <div className="p-4">
                    {
                      data.details && (
                        <>
                          <label className="font-bold">Observaciones: </label>
                          <label>{data.details}</label>
                        </>
                      )
                    }
                  </div>
                </div>
              </div>

              <div id="QRCode" className="flex border-r border-l border-b text-sm w-full px-4 justify-start">
                <div className="w-[100px] h-[100px] mb-2 cursor-pointer" onClick={() => { window.open(afipInvoiceLink, '_blank') }}>
                  <QRCode size={100} value={afipInvoiceLink} />
                </div>
              </div>

              <div className="flex border text-sm w-full px-4 justify-end">
                <div className="w-full py-4"></div>
                <div className="w-[250px] py-4 flex justify-end">
                  FACTURA: -${data.invoiceAmount}
                </div>
              </div>

              <div className="flex border text-sm w-full px-4">
                <div className="w-full p-4">
                  {/* <label className="italic">Son Pesos: {numberToLetter(data.invoiceAmount)}</label> */}
                </div>
                <div className="w-full py-4 flex justify-end">
                  <label className="">Total a pagar -${data.invoiceAmount}</label>
                </div>
              </div>

              <div className="flex border text-sm w-full px-4">
                <div className="flex text-sm w-full px-4">
                  <div className="w-full py-4 flex justify-start">
                    <label>CAE: {data.cae} Fecha de Vto del CAE: {moment(data.caeDueDate).format('DD/MM/YYYY')}</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}

export { CreditNote };
