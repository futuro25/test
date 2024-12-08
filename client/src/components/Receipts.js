import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import React, { useState, useRef, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR from 'swr'
import { useSWRConfig } from 'swr'
import { padStart, replace, upperCase } from 'lodash'
import { Input } from "./common/Input";
import Button from "./common/Button";
import Spinner from "./common/Spinner";
import { CloseIcon, EyeIcon, PrinterIcon, CreditNoteIcon, FileTextIcon } from "./icons";
import * as utils from '../utils/utils'
import { config } from '../config';
import ReceiptPreviewDialog from './receipts/ReceiptPreviewDialog';
import { useReactToPrint } from 'react-to-print';
import MiPymeError from '../utils/errors/miPymeError'

var moment = require('moment');


export default function Receipts() {

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isPathCreditNote = (location.pathname.indexOf('debito') !== -1)
  const showDebitNotes = searchParams.get('nd') || isPathCreditNote || false;

  //URLS
  const API_URL = '/api/receipts';
  const API_URL_STUDENTS = '/api/students';
  const API_URL_INVOICES_SEARCH = '/api/billings?not_status=CREDIT_NOTE_CREATED';
  const API_URL_ALL_INVOICES = '/api/billings';
  const API_URL_AFIP_RECEIPT = '/api/receiptAfip';
  const API_URL_INSURANCES = '/api/insurances';
  const API_URL_BANKS = '/api/banks';
  const API_URL_WITHHOLDING = '/api/withholdings';
  const API_URL_DEBIT_NOTE = '/api/debitNoteAfip';

  //REFS
  const formRef = useRef(null);
  const printRef = useRef(null);

  //HOOKS
  const { register, handleSubmit, control, reset, trigger, getValues, formState: { errors } } = useForm();
  const { mutate } = useSWRConfig()
  const navigate = useNavigate();

  const printReceipt = useReactToPrint({
    content: () => printRef.current,
  });

  //DATA
  const { data: dataReceipts, error, isLoading, isValidating } = useSWR(API_URL, (url) => fetch(url).then(res => res.json()))
  const { data: dataStudents } = useSWR(API_URL_STUDENTS, (url) => fetch(url).then(res => res.json()))
  const { data: dataInvoicesNotClosed } = useSWR(API_URL_INVOICES_SEARCH, (url) => fetch(url).then(res => res.json()))
  const { data: dataAllInvoices } = useSWR(API_URL_ALL_INVOICES, (url) => fetch(url).then(res => res.json()))
  const { data: dataInsurances } = useSWR(API_URL_INSURANCES, (url) => fetch(url).then(res => res.json()))
  const { data: dataBanks } = useSWR(API_URL_BANKS, (url) => fetch(url).then(res => res.json()))
  const { data: dataWithholdings } = useSWR(API_URL_WITHHOLDING, (url) => fetch(url).then(res => res.json()))

  const data = showDebitNotes ? dataReceipts?.filter(r => r.debitNotes.length) : dataReceipts?.filter(r => !r.debitNotes.length);

  //STATES
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [stage, setStage] = useState('LIST');
  const [showDebitNote, setShowDebitNote] = useState(false);


  const [search, setSearch] = useState('');
  const [studentsSearch, setStudentsSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  const [higherAmount, setHigherAmount] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [selectedInvoicePeriods, setSelectedInvoicePeriods] = useState([]);
  const [receiptsPreviews, setReceiptsPreviews] = useState([]);
  const [withholdings, setWithholdings] = useState([]);
  const [dataInvoiceFiltered, setDataInvoiceFiltered] = useState([]);

  const [showInvoicePeriods, setShowInvoicePeriods] = useState(false);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  const [periodValues, setPeriodValues] = useState({});
  const [isGroupReceipt, setIsGroupReceipt] = useState(false)
  const isAnyLoading = !data || !dataStudents || !dataInvoicesNotClosed || !dataAllInvoices || !dataInsurances || !dataBanks || !dataWithholdings;
  const [errorMessage, setErrorMessage] = useState('');
  const [showAlert, setShowAlert] = useState(true);

  if (errorMessage && showAlert) {
    window.alert(errorMessage);
    setErrorMessage('');
  }

  const isAdmin = () => {
    return sessionStorage.securityLevel === 'ADMIN';
  }

  async function onCreateDebitNote(receiptId) {
    const receipt = data.filter(r => r._id === receiptId)[0]
    if (window.confirm("¿Seguro desea crear una nota de debito para el recibo " + receipt.receiptNumber + "?")) {
      const invoice = dataAllInvoices?.find(i => receipt.invoice.some(id => i._id === id));
      const student = dataStudents.filter(s => s._id === invoice.students[0])[0]

      const docInfo = getDocInfo(student)

      const debitNoteBody = {
        relatedReceipt: {
          type: config.receipt.receiptType,
          sellPoint: config.receipt.sellPoint,
          number: receipt.receiptNumber
        },
        receiptType: config.debitNote.receiptType,
        sellPoint: config.debitNote.sellPoint,
        concept: config.debitNote.concept,
        cuit: config.debitNote.cuit,
        amount: receipt.amount,
        docInfo: docInfo,
      };

      const afipDebitNote = await utils.postRequest(`${API_URL_DEBIT_NOTE}`, debitNoteBody)

      if (afipDebitNote.data.FeDetResp.FECAEDetResponse[0].CAE) {
        const debitNote = afipDebitNote.data.FeDetResp.FECAEDetResponse[0];

        const debitNoteReceipt = {
          debitNotes: [{
            debitNoteNumber: padStart(config.receipt.sellPoint, 4, '0') + "-" + padStart(debitNote.CbteDesde, 8, '0'),
            debitNoteAmount: receipt.amount,
            debitNoteDate: new Date(),
            debitNoteCae: debitNote.CAE,
          }]
        }

        await utils.putRequest(`${API_URL}/${receipt._id}/debitNote`, debitNoteReceipt);
        await mutate(API_URL, await fetch(API_URL).then((res) => res.json()), { optimisticData: true });
        await reloadInvoicesData()

        window.alert("Nota de debito creada exitosamente.");
      }
    }
  }

  const onViewDebitNote = (receiptId) => {
    // navigate("/nota-de-debito/" + receiptId);
    console.log('navigate to debit note')

    const receipt = data.find(receipt => receipt._id === receiptId) || null;
    setSelectedReceipt(receipt);
    setShowDebitNote(true)
    setStage('VIEW')

    if (window.onresize) window.onresize()
  }

  //FILTERED DATA
  useEffect(() => {
    if (!isLoading && dataInvoicesNotClosed) {
      const filteredData = dataInvoicesNotClosed.filter(invoice =>
        (!invoiceSearch || invoice.invoiceNumber.includes(invoiceSearch)) &&
        !invoice.paidInFull &&
        invoice.status !== 'CLOSED'
      );
      setDataInvoiceFiltered(filteredData);
    }
  }, [dataInvoicesNotClosed, invoiceSearch, isLoading]);

  const dataStudentsFiltered = dataStudents?.filter(student =>
    (!dataInvoiceFiltered || dataInvoiceFiltered.some(invoice => invoice.students.includes(student._id))) &&
    (!studentsSearch ||
      student.name.toLowerCase().includes(studentsSearch.toLowerCase()) ||
      student.lastName.toLowerCase().includes(studentsSearch.toLowerCase()) ||
      student.healthInsuranceName.toLowerCase().includes(studentsSearch.toLowerCase())
    )
  ) || [];

  const dataSearch = data?.filter(d => search ? (d.receiptNumber?.includes(search) || moment(d.createdAt).format("DD/MM/YYYY").includes(search)) : true);

  if (error) console.log(error)

  // NAVIGATION

  const onStudentsSelection = () => {
    setStage('SELECT_STUDENTS')
  }

  const onInvoiceSelection = () => {
    setStage('SELECT_INVOICE')
  }

  const onCreateReceipt = () => {
    setSelectedReceipt(null);
    setStage('CREATE')
  }

  const onCancel = async () => {
    await reloadInvoicesData()
    resetStates()
    setStage('LIST')
  }

  const onView = (receiptId, callback) => {
    const receipt = data.find(receipt => receipt._id === receiptId) || null;
    setSelectedReceipt(receipt);
    setStage('VIEW')
    if (callback) callback()
    if (window.onresize) window.onresize()
  }

  const onViewInvoices = (invoiceIds) => {
    invoiceIds.forEach(invoiceId => {
      window.open("/factura/" + invoiceId + '/child', '_blank');
    });
  };

  const goBack = async () => {
    if (stage === 'SELECT_STUDENTS') {
      setSelectedStudents([]);
      setStage('LIST');
    } else if (stage === 'SELECT_INVOICE') {
      await reloadInvoicesData()
      resetInvoiceStates()
      setStage('SELECT_STUDENTS');
    } else if (stage === 'CREATE') {
      setReceiptsPreviews([]);
      setIsGroupReceipt(false)
      setWithholdings([]);
      setStage('SELECT_INVOICE');
    }
    reset()
  }

  const onPrint = (receiptId) => {
    onView(receiptId, () => {
      setTimeout(() => {
        printReceipt();
      }, 500);
    });
  };

  const handleFormSubmit = () => {
    if (formRef.current) {
      formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  const onSubmit = async (formData) => {
    try {
      await buildReceiptsPreviews(formData)
      setIsConfirmationDialogOpen(true);
    } catch (e) {
      console.log(e);
    }
  }

  const confirmOnSubmit = async () => {
    const formData = receiptsPreviews[0].formData;
    if ((formData.paymentMethod === 'Cheque' || formData.paymentMethod === 'Transferencia') && !formData.bankName) {
      window.alert('Debe ingresar el nombre del banco');
      return;
    }

    try {
      setIsLoadingSubmit(true);

      const processPreview = async (preview) => {
        const amount = utils.formatPrice(parseFloat(preview.amount));
        const afipReceipt = await createAfipReceipt(amount, preview);
        const receiptNumber = padStart(config.receipt.sellPoint, 4, '0') + "-" + padStart(afipReceipt.data.FeDetResp.FECAEDetResponse[0].CbteDesde, 8, '0');

        return {
          receiptNumber: receiptNumber,
          amount: amount,
          bankName: formData.bankName?.toUpperCase() || '',
          paymentMethod: formData.paymentMethod,
          cae: afipReceipt.data.FeDetResp.FECAEDetResponse[0].CAE,
          invoice: Array.isArray(preview.invoice) ? preview.invoice : [preview.invoice._id],
          invoicedPeriods: preview.periods.map(period => ({ periodId: period._id, amount: period.price, student: period.student })),
          itemsDetail: preview.itemsDetail,
          detail: formData.detail,
          withholdings: preview.withholdings
        };
      };

      const receiptsToCreate = [];

      if (isGroupReceipt) {
        const combinedPreview = {
          ...receiptsPreviews[0],
          itemsDetail: receiptsPreviews.map(preview => preview.itemsDetail).join('\n\n')
        };
        receiptsToCreate.push(await processPreview(combinedPreview));
      } else {
        for (const preview of receiptsPreviews) {
          receiptsToCreate.push(await processPreview(preview));
        }
      }

      await utils.postRequest(API_URL, receiptsToCreate);
      await mutate(API_URL, await fetch(API_URL).then((res) => res.json()), { optimisticData: true });
      await reloadInvoicesData();

      resetStates();
      setStage('LIST');
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  // VALIDATIONS

  const validateStudentsSelection = () => {
    if (selectedStudents.length === 0) {
      window.alert('Debe seleccionar al menos un alumno');
      return;
    }

    const selectedStudentsData = selectedStudents.map(s => dataStudents.find(student => student._id === s));

    const insurances = new Set(selectedStudentsData.map(student => student?.healthInsurance));
    if (insurances.size > 1) {
      window.alert('Debe seleccionar alumnos con la misma obra social');
      return;
    }

    onInvoiceSelection()
  }

  const validateInvoiceSelection = () => {
    if (selectedInvoices.length === 0) {
      window.alert('Debe seleccionar al menos una factura');
      return;
    }

    if (!selectedInvoicePeriods || selectedInvoicePeriods.length === 0) {
      window.alert('Debe seleccionar al menos un período');
      return;
    }

    if (higherAmount) {
      window.alert('Verifique el importe del recibo a crear');
      return;
    }

    onCreateReceipt()
  }

  // UTILS

  const resetStates = () => {
    setSelectedStudents([]);
    resetInvoiceStates()
    setSelectedReceipt(null);
    setReceiptsPreviews([]);
    setIsGroupReceipt(false)
    setViewOnly(false)
    setIsLoadingSubmit(false)
    setIsConfirmationDialogOpen(false)
    reset()
  }

  const resetInvoiceStates = () => {
    setSelectedInvoices([]);
    setSelectedInvoicePeriods([]);
    setShowInvoicePeriods(false);
    setWithholdings([]);
    setPeriodValues({});
  }

  const changeSelectedStudents = (e) => {
    if (e.target.checked) {
      setSelectedStudents([...selectedStudents, e.target.value]);
    } else {
      setSelectedStudents(selectedStudents.filter(student => student !== e.target.value))
    }
  }

  const changeSelectedInvoices = (e) => {
    const invoiceId = e.target.value;
    if (e.target.checked) {
      setSelectedInvoices([...selectedInvoices, invoiceId]);
      setShowInvoicePeriods(true);
    } else {
      setSelectedInvoices(selectedInvoices.filter(item => item !== invoiceId));
      setShowInvoicePeriods(selectedInvoices.length > 1);
      setSelectedInvoicePeriods([]);
    }
  };

  const changeSelectedPeriods = (e, periods) => {
    const selectedItem = e.target.value;
    if (e.target.checked) {
      setSelectedInvoicePeriods([...selectedInvoicePeriods, selectedItem]);
      setPeriodValues({
        ...periodValues,
        [selectedItem]: getInvoicedPeriodReceiptsAmountLeft(periods.find(p => p._id === selectedItem))
      });
    } else {
      setSelectedInvoicePeriods(selectedInvoicePeriods.filter(item => item !== selectedItem));
      const updatedPeriodValues = { ...periodValues };
      delete updatedPeriodValues[selectedItem];
      setPeriodValues(updatedPeriodValues);
    }
  };

  const updateSelectedPeriodPrice = (e, invoice, period) => {
    const price = parseFloat(e.target.value);

    if (price > getInvoicedPeriodReceiptsAmountLeft(period)) {
      setHigherAmount(true)
      window.alert(`El valor ingresado en el periodo "${getPeriodInfo(period)}" es mayor al precio restante a facturar en el período`);
    } else {
      setHigherAmount(false)
      setPeriodValues({ ...periodValues, [period._id]: price });
    }
  };

  const setAllStudentsSelected = () => {
    setSelectedStudents(dataStudentsFiltered.map(s => s._id));
  }

  const setAllStudentsUnselected = () => {
    setSelectedStudents([]);
  }

  const getPeriodInfo = (period) => {
    return `${getPeriodStudent(period)} - ${period.name}`
  }

  const getInvoicedPeriodReceiptsAmount = (period) => {
    if (period.receipts.length === 0) {
      return 0;
    }

    const receiptsAmount = calculatePeriodReceiptsAmount(period);
    return receiptsAmount || 0;
  }

  const getInvoicedPeriodReceiptsAmountLeft = (period) => {
    if (period.receipts.length === 0) {
      return period.price;
    }

    const receiptsAmount = calculatePeriodReceiptsAmount(period);
    const totalLeft = parseFloat(period.price - receiptsAmount).toFixed(2);
    return receiptsAmount >= period.price ? 0 : totalLeft;
  };

  const calculatePeriodReceiptsAmount = (period) => {
    return period.receipts.reduce((total, receiptId) => {
      const receipt = data.find(r => r._id === receiptId);
      if (!receipt) return total;

      const useStudentField = receipt.invoicedPeriods?.some(p => p.student !== undefined);

      const amount = receipt.invoicedPeriods
        ?.filter(p => p.periodId === period._id && (!useStudentField || p.student === period.student))
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      return total + (amount || 0);
    }, 0);
  };

  const getPeriodStudent = (period) => {
    const student = dataStudents.find(student => student._id === period.student);
    return `${student?.name} ${student?.lastName}`;
  }

  const buildReceiptsPreviews = async (formData) => {
    const selectedInvoicesData = dataInvoicesNotClosed?.filter(invoice => selectedInvoices?.includes(invoice._id));
    const docInfo = getDocInfo(dataStudents.find(student => student._id === selectedInvoicesData[0].students[0]));

    const calculatePeriodsData = (invoice) =>
      invoice.periods
        .filter(period => selectedInvoicePeriods?.includes(period._id))
        .map(period => ({ ...period, price: periodValues[period._id] ?? period.price, student: period.student }));

    const calculateAmount = (periods) =>
      parseFloat(periods.reduce((total, period) => total + parseFloat(period.price || 0), 0)).toFixed(2);

    const withholdingsTotalAmount = withholdings.reduce((total, withholding) => total + parseFloat(withholding.amount), 0);

    const previews = isGroupReceipt ? [{
      invoice: selectedInvoicesData,
      periods: selectedInvoicesData.flatMap(calculatePeriodsData),
      amount: calculateAmount(selectedInvoicesData.flatMap(calculatePeriodsData)),
      withholdingsTotalAmount: withholdingsTotalAmount,
      amountWithoutWithholdings: (calculateAmount(selectedInvoicesData.flatMap(calculatePeriodsData)) - withholdingsTotalAmount).toFixed(2)
    }] : selectedInvoicesData.map(invoice => {
      const periods = calculatePeriodsData(invoice);
      const amount = calculateAmount(periods);
      return {
        invoice: [invoice],
        periods: periods,
        amount: amount,
        withholdingsTotalAmount: withholdingsTotalAmount,
        amountWithoutWithholdings: (amount - withholdingsTotalAmount).toFixed(2)
      };
    });

    setReceiptsPreviews(previews.map(preview => ({
      ...preview,
      docInfo: docInfo,
      withholdings: withholdings,
      formData: formData,
      isGroupReceipt: isGroupReceipt
    })));
  };

  const isBankNameVisible = () => {
    const currentPaymentMethod = getValues('paymentMethod')
    return currentPaymentMethod && currentPaymentMethod !== 'Efectivo';
  };

  const getInvoicePeriodsLeft = (invoice) => {
    return invoice?.periods?.filter(period => period.receipts.length === 0 || getInvoicedPeriodReceiptsAmountLeft(period) > 0) || [];
  }

  const getInvoicePeriodsLeftCount = (invoice) => {
    return `${getInvoicePeriodsLeft(invoice).length} / ${invoice.periods.length}`;
  }

  const calculateInvoiceAmountLeft = (invoice) => {
    const total = getInvoicePeriodsLeft(invoice).reduce((total, period) => total + parseFloat(getInvoicedPeriodReceiptsAmountLeft(period) || 0), 0);
    return parseFloat(total.toFixed(2));
  };

  const getDocInfo = (student) => {
    if (student.invoiceHolder === 'Obra Social') {
      const cuit = dataInsurances.find(i => i._id === student.healthInsurance).cuit
      return {
        DocTipo: 80,
        DocNro: replace(cuit, /-/g, ""),
      }
    }

    if (student.invoiceHolder === 'Estudiante') {
      return {
        DocTipo: 96,
        DocNro: replace(student.documentNumber, /-/g, ""),
      }
    }

    const parentDocumentNumber = student.parents.find(parent => parent.documentNumber)?.documentNumber
    if (student.invoiceHolder.includes('Padre') && parentDocumentNumber) {
      return {
        DocTipo: 96,
        DocNro: replace(parentDocumentNumber, /-/g, ""),
      }
    }

    return {
      DocTipo: 99,
      DocNro: 0
    }
  }

  const getInvoicesNumbers = (invoiceIds) => {
    return invoiceIds
      .map(id => getInvoice(id)?.invoiceNumber)
      .join(', ');
  };

  const getInvoice = (invoiceId) => {
    return dataAllInvoices?.find(invoice => invoice._id === invoiceId) || {};
  };

  const handleWithholdingChange = (name, amount) => {
    setWithholdings(prevWithholdings => {
      const updatedWithholdings = prevWithholdings.filter(withholding => withholding.name !== name);
      if (amount !== '' && amount !== '0') {
        updatedWithholdings.push({ name, amount: parseFloat(amount) });
      }
      return updatedWithholdings;
    });
  };

  const reloadInvoicesData = async () => {
    await mutate(API_URL_ALL_INVOICES, await fetch(API_URL_ALL_INVOICES).then((res) => res.json()), { optimisticData: true });
    await mutate(API_URL_INVOICES_SEARCH, await fetch(API_URL_INVOICES_SEARCH).then((res) => res.json()), { optimisticData: true });
  }

  async function createAfipReceipt(formattedAmount, receiptPreview) {
    const afipReceiptBody = {
      receiptType: config.receipt.receiptType,
      sellPoint: config.receipt.sellPoint,
      concept: config.receipt.concept,
      cuit: config.receipt.cuit,
      amount: formattedAmount,  // recibido + retenciones
      docInfo: receiptPreview.docInfo
    };
    try {
      const afipReceipt = await mutate(API_URL_AFIP_RECEIPT, utils.postRequest(API_URL_AFIP_RECEIPT, afipReceiptBody), { optimisticData: true });
      validateAfipResponse(afipReceipt);

      afipReceipt.receiptType = config.receipt.receiptType;
      return afipReceipt;
    } catch (error) {
      if (error instanceof MiPymeError) {
        const updatedReceiptBody = {
          ...afipReceiptBody,
          receiptType: config.receipt.miPyMEReceiptType,
          Opcionales: [
            {
              Opcional: {
                Id: 2101,
                Valor: "0290020900000000177128"
              }
            },
            {
              Opcional: {
                Id: 27,
                Valor: "SCA"
              }
            }
          ]
        }
        const afipReceipt = await createMiPymeReceipt(updatedReceiptBody);

        const updatedAfipReceipt = {
          ...afipReceipt,
          receiptType: config.receipt.miPyMEReceiptType,
        }

        return updatedAfipReceipt;
      } else {
        throw error;
      }
    }
  }

  function validateAfipResponse(afipReceipt) {
    const response = afipReceipt.data.FeDetResp.FECAEDetResponse[0];
    validateMiPyMeError(response);

    if (response.Resultado === 'R' || response.CAE === '' || response.CAEFchVto === '') {
      const msg = `Error al generar el recibo en AFIP: \n\n${response.Observaciones.Obs[0].Msg}`;
      throw new Error(msg);
    }
  }

  function validateMiPyMeError(response) {
    if (response.Resultado === 'R' && response.Observaciones && response.Observaciones.Obs) {
      const miPymeError = response.Observaciones.Obs.find(obs => obs.Code === 10192 || obs.Code === 1485)
      if (miPymeError) {
        const msg = `Error al generar la factura en AFIP: \n\nSupera el monto permitido. \n\n${miPymeError.Msg}`;
        setErrorMessage(msg);
        throw new MiPymeError(msg);
      }
    }
  }

  async function createMiPymeReceipt(receiptBody) {
    console.log('Retrying with different receipt type due to MiPyME error...');

    const afipReceipt = await mutate(API_URL_AFIP_RECEIPT, utils.postRequest(API_URL_AFIP_RECEIPT, receiptBody), { optimisticData: true });
    validateAfipResponse(afipReceipt);
    return afipReceipt;
  }

  const formatCurrency = (value) => {
    return value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const totalRecibido = data?.reduce((total, receipt) => total + parseFloat(receipt.amount), 0);
  const totalDocumentos = data?.length;

  return (
    <div className="h-full overflow-x-hidden overflow-y-auto">
      <div className="w-full flex flex-wrap sticky top-0 z-10 bg-white shadow px-4 pb-4">
        {
          !isConfirmationDialogOpen && (
            <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight print:hidden">
              {
                showDebitNotes ? "Notas de débito" : "Recibos"
              }
            </h1>
          )
        }
        {
          stage === 'LIST' && (
            <Button variant="alternative" className="ml-auto" onClick={() => onStudentsSelection()}>Crear nuevo recibo</Button>
          )
        }
        {
          stage === 'SELECT_STUDENTS' && (
            <div className="ml-auto gap-2 flex">
              <Button variant="destructive" onClick={() => onCancel()}>Cancelar</Button>
              <Button onClick={() => validateStudentsSelection()}>Continuar</Button>
            </div>
          )
        }
        {
          stage === 'SELECT_INVOICE' && (
            <div className="ml-auto gap-2 flex">
              <Button variant="destructive" onClick={() => onCancel()}>Cancelar</Button>
              <Button variant="alternative" onClick={() => goBack()}>Volver a seleccion de estudiantes</Button>
              <Button onClick={() => validateInvoiceSelection()}>Continuar</Button>
            </div>
          )
        }
        {
          stage === 'CREATE' && !isConfirmationDialogOpen && (
            <div className="ml-auto gap-2 flex">
              <Button variant="destructive" onClick={() => onCancel()}>Cancelar</Button>
              <Button variant="alternative" onClick={() => goBack()}>Volver a seleccion de facturas</Button>
              <Button type="button" onClick={handleFormSubmit} disabled={isLoadingSubmit}>{isLoadingSubmit ? 'Generando modelo...' : 'Ver modelo'}</Button>
            </div>
          )
        }
      </div>
      {
        (isAnyLoading) && (
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
        stage === 'LIST' && data && dataAllInvoices && (
          <div className="mt-4 mb-28 px-4">
            {
              !viewOnly && (
                <div className="flex bg-white rounded pb-4 px-4">
                  <Input
                    onKeyDown={utils.handleKeyPress}
                    rightElement={(
                      <div className="cursor-pointer" onClick={() => setSearch('')}>
                        {search && <CloseIcon />}
                      </div>
                    )}
                    type="text"
                    value={search}
                    name="search"
                    id="search"
                    placeholder="Buscador..."
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              )
            }
            {
              showDebitNotes ?
                <div className="flex">
                  <p className="pl-1 pb-1 text-slate-500">Total de Notas de Debito {totalDocumentos}</p>
                  <p className="pl-1 pb-1 text-slate-500">Importe: ${formatCurrency(totalRecibido)}</p>
                </div>

                :
                <div className="flex">
                  <p className="pl-1 pb-1 text-slate-500">Total de recibos {totalDocumentos}</p>
                  <p className="pl-1 pb-1 text-slate-500">Importe: ${formatCurrency(totalRecibido)}</p>
                </div>

            }

            <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden ">
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] " style={{ "backgroundPosition": "10px 10px" }}></div>
              <div className="relative rounded-xl overflow-auto">
                <div className="shadow-sm overflow-auto my-8">
                  <table className="border-collapse table-auto w-full text-sm g">
                    <thead>
                      <tr>
                        <th className="border-b font-medium p-4 pt-0 pb-3 text-slate-400 text-left w-4">#</th>
                        <th className="border-b font-medium p-4 pt-0 pb-3 text-slate-400 text-left">Nro Recibo</th>
                        <th className="border-b font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-left">Nro Factura</th>
                        <th className="border-b font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-left">Fecha</th>
                        <th className="border-b font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-left">Importe</th>
                        <th className="border-b font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-left">Forma de Pago</th>
                        <th className="border-b font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-left truncate">Banco</th>
                        <th className="border-b font-medium p-4 pr-8 pt-0 pb-3 text-slate-400 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {
                        dataSearch.length ?
                          dataSearch.map((receipt, index) => (
                            <tr key={receipt._id} className={utils.cn('border-b last:border-b-0 hover:bg-gray-100', (index % 2 === 0) && 'bg-gray-50')}>
                              <td className="border-b !text-xs border-slate-100 whitespace-nowrap p-4 text-slate-500 ">{index + 1}</td>
                              <td className="border-b !text-xs border-slate-100 whitespace-nowrap p-4 text-slate-500 ">{receipt.receiptNumber}</td>
                              <td className="border-b !text-xs border-slate-100 whitespace-nowrap p-4 text-slate-500 max-w-[180px] overflow-hidden" style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getInvoicesNumbers(receipt.invoice)}</td>
                              <td className="border-b !text-xs border-slate-100 whitespace-nowrap p-4 pr-8 text-slate-500 ">{moment(receipt.createdAt).format("DD/MM/YYYY")}</td>
                              <td className="border-b !text-xs border-slate-100 whitespace-nowrap p-4 pr-8 text-slate-500 ">${receipt.amount}</td>
                              <td className="border-b !text-xs border-slate-100 whitespace-nowrap p-4 pr-8 text-slate-500 ">{receipt.paymentMethod}</td>
                              <td className="border-b !text-xs border-slate-100 whitespace-nowrap p-4 pr-8 text-slate-500 overflow-hidden" style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{receipt.bankName}</td>
                              <td className="border-b border-slate-100 text-slate-500 w-10">
                                <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                  <button className="flex items-center justify-center w-8 h-8" title="Ver factura" onClick={() => onViewInvoices(receipt.invoice)}><FileTextIcon /></button>
                                  <button className="flex items-center justify-center w-8 h-8" title="Ver recibo" onClick={() => onView(receipt._id)}><EyeIcon /></button>
                                  <button className="flex items-center justify-center w-8 h-8" title="Imprimir" onClick={() => onPrint(receipt._id)}><PrinterIcon /></button>
                                  {
                                    <>
                                      <>
                                        {
                                          !receipt.debitNotes[0]?.debitNoteCae && (
                                            <button className="flex items-center justify-center w-8 h-8" title="Crear nota de debito" onClick={() => onCreateDebitNote(receipt._id)}><CreditNoteIcon /></button>
                                          )
                                        }
                                      </>
                                      {
                                        !!receipt.debitNotes?.length && (
                                          <>
                                            {
                                              !!receipt.debitNotes[0]?.debitNoteCae ?
                                                <button className="flex items-center justify-center w-8 h-8" title="Ver nota de debito" onClick={() => onViewDebitNote(receipt._id)}><>ND</></button>
                                                :
                                                <div className="flex items-center justify-center w-8 h-8">- -</div>
                                            }
                                          </>
                                        )
                                      }
                                    </>
                                  }
                                </div>
                              </td>
                            </tr>
                          ))
                          :
                          (
                            <tr>
                              <td colSpan={8} className="border-b border-slate-100 w-full p-4 pl-8 text-slate-500">Sin registros</td>
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
        stage === 'SELECT_STUDENTS' && (
          <div className="mt-4 -mb-3 gap-2 px-4">
            <div className="w-full flex-wrap bg-white rounded pb-4 border-b">
              <Input
                onKeyDown={utils.handleKeyPress}
                rightElement={(
                  <div className="cursor-pointer" onClick={() => setStudentsSearch('')}>
                    {studentsSearch && <CloseIcon />}
                  </div>
                )}
                type="text"
                value={studentsSearch}
                name="studentsSearch"
                id="studentsSearch"
                placeholder="Filtrar por Nombre / Apellido / Obra Social de estudiante"
                onChange={(e) => setStudentsSearch(e.target.value)}
              />
              <div className="flex gap-2 ml-2 mt-3">
                <Button variant="outlined" onClick={() => setAllStudentsUnselected()}>Deseleccionar todos</Button>
                <Button variant="outlined" onClick={() => setAllStudentsSelected()}>Seleccionar todos</Button>
              </div>
            </div>
            <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden ">
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] " style={{ "backgroundPosition": "10px 10px" }}></div>
              <div className="relative rounded-xl overflow-auto">
                <div className="shadow-sm overflow-auto my-8">
                  <table className="border-collapse table-auto w-full text-sm">
                    <thead>
                      <tr>
                        <th scope="col" className="border-b font-medium text-slate-400 pt-0 px-6 py-4 text-left">Nombre</th>
                        <th scope="col" className="border-b font-medium text-slate-400 pt-0 px-6 py-4 text-left">Obra Social</th>
                        <th scope="col" className="border-b font-medium text-slate-400 pt-0 px-6 py-4 text-left">Seleccionar</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {
                        dataStudentsFiltered.length ?
                          dataStudentsFiltered.map((student) => (
                            <tr className="border-b last:border-b-0" key={student._id}>
                              <td className="whitespace-nowrap px-6 py-4">{`${student.name} ${student.lastName}`}</td>
                              <td className="whitespace-nowrap px-6 py-4">{student.healthInsuranceName}</td>
                              <td className="whitespace-nowrap px-6 py-4">
                                <input type="checkbox" value={student._id} onChange={changeSelectedStudents} checked={selectedStudents.includes(student._id)} />
                              </td>
                            </tr>
                          )) : (
                            <tr className="border-b last:border-b-0 ">
                              <td colSpan={5} className="whitespace-nowrap px-6 py-4 font-medium">Sin registros</td>
                            </tr>
                          )
                      }
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl "></div>
            </div>
            <div>
              <div className="flex gap-2 justify-center items-center p-4">
                <Button variant="destructive" onClick={() => onCancel()}>Cancelar</Button>
                <Button onClick={() => validateStudentsSelection()}>Continuar</Button>
              </div>
            </div>
          </div>
        )
      }

      {
        stage === 'SELECT_INVOICE' && (
          <div className="mt-4 -mb-3 px-4">
            <div className="w-full flex bg-white rounded pb-4 border-b">
              <Input
                onKeyDown={utils.handleKeyPress}
                rightElement={(
                  <div className="cursor-pointer" onClick={() => setInvoiceSearch('')}>
                    {invoiceSearch && <CloseIcon />}
                  </div>
                )}
                type="text"
                value={invoiceSearch}
                name="invoiceSearch"
                id="invoiceSearch"
                placeholder="Filtrar por nro de factura"
                onChange={(e) => setInvoiceSearch(e.target.value)}
              />
            </div>
            <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden ">
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] " style={{ "backgroundPosition": "10px 10px" }}></div>
              <div className="relative rounded-xl overflow-auto">
                <div className="shadow-sm overflow-auto my-8">
                  <table className="border-collapse table-auto w-full text-sm">
                    <thead>
                      <tr>
                        <th scope="col" className="border-b font-medium text-slate-400 pt-0 px-6 py-4 text-left">Nro de factura</th>
                        <th scope="col" className="border-b font-medium text-slate-400 pt-0 px-6 py-4 text-left">¿Factura grupal?</th>
                        <th scope="col" className="border-b font-medium text-slate-400 pt-0 px-6 py-4 text-left">Importe</th>
                        <th scope="col" className="border-b font-medium text-slate-400 pt-0 px-6 py-4 text-left">Importe restante</th>
                        <th scope="col" className="border-b font-medium text-slate-400 pt-0 px-6 py-4 text-left">Periodos restantes</th>
                        <th scope="col" className="border-b font-medium text-slate-400 pt-0 px-6 py-4 text-left">Seleccionar factura</th>
                        <th scope="col" className="border-b font-medium text-slate-400 pt-0 px-6 py-4 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {dataInvoiceFiltered.length ? (
                        dataInvoiceFiltered.filter((invoice) => invoice.students.some((student) => selectedStudents.includes(student)))
                          .map((invoice) => (
                            <React.Fragment key={invoice._id}>
                              <tr className="border-b last:border-b-0">
                                <td className="whitespace-nowrap px-6 py-4">{invoice.invoiceNumber}</td>
                                <td className="whitespace-nowrap px-6 py-4">{invoice.isGroupInvoice ? 'Si' : 'No'}</td>
                                <td className="whitespace-nowrap px-6 py-4">${invoice.invoiceAmount}</td>
                                <td className="whitespace-nowrap px-6 py-4">${calculateInvoiceAmountLeft(invoice)}</td>
                                <td className="whitespace-nowrap px-6 py-4">{getInvoicePeriodsLeftCount(invoice)}</td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  <input
                                    type="checkbox"
                                    value={invoice._id}
                                    onChange={(e) => changeSelectedInvoices(e)}
                                    checked={selectedInvoices.includes(invoice._id)}
                                  />
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  <div className="flex items-center justify-center w-8 h-8 gap-2">
                                    <button title="Ver detalle" onClick={() => onViewInvoices([invoice._id])}>
                                      <EyeIcon />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {showInvoicePeriods && selectedInvoices.includes(invoice._id) && (
                                <tr>
                                  <td colSpan="7" className="p-2 bg-gray-300">
                                    <table className="border-collapse w-full text-sm border border-gray-300 p-1">
                                      <thead>
                                        <tr className="bg-gray-50">
                                          <th className="border-b font-medium text-slate-400 pl-12 px-6 py-4 text-left">#</th>
                                          <th colSpan="2" className="border-b font-medium text-slate-400 px-6 py-4 text-left">Descripción</th>
                                          <th className="border-b font-medium text-slate-400 pl-12 px-6 py-4 text-left">Recibos emitidos</th>
                                          <th className="border-b font-medium text-slate-400 px-6 py-4 text-left">Restante</th>
                                          <th className="border-b font-medium text-slate-400 px-6 py-4 text-left">Seleccionar período</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white">
                                        {invoice.periods.map((period, index) => (
                                          <tr key={period._id} className="border-b last:border-b-0">
                                            <td className="whitespace-nowrap pl-12 px-6 py-4">{index + 1}</td>
                                            <td colSpan="2" className="whitespace-nowrap px-6 py-4">{getPeriodInfo(period)}</td>
                                            <td className="whitespace-nowrap pl-12 px-6 py-4">${getInvoicedPeriodReceiptsAmount(period)}</td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                              <input
                                                className="rounded border border-slate-200 text-slate-500 p-2"
                                                onKeyDown={utils.handleKeyPress}
                                                type="text"
                                                value={periodValues[period._id] || getInvoicedPeriodReceiptsAmountLeft(period)}
                                                onChange={(e) => setPeriodValues({
                                                  ...periodValues,
                                                  [period._id]: e.target.value
                                                })}
                                                onBlur={(e) => updateSelectedPeriodPrice(e, invoice, period)}
                                                disabled={getInvoicedPeriodReceiptsAmountLeft(period) === 0 || !selectedInvoicePeriods.includes(period._id)}
                                              />
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                              <input
                                                type="checkbox"
                                                value={period._id}
                                                onChange={(e) => changeSelectedPeriods(e, invoice.periods)}
                                                checked={selectedInvoicePeriods.includes(period._id)}
                                                disabled={getInvoicedPeriodReceiptsAmountLeft(period) === 0}
                                              />
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))
                      ) : (
                        <tr className="border-b last:border-b-0 ">
                          <td colSpan={4} className="whitespace-nowrap px-6 py-4 font-medium">Sin registros</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl "></div>
            </div>
            <div>
              <div className="flex gap-2 justify-center items-center p-4">
                <Button variant="destructive" onClick={() => onCancel()}>Cancelar</Button>
                <Button variant="alternative" onClick={() => goBack()}>Volver a seleccion de estudiantes</Button>
                <Button onClick={() => validateInvoiceSelection()}>Continuar</Button>
              </div>
            </div>
          </div>
        )
      }

      {
        stage === 'CREATE' && (
          <div className="mt-4 -mb-3 px-4">
            {
              isConfirmationDialogOpen && (
                <ReceiptPreviewDialog
                  onClose={() => setIsConfirmationDialogOpen(false)}
                  receiptPreviews={receiptsPreviews}
                  isGroupReceipt={isGroupReceipt}
                  isLoadingSubmit={isLoadingSubmit}
                  confirmOnSubmit={confirmOnSubmit}
                />
              ) || (
                <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden ">
                  <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] " style={{ "backgroundPosition": "10px 10px" }}></div>
                  <div className="relative rounded-xl overflow-auto">
                    <div className="shadow-sm overflow-hidden my-8">
                      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col'>
                        <table className="border-collapse table-fixed w-full text-sm bg-white">
                          <tbody>
                            {/* ================ */}

                            <tr>
                              <td>
                                <div className="p-4 gap-4 flex items-center">
                                  <label className="text-slate-500 w-20 font-bold">Tipo de Recibo:</label>

                                  <div className="flex gap-4">
                                    <label className="flex items-center">
                                      <input
                                        type="radio"
                                        name="receiptType"
                                        value="individual"
                                        checked={!isGroupReceipt}
                                        onChange={() => setIsGroupReceipt(false)}
                                      />
                                      <span className="ml-2 text-slate-500">Recibo por cada factura</span>
                                    </label>

                                    <label className="flex items-center">
                                      <input
                                        type="radio"
                                        name="receiptType"
                                        value="group"
                                        checked={isGroupReceipt}
                                        onChange={() => setIsGroupReceipt(true)}
                                        disabled={selectedInvoices.length <= 1}
                                      />
                                      <span className="ml-2 text-slate-500">Recibo grupal</span>
                                    </label>
                                  </div>
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td>
                                <div className="p-4 gap-4 flex items-center">
                                  <label className="text-slate-500 w-20 font-bold">Forma de Pago:</label>
                                  {
                                    <Controller
                                      name="paymentMethod"
                                      control={control}
                                      rules={{ required: true }}
                                      defaultValue={''}
                                      render={({ field }) => (
                                        < select
                                          {...field}
                                          className="w-64 rounded border border-slate-200 p-4 text-slate-500"
                                          onChange={(e) => {
                                            field.onChange(e.target.value)
                                            trigger('bankName');
                                          }}
                                        >
                                          <option value="" disabled selected>Seleccionar</option>
                                          <option key={'paymentMethod1'} value={'Efectivo'}>{'Efectivo'}</option>
                                          <option key={'paymentMethod2'} value={'Cheque'}>{'Cheque'}</option>
                                          <option key={'paymentMethod3'} value={'Transferencia'}>{'Transferencia'}</option>
                                        </select>
                                      )}
                                    />
                                  }
                                  {errors.paymentMethod && <span className='px-2 text-red-500'>* Obligatorio</span>}
                                </div>
                              </td>
                            </tr>

                            {
                              isBankNameVisible() && (
                                <tr>
                                  <td>
                                    <div className="p-4 gap-4 flex items-center">
                                      <label className="text-slate-500 w-20 font-bold">Banco:</label>
                                      <Controller
                                        name="bankName"
                                        control={control}
                                        rules={{ required: true }}
                                        defaultValue={''}
                                        render={({ field }) => (
                                          <select
                                            {...field}
                                            className="w-64 rounded border border-slate-200 p-4 text-slate-500"
                                          >
                                            <option value="" disabled selected>Seleccionar</option>
                                            {
                                              dataBanks && dataBanks.map(bank =>
                                                <option key={bank._id} value={upperCase(bank.name)}>{upperCase(bank.name)}</option>
                                              )
                                            }
                                          </select>
                                        )}
                                      />
                                      {(errors.bankName) && <span className='px-2 text-red-500'>* Obligatorio</span>}
                                    </div>
                                  </td>
                                </tr>
                              )
                            }

                            <tr>
                              <td>
                                <div className="p-4 gap-4 flex items-center">
                                  <label className="text-slate-500 w-20 font-bold">Detalle:</label>
                                  {
                                    <textarea
                                      defaultValue={''}
                                      {...register("detail", { required: false })}
                                      className="rounded border border-slate-200 p-4 text-slate-500 w-64"
                                    />
                                  }
                                </div>
                              </td>
                            </tr>

                            {
                              dataWithholdings && dataWithholdings.length > 0 && (
                                <tr>
                                  <td>
                                    <div className="p-4 flex flex-col gap-4">
                                      <label className="text-slate-500 w-20 font-bold">Retenciones:</label>
                                      {
                                        dataWithholdings.map((withholding) =>
                                          <div key={`${withholding.name}`} className="flex items-center gap-4">
                                            <span className="text-slate-500 w-20">{withholding.name}</span>
                                            <input
                                              onKeyDown={utils.handleKeyPress}
                                              type="text"
                                              defaultValue={withholdings.find(w => w.name === withholding.name)?.amount || ''}
                                              onChange={(e) => handleWithholdingChange(withholding.name, e.target.value)}
                                              className="rounded border border-slate-200 p-4 text-slate-500 w-64"
                                            />
                                          </div>
                                        )
                                      }
                                    </div>
                                  </td>
                                </tr>
                              )
                            }

                            {/* ================ */}
                            <tr>
                              <td>
                                <div className="flex gap-2 justify-center items-center p-4">
                                  {
                                    <div className="flex gap-2 justify-center items-center">
                                      <Button variant="destructive" onClick={() => onCancel()}>Cancelar</Button>
                                      <Button variant="alternative" onClick={() => goBack()}>Volver a seleccion de facturas</Button>
                                      <Button type="button" onClick={handleFormSubmit} disabled={isLoadingSubmit}>{isLoadingSubmit ? 'Generando modelo...' : 'Ver modelo'}</Button>
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
              )
            }
          </div>
        )
      }

      {
        stage === 'VIEW' && selectedReceipt && (
          <div ref={printRef}>
            <ReceiptPreviewDialog
              onClose={() => {
                setSelectedReceipt(null);
                setStage('LIST');
              }}
              showDebitNote={showDebitNote}
              selectedReceipt={selectedReceipt}
            />
          </div>
        )
      }
    </div>
  );
}
