import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import React, { useState, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR from 'swr'
import { useSWRConfig } from 'swr'
import Button from "./common/Button";
import { Dialog, DialogContent } from "./common/Dialog";
import { Pagination } from "./common/Pagination";
import Spinner from "./common/Spinner";

import { EyeIcon, CloseIcon, CreditNoteIcon, PrinterIcon, CalendarIcon } from "./icons";
import { Input } from "./common/Input";
import * as utils from '../utils/utils'
import MiPymeError from '../utils/errors/miPymeError'
import { upperCase, replace, padStart } from "lodash";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { config } from '../config';

var moment = require('moment');

import MultiSelectDropdown from '../utils/MultiSelectDropdown.js';
import InvoicePreviewDialog from './billing/InvoicePreviewDialog.js';
import FiltersBar from './billing/FiltersBar';

const formatCurrency = (value) => {
  return value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function Billings() {

  const [searchParams, setSearchParams] = useSearchParams();
  
  const location = useLocation();
  const isPathCreditNote = (location.pathname.indexOf('credito') !== -1)
  const showCreditNotes = searchParams.get('nc') || isPathCreditNote || false;

  const API_URL = '/api/billings';
  const filters = showCreditNotes ? '?not_status=CLOSED' : '?not_status=CLOSED,CREDIT_NOTE_CREATED';
  const FETCH_BILLINGS_URL = API_URL + filters;
  const API_URL_STUDENTS = '/api/students?enabled=SI';
  const API_URL_COURSES = '/api/courses';
  const API_URL_INSURANCES = '/api/insurances';
  const API_URL_AFIP_RECEIPT = '/api/receiptAfip';
  const API_URL_CREDIT_NOTE = '/api/creditNoteAfip';
  const [stage, setStage] = useState('LIST');
  const [isModalInvoiceOpen, setIsModalInvoiceOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  // const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [latestInvoice, setLatestInvoice] = useState(null);
  const [selectedBilling, setSelectedBilling] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [isGroupInvoice, setIsGroupInvoice] = useState(selectedStudents?.length > 1);
  const [partialPriceMethod, setPartialPriceMethod] = useState('none');
  const [errorMessage, setErrorMessage] = useState('');
  const [dueDateForm, setDueDateForm] = useState(new Date());

  const formRef = useRef(null);

  const { register, setValue, handleSubmit, control, reset, formState: { errors } } = useForm();
  let { data, error, isLoading, isValidating } = useSWR(FETCH_BILLINGS_URL, (url) => fetch(url).then(res => res.json()), {keepPreviousData: true})
  const { data: dataStudents } = useSWR(API_URL_STUDENTS, (url) => fetch(url).then(res => res.json()))
  const { data: dataCourses } = useSWR(API_URL_COURSES, (url) => fetch(url).then(res => res.json()))
  const { data: dataInsurances } = useSWR(API_URL_INSURANCES, (url) => fetch(url).then(res => res.json()))

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

  const dataFiltered = (data && data.length > 0 ? data.filter((d) => {
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
  }) : []);

  {/* Barra de FILTROS*/ }

  const dataStudentsFiltered = dataStudents && dataStudents?.length > 0 && dataStudents?.filter((d) => search ? d.name.toLowerCase().includes(search.toLowerCase()) || d.lastName.toLowerCase().includes(search.toLowerCase()) || d.healthInsuranceName.toLowerCase().includes(search.toLowerCase()) : d);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  // const rowsPerPage = 15;
  // const totalPages = Math.ceil(dataFiltered?.length / rowsPerPage);

  // const desde = (currentPage * rowsPerPage) - rowsPerPage;
  // const hasta = currentPage * rowsPerPage;

  const { mutate } = useSWRConfig()
  const navigate = useNavigate();

  const coursePeriods = utils.getCoursePeriods();
  const years = utils.getYears();

  if (errorMessage && showAlert) {
    window.alert(errorMessage);
    setErrorMessage('');
  }

  const onShowCreditNotes = () => {
    navigate("/facturacion?nc=true");
  }
  
  const onShowInvoices = () => {
    navigate("/facturacion");
  }

  const createCreditNote = async (invoice) => {
    if (window.confirm("¿Seguro desea crear una nota de crédito para la factura " + invoice.invoiceNumber + "?")) {
      try {
        setIsLoadingSubmit(true);

        const docInfo = getDocInfoFromInvoiceStudent(invoice);

        const creditNoteBody = buildCreditNoteBody(invoice, docInfo)

        // Create credit note in AFIP
        let afipCreditNote = await utils.postRequest(`${API_URL_CREDIT_NOTE}`, creditNoteBody)

        // Validate credit note created in AFIP
        afipCreditNote = await validateAfipCreditNote(afipCreditNote, creditNoteBody);

        // Update invoice with created credit note
        const body = buildCreditNoteUpdateBody(afipCreditNote, invoice)

        await utils.putRequest(`${API_URL}/${invoice._id}/creditNote`, body);
        
        // Update invoices list
        const updatedData = await fetch(FETCH_BILLINGS_URL).then((res) => res.json());
        await mutate(FETCH_BILLINGS_URL, updatedData, { optimisticData: true });

        window.alert("Nota de crédito creada exitosamente.");
      } catch (e) {
        handleError(e);
      }
      setIsLoadingSubmit(false);
    }
  }

  const handleFormSubmit = () => {
    if (formRef.current) {
      formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  const onSubmit = async (formData) => {
    try {
      const invoicePreview = buildInvoicePreview(formData);
      if (validatePeriodsAndContinue(invoicePreview.commonProps.periods, invoicePreview.commonProps.students)) {
        setInvoiceData(invoicePreview);
        setIsConfirmationDialogOpen(true);
      }
    } catch (e) {
      console.log(e);
    }
  }

  const buildInvoicePreview = (formData) => {
    const invoicePreviews = [];
    const individualProps = [];

    dataStudents
      .filter(student => selectedStudents?.includes(student._id))
      .forEach(student => {
        const invoicePreview = buildIndividualPreview(student, formData);
        invoicePreviews.push(invoicePreview);
      });

    invoicePreviews.forEach(invoicePreview => {
      individualProps.push({
        invoiceAmountNumber: invoicePreview.invoiceAmountNumber,
        insurance: invoicePreview.insurance,
        concepts: invoicePreview.concepts,
        invoiceItems: invoicePreview.invoiceItems,
      });
    });

    const commonProps = {
      totalInvoiceAmountNumber: parseFloat(individualProps.reduce((acc, curr) => acc + parseFloat(curr.invoiceAmountNumber), 0)).toFixed(2),
      details: formData.details,
      students: invoicePreviews.map(invoicePreview => invoicePreview.invoiceItems.map(item => item.student)),
      periods: invoicePreviews.map(invoicePreview => invoicePreview.selectedCoursePeriods).flat(),
      isGroupInvoice: isGroupInvoice,
      docInfo: getDocInfo(invoicePreviews[0].invoiceItems[0].student)
    };

    const invoiceData = {
      individualProps: individualProps,
      commonProps: commonProps
    };

    return invoiceData;
  };

  const buildIndividualPreview = (student, formData) => {
    let invoiceAmountNumber = 0;
    let concepts = [];
    const invoiceItems = [];
    const studentCourse = getStudentCourse(student);
    const selectedCoursePeriods = [];

    formData.invoicePeriods?.forEach(selectedMonth => {
      const selectedYear = formData.year;
      const coursePeriod = studentCourse?.periods.find(period => utils.getMonthName(period.month) === selectedMonth && period.year === selectedYear);

      invoiceAmountNumber += getPeriodPrice(coursePeriod);

      if (!concepts.includes(studentCourse?.name)) {
        concepts.push(studentCourse?.name);
      }

      selectedCoursePeriods.push(coursePeriod);
    });

    invoiceItems.push({
      student: student,
      course: studentCourse,
      detail: getItemDetails(student, studentCourse, selectedCoursePeriods),
    });

    return {
      invoiceItems: invoiceItems,
      selectedCoursePeriods: selectedCoursePeriods.map(period => {
        return {
          name: `${utils.getMonthName(period.month)}/${period.year}`,
          price: getPeriodPrice(period),
          resolution: period.resolution,
          student: student._id,
          id: period._id
        }
      }),
      invoiceAmountNumber: utils.formatPrice(invoiceAmountNumber),
      concepts: concepts,
      insurance: getStudentInsurance(student),
      details: formData.details,
      isGroupInvoice: isGroupInvoice
    };
  };

  const confirmOnSubmit = async () => {
    try {
      setIsLoadingSubmit(true);
      const commonProps = invoiceData.commonProps
      const individualProps = invoiceData.individualProps
      const requestInvoices = []
      const docInfo = commonProps.docInfo
      const dateForm = new Date(dueDateForm).toISOString().split('T')[0]
      const dueDateAfip = dateForm.replaceAll("-", "");

      if (commonProps.isGroupInvoice) {
        const invoiceAmount = commonProps.totalInvoiceAmountNumber
        const insurance = individualProps[0].insurance;
        const concepts = individualProps.map(prop => prop.concepts).flat();
        const items = individualProps.map(prop => prop.invoiceItems).flat();

        const invoice = await createAfipInvoice(invoiceAmount, docInfo, dueDateAfip);
        const requestInvoice = buildRequestInvoice(invoice, invoiceAmount, commonProps, insurance, concepts, items);
        console.log('requestInvoice: ', requestInvoice);
        requestInvoices.push(requestInvoice);
      } else {
        for (const individualProp of individualProps) {
          const invoiceAmount = individualProp.invoiceAmountNumber
          const invoice = await createAfipInvoice(invoiceAmount, docInfo, dueDateAfip);

          const requestInvoice = buildRequestInvoice(invoice, invoiceAmount, commonProps, individualProp.insurance, individualProp.concepts, individualProp.invoiceItems);
          requestInvoices.push(requestInvoice);
        }
      }

      const createdInvoices = await mutate(API_URL, utils.postRequest(API_URL, requestInvoices), { optimisticData: true })
      const previewedCreatedInvoice = await utils.getRequest(API_URL + '/' + createdInvoices.data[0]._id) || "";

      if (previewedCreatedInvoice?.data) {
        setLatestInvoice(previewedCreatedInvoice.data)
      }

      setIsLoadingSubmit(false)
      setStage('LIST')
      setSelectedBilling(createdInvoices.data[0]._id)
      setIsModalInvoiceOpen(true)
      setIsConfirmationDialogOpen(false);
      setSelectedStudents([]);
      setDueDateForm(null)
      reset()
    } catch (e) {
      console.log(e);
      setIsLoadingSubmit(false)
    }
  };

  async function createAfipInvoice(invoiceAmountNumber, docInfo, dueDate) {
    const invoiceBody = {
      receiptType: config.invoice.receiptType,
      sellPoint: config.invoice.sellPoint,
      concept: config.invoice.concept,
      cuit: config.invoice.cuit,
      amount: invoiceAmountNumber,
      docInfo: docInfo,
    };

    console.log(config)

    try {
      let afipInvoice = await mutate(API_URL_AFIP_RECEIPT, utils.postRequest(API_URL_AFIP_RECEIPT, invoiceBody), { optimisticData: true });
      validateAfipInvoice(afipInvoice);
      
      afipInvoice.receiptType = config.invoice.receiptType;
      return afipInvoice;
    } catch (error) {
      if (error instanceof MiPymeError) {
        const updatedInvoiceBody = {
          ...invoiceBody,  
          receiptType: config.invoice.miPyMEReceiptType,
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

        // invoiceBody.receiptType = config.invoice.receiptTypeMiPyME;
        const afipInvoice = await createMiPymeInvoice(updatedInvoiceBody, dueDate);
        // afipInvoice.receiptType = config.invoice.miPyMEReceiptType;

        const updatedAfipInvoice = {
          ...afipInvoice,
          receiptType: config.invoice.miPyMEReceiptType,
        }

        return updatedAfipInvoice;
      } else {
        throw error;
      }
    }
  }
  
  function validateAfipInvoice(afipInvoice) {
    const response = afipInvoice.data.FeDetResp.FECAEDetResponse[0];
    validateMiPyMeError(response)
    
    if (response.Resultado === 'R' || response.CAE === '' || response.CAEFchVto === '') {
      const msg = `Error al generar la factura en AFIP: \n\n${response.Observaciones.Obs[0].Msg}`;
      setErrorMessage(msg);
      throw new Error(msg);
    }
  }
  
  function validateMiPyMeError(response) {
    if (response.Resultado === 'R' && response.Observaciones && response.Observaciones.Obs) {
      const miPymeError = response.Observaciones.Obs.find(obs => obs.Code === 10192 || obs.Code === 1485)
      if (miPymeError) {
        const msg = `Error al generar la factura en AFIP: \n\n${miPymeError.Msg}`;
        setErrorMessage(msg);
        setShowAlert(false)
        throw new MiPymeError(msg);
      }
    }
  }
  
  async function createMiPymeInvoice(invoiceBody, dueDate) {
    console.log('Retrying with different receipt type due to MiPyME error...');
    invoiceBody.FchVtoPago = dueDate;

    const afipInvoice = await mutate(API_URL_AFIP_RECEIPT, utils.postRequest(API_URL_AFIP_RECEIPT, invoiceBody), { optimisticData: true });
    validateAfipInvoice(afipInvoice);
    return afipInvoice;
  }

  function buildRequestInvoice(invoice, invoiceAmount, commonProps, insurance, concepts, items) {
    const cae = invoice.data.FeDetResp.FECAEDetResponse[0].CAE;
    const caeDueDate = invoice.data.FeDetResp.FECAEDetResponse[0].CAEFchVto;
    const receiptNumber = invoice.data.FeDetResp.FECAEDetResponse[0].CbteDesde;

    return {
      invoiceNumber: padStart(config.invoice.sellPoint, 4, '0') + "-" + padStart(receiptNumber, 8, '0'),
      cae: cae,
      caeDueDate: caeDueDate,
      invoiceAmount: invoiceAmount,
      invoiceDate: dueDateForm,
      insurance: insurance,
      periods: commonProps.periods,
      concepts: concepts,
      details: commonProps.details,
      rememberDate: dataInsurances.find(i => i._id === insurance._id).daysForPayment,
      items: items,
      isGroupInvoice: commonProps.isGroupInvoice,
      itemsDetail: commonProps.isGroupInvoice ? commonProps.itemsDetail : items?.map(item => item.detail).join('\n'),
      receiptType: invoice.receiptType,
    };
  }

  function buildCreditNoteUpdateBody(afipCreditNote, invoice) {
    return {
      creditNotes: [{
        creditNoteNumber: padStart(config.creditNote.sellPoint, 4, '0') + "-" + padStart(afipCreditNote.data.FeDetResp.FECAEDetResponse[0].CbteDesde, 8, '0'),
        creditNoteAmount: invoice.invoiceAmount,
        creditNoteDate: new Date(),
        creditNoteCae: afipCreditNote.data.FeDetResp.FECAEDetResponse[0].CAE,
      }]
    };
  }

  function buildCreditNoteBody(invoice, docInfo) {
    return {
      relatedReceipt: {
        type: config.invoice.receiptType,
        sellPoint: config.invoice.sellPoint,
        number: invoice.invoiceNumber
      },
      receiptType: config.creditNote.receiptType,
      sellPoint: config.creditNote.sellPoint,
      concept: config.creditNote.concept,
      cuit: config.creditNote.cuit,
      amount: invoice.invoiceAmount,
      docInfo: docInfo,
    };
  }

  function getDocInfoFromInvoiceStudent(invoice) {
    const student = dataStudents.find(student => student._id === invoice.students[0]);
    return getDocInfo(student);
  }

  const validateAfipCreditNote = async (afipCreditNote, creditNoteBody) => {
    try {
      validateAfipInvoice(afipCreditNote);
      afipCreditNote.receiptType = config.creditNote.receiptType;
    } catch (e) {
      if (e instanceof MiPymeError) {
        afipCreditNote = await createMiPymeCreditNote(creditNoteBody, afipCreditNote);
      } else {
        throw e;
      }
    }
    return afipCreditNote;
  };

  async function createMiPymeCreditNote(creditNoteBody, afipCreditNote) {
    console.log('Retrying with different receipt type due to MiPyME error...');

    creditNoteBody.receiptType = config.creditNote.miPyMEReceiptType;
    afipCreditNote = await utils.postRequest(`${API_URL_CREDIT_NOTE}`, creditNoteBody);

    validateAfipInvoice(afipCreditNote);
    afipCreditNote.receiptType = config.creditNote.miPyMEReceiptType;
    return afipCreditNote;
  }

  const onView = (invoiceId, callback) => {
    window.open("/factura/" + invoiceId + '/child', '_blank')
  }

  const onViewCreditNote = (invoiceId, callback) => {
    navigate("/nota-de-credito/" + invoiceId);
  }

  const onPrint = (invoiceId) => {
    window.open("/factura/" + invoiceId + '/print', '_blank')
  };

  const onCreate = () => {
    setSelectedBilling(null);
    setStage('SELECT_STUDENTS')
  }

  const onCancel = () => {
    setSelectedBilling(null);
    setSelectedStudents([]);
    reset()
    setErrorMessage('');
    setIsLoadingSubmit(false)
    setIsGroupInvoice(false);
    setDueDateForm(null)
    setStage('LIST')
  }

  const goBack = () => {
    setInvoiceData(null);
    setDueDateForm(null)
    setStage('SELECT_STUDENTS');
    reset()
  }

  const onCheckboxChange = (e) => {
    if (e.target.checked) {
      setSelectedStudents([...selectedStudents, e.target.value]);
    } else {
      setSelectedStudents(selectedStudents.filter(student => student !== e.target.value))
    }
  }

  const onSelectAll = () => {
    setSelectedStudents(dataStudentsFiltered.map(s => s._id));
  }

  const onUnselectAll = () => {
    setSelectedStudents([]);
  }

  const handleError = (e) => {
    console.error('Error capturado:', e);

    if (e.response && e.response.data && e.response.data.error) {
      setErrorMessage(`Error: ${e.response.data.error}`);
    } else {
      setErrorMessage(`Error: ${e.message}`);
    }
  }

  const validateStudentsSelection = () => {
    if (selectedStudents.length === 0) {
      window.alert('Debe seleccionar al menos un alumno')
      return;
    }

    const insurances = selectedStudents
      .map(s => dataStudents?.find(student => student._id === s)?.healthInsurance);
    const insuranceSet = new Set(insurances);

    if (insuranceSet.size > 1) {
      window.alert('Debe seleccionar alumnos con la misma obra social');
      return;
    }

    const invoiceHolders = selectedStudents
      .map(s => dataStudents?.find(student => student._id === s)?.invoiceHolder);
    const invoiceHoldersSet = new Set(invoiceHolders);

    if (invoiceHoldersSet.size > 1) {
      window.alert('Debe seleccionar alumnos con el mismo titular de factura');
      return;
    }

    setStage('CREATE');
  }

  const isAdmin = () => {
    return sessionStorage.securityLevel === 'ADMIN';
  }

  const getStudentCompleteName = (student) => {
    return `${student?.name} ${student?.lastName}`;
  }

  const getStudentCourse = (student) => {
    return dataCourses?.find(course => course._id === student.course);
  }

  const getStudentCourseName = (student) => {
    return dataCourses?.find(course => course._id === student.course)?.name;
  }

  const getStudentInsurance = (student) => {
    return dataInsurances?.find(insurance => insurance._id === student?.healthInsurance);
  };

  const handleBillingMethodChange = (value) => {
    setIsGroupInvoice(selectedStudents.length > 1 && value);
  };

  const handlePartialPriceMethodChange = (value) => {
    setPartialPriceMethod(value);
  };

  const getItemDetails = (student, course, selectedCoursePeriods) => {
    const studentDetails = `${student.name} ${student.lastName}\n DNI: ${student.documentNumber}\n Nro Afiliado: ${student.affiliateNumber}\n Categoria A`;
    const courseDetails = course.name;
    const periodDetails = getPeriodDetails(selectedCoursePeriods).map(details => ` ${details}`).join('\n');

    let text = `${studentDetails}\n`;
    text += ` ${courseDetails}\n`;
    text += ` Facturacion: ${periodDetails}\n`;
    return text;
  }

  const getPeriodDetails = (selectedCoursePeriods) => {
    return selectedCoursePeriods.map(coursePeriod => getPeriodDetail(coursePeriod))
  };

  const getPeriodDetail = (coursePeriod) => {
    const resolution = coursePeriod.resolution ? `    Según Resolución: ${coursePeriod.resolution}` : '';
    return `${utils.getMonthName(coursePeriod.month)}/${coursePeriod.year} ${resolution}`;
  };

  const getInvoicePeriodsWithoutDuplicates = (invoice) => {
    return [...new Set(invoice.periods?.map(period => period.name))]
      .map(name => name.toUpperCase())
      .join(', ');
  }

  const getPeriodPrice = (coursePeriod) => {
    if (partialPriceMethod === 'none') {
      return parseFloat(coursePeriod?.price || '0');
    }

    if (partialPriceMethod === 'partial') {
      return parseFloat(coursePeriod?.partialPrice || '0');
    }

    return parseFloat(coursePeriod?.partialPrice) + parseFloat(coursePeriod?.price);
  }

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
        DocNro: replace(student.documentNumber, /-/g, "")
      }
    }

    const parentDocumentNumber = student.parents.find(parent => parent.documentNumber)?.documentNumber
    if (student.invoiceHolder.includes('Padre') && parentDocumentNumber) {
      return {
        DocTipo: 96,
        DocNro: replace(parentDocumentNumber, /-/g, "")
      }
    }

    return {
      DocTipo: 99,
      DocNro: 0
    }
  }

  const validatePeriodsAndContinue = (selectedPeriods, currentInvoiceStudents) => {
    const names = selectedPeriods.map(period => period.name);
    const students = currentInvoiceStudents.flat().map(student => student._id);

    const matchedInvoice = data.find(invoice => {
      const periodMatch = invoice.periods.some(period => names.includes(period.name));
      const studentMatch = invoice.students.some(studentId => students.includes(studentId));

      return periodMatch && studentMatch;
    });

    if (matchedInvoice) {
      const matchedPeriod = matchedInvoice.periods.find(period => names.includes(period.name)).name;
      const matchedStudentId = matchedInvoice.students.find(studentId => students.includes(studentId));
      const matchedStudent = dataStudents.find(student => student._id === matchedStudentId);

      return window.confirm(`Ya existe una factura en curso para el periodo ${matchedPeriod} y el estudiante ${matchedStudent.name} ${matchedStudent.lastName}. ¿Desea continuar de todos modos?`);
    }
    return true;
  }

  const validateDueDate = () => {
    if (!dueDateForm) {
      return "Obligatorio";
    }
    const selectedDate = new Date(dueDateForm);
    const today = new Date();

    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return "La fecha de vencimiento debe ser igual o posterior a la fecha actual";
    }
    return true;
  };

  const totalFacturado = dataFiltered?.reduce((total, invoice) => total + parseFloat(invoice.invoiceAmount), 0);
  const totalDocumentos = dataFiltered?.length;

  return (
    <div className="h-full overflow-auto">
      <div className="w-full flex flex-wrap sticky top-0 z-10 bg-white pb-4 shadow px-4">
        {
          !isConfirmationDialogOpen && (
            <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {
                showCreditNotes ? "Notas de crédito" : "Facturación"
              }
            </h1>
          )
        }

        {
          stage === 'LIST' && !showCreditNotes && (
            <Button variant="alternative" className="ml-auto" onClick={() => onCreate()}>Crear</Button>
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
          stage === 'CREATE' && !isConfirmationDialogOpen && (
            <div className="ml-auto gap-2 flex">
              <Button variant="destructive" onClick={() => onCancel()}>Cancelar</Button>
              <Button variant="alternative" onClick={() => goBack()}>Volver</Button>
              <Button type="button" onClick={handleFormSubmit} disabled={isLoadingSubmit}>{isLoadingSubmit ? 'Generando modelo...' : 'Ver modelo'}</Button>
            </div>
          )
        }

      </div>
      {
        (stage === 'LIST' || stage === 'SELECT_STUDENTS') && (
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
                onChange={(e) => setSearch(e.target.value)} /
              >
            }
          </div>
        )
      }


      {/* Barra de FILTROS - HTML */}
      {
        (stage === 'LIST') && (
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
              showCreditNotes={showCreditNotes}
              onShowCreditNotes={onShowCreditNotes}
              onShowInvoices={onShowInvoices}/>
          </div>
        )
      }
      {/* Barra de FILTROS - HTML */}

      {
        (stage === 'SELECT_STUDENTS') && (
          <div>
            <div className="flex gap-2 justify-end items-center p-4">
              <Button variant="outlined" onClick={() => onUnselectAll()}>Deseleccionar</Button>
              <Button variant="outlined" onClick={() => onSelectAll()}>Seleccionar</Button>
            </div>
          </div>
        )
      }

      {
        (!data) && (
          <div>
            <Spinner />
          </div>
        )
      }
      {
        stage === 'LIST' && data && (
          <div className="px-4">
            {
              showCreditNotes ? 
              <div className="flex">
                <p className="pl-1 pb-1 text-slate-500">Total de Notas de Credito {totalDocumentos}</p>
                <p className="pl-1 pb-1 text-slate-500">Importe: ${formatCurrency(totalFacturado)}</p>
              </div>
                :
                <div className="flex">
                  <p className="pl-1 pb-1 text-slate-500">Total de facturas {totalDocumentos}</p>
                  <p className="pl-1 pb-1 text-slate-500">Importe: ${formatCurrency(totalFacturado)}</p>
                </div>
            }
            <div className="flex flex-col overflow-x-auto mb-20sm:-mx-6">
              <div className="inline-block min-w-full py-2">
                <div className="overflow-x-auto rounded-xl border">
                  <table className="min-w-full text-left text-sm font-light rounded-xl">
                    <thead className="border-b font-medium  bg-slate-50 rounded-xl">
                      <tr className="text-slate-400">
                        <th className="border-b  font-medium p-4 pl-8 pt-0 w-4 pb-3 text-slate-400 text-left">#</th>
                        <th scope="col" className="px-6 py-4">Nro de Factura</th>
                        {
                          showCreditNotes && (
                            <th scope="col" className="px-6 py-4">Nro de Nota Credito</th>
                          )
                        }
                        <th scope="col" className="px-6 py-4 truncate">Periodos</th>
                        <th scope="col" className="px-6 py-4 truncate">Conceptos</th>
                        {
                          !showCreditNotes && (
                            <th scope="col" className="px-6 py-4 truncate">Estudiantes</th>
                          )
                        }
                        <th scope="col" className="px-6 py-4">Importe</th>
                        <th scope="col" className="px-6 py-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        dataFiltered.length ?
                          // slice(dataFiltered, desde, hasta).map((invoice, index) => {
                            dataFiltered.map((invoice, index) => {
                              return (
                                <tr key={invoice._id} className={utils.cn('border-b last:border-b-0 hover:bg-gray-100', (index % 2 === 0) && 'bg-gray-50')}>
                                  <td className="text-left !text-xs border-b border-slate-100  p-4 pl-8 text-slate-500 ">{index + 1}</td>
                                  <td className="text-slate-500 !text-xs whitespace-nowrap px-6 py-4 font-medium">{upperCase(invoice.invoiceNumber)}</td>
                                  {
                                    showCreditNotes && (
                                      <td className="text-slate-500 !text-xs whitespace-nowrap px-6 py-4 font-medium">{invoice.creditNotes[0].creditNoteNumber}</td>
                                    )
                                  }
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
                                      <button className="flex items-center justify-center w-8 h-8" title="Ver factura" onClick={() => onView(invoice._id)}><EyeIcon /></button>
                                      <button className="flex items-center justify-center w-8 h-8" title="Imprimir" onClick={() => onPrint(invoice._id)}><PrinterIcon /></button>
                                      {
                                        !showCreditNotes && (
                                          <button className="flex items-center justify-center w-8 h-8" title="Crear nota de credito" onClick={() => createCreditNote(invoice)}><CreditNoteIcon /></button>
                                        )
                                      }
                                      {
                                        showCreditNotes && !!invoice.creditNotes?.length && (
                                          
                                          <>
                                            {
                                              !!invoice.creditNotes[0].creditNoteCae ? 
                                                <button className="flex items-center justify-center w-8 h-8" title="Ver nota de credito" onClick={() => onViewCreditNote(invoice._id)}><>NC</></button>
                                                : 
                                                <div className="flex items-center justify-center w-8 h-8">- -</div>
                                            }
                                          </>
                                        )
                                      }
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
            
            <div className="flex gap-2 justify-center items-center p-4 hidden">
              {/* {
                !!totalPages &&
                <Pagination onChange={(page) => setCurrentPage(page)} totalPages={totalPages} currentPage={currentPage} />
              } */}
            </div>

            <Dialog open={isModalInvoiceOpen}>
              <DialogContent>
                <div className="h-[400px] max-w-[70vh]">
                  <div className="flex justify-end items-center text-gray-500">
                    <button onClick={() => setIsModalInvoiceOpen(false)}>
                      <CloseIcon />
                    </button>
                  </div>
                  <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight pl-4 pb-4">Factura creada</h1>
                  <div className="flex justify-center items-center w-full">
                    {
                      latestInvoice && (
                        <div className="p-4 w-full">
                          <div>
                            <label className="text-slate-500 pr-6 w-10 font-bold">
                              Fecha de creacion:
                            </label>
                            <label className="text-slate-500 w-20">
                              {moment(latestInvoice.invoiceDate).format("DD/MM/YYYY")}
                            </label>
                          </div>
                          <div>
                            <label className="text-slate-500 pr-6 w-10 font-bold">
                              Nro:
                            </label>
                            <label className="text-slate-500 w-20"></label>
                            <label className="text-slate-500 w-20">{latestInvoice.invoiceNumber}</label>
                          </div>

                          <div>
                            <label className="text-slate-500 pr-6 w-10 font-bold">
                              Importe:
                            </label>
                            <label className="text-slate-500 w-20"></label>
                            <label className="text-slate-500 w-20">${latestInvoice.invoiceAmount}</label>
                          </div>
                          <div>
                            <label className="text-slate-500 pr-6 w-10 font-bold">
                              Periodo:
                            </label>
                            <label className="text-slate-500 w-20"></label>
                            <label className="text-slate-500 w-20">{getInvoicePeriodsWithoutDuplicates(latestInvoice)}</label>
                          </div>
                          <div>
                            <label className="text-slate-500 pr-6 w-10 font-bold">
                              Concepto:
                            </label>
                            <label className="text-slate-500 w-20"></label>
                            <label className="text-slate-500 w-20">{latestInvoice.concept}</label>
                          </div>

                          <div className="mt-10 flex w-full justify-center items-center">
                            <Button variant="secondary" onClick={() => {
                              window.location.replace("factura/" + latestInvoice._id)
                            }}>Ver Factura</Button>
                            {/* <a className="text-slate-500 pr-6 font-bold" target="_blank" href={`${"factura/" + latestInvoice._id}`}>Ver factura</a> */}
                          </div>
                        </div>
                      )
                    }
                  </div>
                </div>
                <div className="flex gap-2 justify-center items-center">
                  <Button onClick={() => setIsModalInvoiceOpen(false)}>Cerrar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )
      }

      {
        stage === 'SELECT_STUDENTS' && (
          <div className="flex flex-col overflow-x-auto px-4">
            <div className="sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8">
                <div className="overflow-x-auto rounded-xl border">
                  <table className="min-w-full text-left text-sm font-light rounded-xl">
                    <thead className="border-b font-medium  bg-slate-50 rounded-xl">
                      <tr className="text-slate-400">
                        <th scope="col" className="px-6 py-4 truncate">Nombre completo</th>
                        <th scope="col" className="px-6 py-4 truncate">Enseñanza</th>
                        <th scope="col" className="px-6 py-4">Obra Social</th>
                        <th scope="col" className="px-6 py-4">Titular Factura</th>
                        <th scope="col" className="px-6 py-4">Seleccionar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        dataStudentsFiltered.length ?
                          dataStudentsFiltered.map((student) => (
                            <tr className="border-b last:border-b-0 ">
                              <td className="whitespace-nowrap px-6 py-4 max-w-[180px] overflow-hidden" style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{`${student.name} ${student.lastName}`}</td>
                              <td className="whitespace-nowrap px-6 py-4 max-w-[180px] overflow-hidden" style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getStudentCourseName(student)}</td>
                              <td className="whitespace-nowrap px-6 py-4 max-w-[180px]">{student.healthInsuranceName}</td>
                              <td className="whitespace-nowrap px-6 py-4 max-w-[180px]">{student.invoiceHolder}</td>
                              <td className="whitespace-nowrap px-6 py-4">
                                <input type="checkbox" value={student._id} onChange={onCheckboxChange} checked={selectedStudents.includes(student._id)} />
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
            </div>
            <div>
              <div className="flex gap-2 justify-end items-center p-4">
                <Button variant="destructive" onClick={() => onCancel()}>Cancelar</Button>
                <Button onClick={() => validateStudentsSelection()}>Continuar</Button>
              </div>
            </div>
          </div>
        )
      }

      {
        stage === 'CREATE' && (
          <div className="my-4 px-4">
            {
              isConfirmationDialogOpen && (
                <InvoicePreviewDialog
                  onClose={() => setIsConfirmationDialogOpen(false)}
                  invoicePreview={invoiceData}
                  isLoadingSubmit={isLoadingSubmit}
                  confirmOnSubmit={confirmOnSubmit}
                />
              ) || (
                <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))]" style={{ "backgroundPosition": "10px 10px" }}></div>
                  <div className="relative rounded-xl overflow-auto">
                    <div className="shadow-sm overflow-hidden my-8">
                      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col'>
                        <table className="border-collapse table-fixed w-full text-sm bg-white">
                          <tbody>
                            {/* ================ */}
                            <tr>
                              <td>
                                <div className="p-4 gap-4 flex-wrap items-center">
                                  <label className="text-slate-500 w-24 font-bold">Estudiantes:</label>
                                  {
                                    <div className="overflow-hidden p-4 rounded w-96">
                                      <div className="inline-grid grid-cols-4 gap-3 h-40 shadow p-1 pl-2 overflow-scroll">
                                        {
                                          dataStudents.map((student) => {
                                            if (selectedStudents.includes(student._id)) {
                                              return (<div className="text-xs">{"• " + upperCase(student.name + " " + student.lastName) + " - " + getStudentCourseName(student)}</div>)
                                            }
                                          })
                                        }
                                      </div>
                                    </div>
                                  }
                                  {errors.students && <span className='px-2 text-red-500'>* Obligatorio</span>}
                                </div>
                              </td>
                            </tr>
                            {/* ================ */}

                            <tr>
                              <td>
                                <div className="p-4 gap-4 flex-wrap items-center">
                                  <label className="text-slate-500 w-24 font-bold">Periodos a facturar:</label>
                                  <Controller
                                    name="invoicePeriods"
                                    control={control}
                                    defaultValue={[]}
                                    rules={{ required: 'Este campo es obligatorio' }}
                                    render={() => (
                                      <MultiSelectDropdown
                                        formFieldName="invoicePeriods"
                                        options={
                                          coursePeriods.map(period => {
                                            return {
                                              value: period,
                                              returnValues: period
                                            }
                                          })
                                        }
                                        onChange={(invoicePeriods) => {
                                          setValue("invoicePeriods", invoicePeriods);
                                        }}
                                        prompt="Seleccione uno o mas periodos"
                                      />
                                    )}
                                  />
                                  <select {...register("year", { required: true })} className="rounded border border-slate-200  p-4 text-slate-500 ">
                                    <option value="" disabled>Select</option>
                                    {
                                      years.map(year =>
                                        <option key={year.id} value={year.id}>{year.name}</option>
                                      )
                                    }
                                  </select>
                                  {errors.invoicePeriods && <span className='px-2 text-red-500'>* Obligatorio</span>}
                                </div>
                              </td>
                            </tr>

                            {/* ================ */}

                            <tr>
                              <td>
                                <div className="p-4 gap-4 flex-wrap items-center">
                                  <label className="text-slate-500 w-24 font-bold">Metodo de facturación:</label>
                                  <Controller
                                    control={control}
                                    name="billingMethod"
                                    rules={{ required: false }}
                                    render={({ field }) => (
                                      <div className="flex items-center ml-4">
                                        <input
                                          type="radio"
                                          id="groupInvoice"
                                          {...field}
                                          checked={selectedStudents.length > 1 && isGroupInvoice}
                                          disabled={selectedStudents.length === 1}
                                          onChange={() => handleBillingMethodChange(true)}
                                        />
                                        <label htmlFor="groupInvoice" className="ml-2">Grupal</label>
                                      </div>
                                    )}
                                  />

                                  <Controller
                                    control={control}
                                    name="billingMethod"
                                    rules={{ required: false }}
                                    render={({ field }) => (
                                      <div className="flex items-center ml-4">
                                        <input
                                          type="radio"
                                          id="individualInvoice"
                                          {...field}
                                          checked={!(selectedStudents.length > 1 && isGroupInvoice)}
                                          onChange={() => handleBillingMethodChange(false)}
                                        />
                                        <label htmlFor="individualInvoice" className="ml-2">Individual</label>
                                      </div>
                                    )}
                                  />
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td>
                                <div className="p-4 gap-4 flex-wrap items-center">
                                  <label className="text-slate-500 w-24 font-bold">Facturación de diferencias:</label>
                                  <div>
                                    <Controller
                                    control={control}
                                    name="partialPriceMethod"
                                    rules={{ required: false }}
                                    render={({ field }) => (
                                      <div className="flex items-center ml-4">
                                        <input
                                          type="radio"
                                          id="partialPriceMethod-none"
                                          {...field}
                                          checked={partialPriceMethod === 'none'}
                                          onChange={() => handlePartialPriceMethodChange('none')}
                                        />
                                        <label htmlFor="individualInvoice" className="ml-2">Sin diferencias</label>
                                      </div>
                                    )}
                                    />

                                  <Controller
                                    control={control}
                                    name="partialPriceMethod"
                                    rules={{ required: false }}
                                    render={({ field }) => (
                                      <div className="flex items-center ml-4">
                                        <input
                                          type="radio"
                                          id="partialPriceMethod-partial"
                                          {...field}
                                          checked={partialPriceMethod === 'partial'}
                                          onChange={() => handlePartialPriceMethodChange('partial')}
                                        />
                                        <label htmlFor="individualInvoice" className="ml-2">Solo diferencias</label>
                                      </div>
                                    )}
                                  />

                                  <Controller
                                    control={control}
                                    name="partialPriceMethod"
                                    rules={{ required: false }}
                                    render={({ field }) => (
                                      <div className="flex items-center ml-4">
                                        <input
                                          type="radio"
                                          id="partialPriceMethod-both"
                                          {...field}
                                          checked={partialPriceMethod === 'both'}
                                          onChange={() => handlePartialPriceMethodChange('both')}
                                        />
                                        <label htmlFor="groupInvoice" className="ml-2">Período Y diferencias</label>
                                      </div>
                                    )}
                                  />
                                  </div>
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td>
                                <div className="p-4 gap-4 flex-wraps items-center">
                                  <label className="text-slate-500 w-20 font-bold">Fecha de vencimiento:</label>
                                  {
                                    <Controller
                                      control={control}
                                      rules={{ validate: validateDueDate }}
                                      id="dueDate"
                                      name="dueDate"
                                      render={({ field: { onChange } }) => {
                                        return (
                                          <div className="w-64 flex gap-2 items-center">
                                            <div className="w-4 h-4 z-10 ml-4 absolute text-slate-500"><CalendarIcon /></div>
                                            <div className="">
                                              <DatePicker
                                                onKeyDown={utils.handleKeyPress}
                                                dateFormat={"dd/MM/yyyy"}
                                                value={dueDateForm || new Date()}
                                                selected={dueDateForm || new Date()}
                                                onChange={(date) => {
                                                  setDueDateForm(date);
                                                  onChange(date);
                                                }}
                                                showYearDropdown
                                                scrollableYearDropdown
                                                yearDropdownItemNumber={100}
                                              />
                                            </div>
                                          </div>
                                        )
                                      }}
                                    />
                                  }
                                  {errors.dueDate && <span className='px-2 text-red-500'>* {errors.dueDate.message}</span>}
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td>
                                <div className="p-4 gap-4 flex-wrap items-center">
                                  <label className="text-slate-500 w-24 font-bold">Observaciones:</label>
                                  {
                                    <textarea defaultValue={selectedBilling?.details || ''} {...register("details", { required: false })} className="rounded border border-slate-200  p-4 text-slate-500 flex w-full" />
                                  }
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <div className="p-4 gap-4 flex items-center">
                                  {
                                    <div className="gap-4 flex">
                                      <Button variant="destructive" onClick={() => onCancel()}>Cancelar</Button>
                                      <Button variant="alternative" onClick={() => goBack()}>Volver</Button>
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
    </div>
  );
}

