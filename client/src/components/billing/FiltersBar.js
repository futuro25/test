import Button from "../common/Button";
import * as utils from '../../utils/utils'
import {capitalize, upperCase} from 'lodash'

const FiltersBar = ({ periodFilter, setPeriodFilter, conceptFilter, setConceptFilter, insuranceFilter, setInsuranceFilter, courses, insurances, setCreationFilter, creationFilter, showCreditNotes, onShowCreditNotes, onShowInvoices}) => {
  const clearFilters = () => {
    setPeriodFilter('');
    setConceptFilter('');
    setInsuranceFilter('');
    setCreationFilter('');
  };

  return (
    <div className="w-full flex flex-wrap bg-white rounded pb-4 justify-start items-center gap-2">
      <div className="flex justify-center items-center gap-2">
        <label className="w-24">Periodo</label>
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="mx-1 rounded border border-slate-200 p-1 text-slate-500 text-xs"
          style={{ width: '150px' }}
        >
          <option disabled value="">Seleccionar</option>
          {utils.getCoursePeriods().map((period) => (
            <option key={period._id} value={period}>{upperCase(period)}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-center items-center gap-2">
        <label className="w-24">Concepto</label>
        <select
          value={conceptFilter}
          onChange={(e) => setConceptFilter(e.target.value)}
          className="mx-1 rounded border border-slate-200 p-1 text-slate-500 text-xs"
          style={{ width: '150px' }}
        >
          <option disabled value="">Seleccionar</option>
          {courses?.map((course) => (
            <option key={course._id} value={course.name}>{upperCase(course.name)}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-center items-center gap-2">
        <label className="w-24">Obra social</label>
        <select
          value={insuranceFilter}
          onChange={(e) => setInsuranceFilter(e.target.value)}
          className="mx-1 rounded border border-slate-200 p-1 text-slate-500 text-xs"
          style={{ width: '150px' }}
        >
          <option disabled value="">Seleccionar</option>
          {insurances?.map((insurance) => (
            <option key={insurance._id} value={insurance.plan}>{upperCase(insurance.plan)}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-center items-center gap-2">
        <label className="w-24">Emision</label>
        <select
          value={creationFilter}
          onChange={(e) => setCreationFilter(e.target.value)}
          className="mx-1 rounded border border-slate-200 p-1 text-slate-500 text-xs"
          style={{ width: '150px' }}
        >
          <option disabled value="">Seleccionar</option>
          {utils.getEnglishMonths().map((period) => (
            <option key={period._id} value={period.name}>{upperCase(period.label)}</option>
          ))}
        </select>
      </div>

      <p onClick={clearFilters} className="text-xs text-blue-500 cursor-pointer">Limpiar Filtros</p>
      {
        onShowInvoices?
        showCreditNotes ? 
        <Button size={'sm'} variant="alternative" className="px-4 ml-auto" onClick={() => onShowInvoices()}>Ver Facturas</Button>
        :
        <Button size={'sm'} variant="alternative" className="px-4 ml-auto" onClick={() => onShowCreditNotes()}>Ver Notas de Credito</Button>
        :<></>
      }
    </div>
  );
};

export default FiltersBar;
