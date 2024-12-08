import React, { useState, useEffect, useRef } from "react";

export default function MultiSelectDropdown({
  formFieldName,
  options,
  onChange,
  prompt
}) {
  const [isJsEnabled, setIsJsEnabled] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const optionsListRef = useRef(null);
  const isSelectAllEnabled = selectedOptions.length < options.length;
  const isClearSelectionEnabled = selectedOptions.length > 0;

  useEffect(() => {
    setIsJsEnabled(true);
  }, []);

  const handleChange = (e) => {
    const isChecked = e.target.checked;
    const value = e.target.value;
    const returnValues = JSON.parse(e.target.getAttribute('returnValues')) || {};

    let selectedOptionSet = new Set(selectedOptions);

    if (isChecked) {
      selectedOptionSet.add({ value, returnValues });
    } else {
      selectedOptionSet = Array.from(selectedOptionSet).filter(
        (selectedOption) => selectedOption.value !== value
      );
    }

    const newSelectedOptions = Array.from(selectedOptionSet);

    setSelectedOptions(newSelectedOptions);
    onChange(newSelectedOptions.map(option => option.returnValues || {}));
  };

  const handleSelectAllClick = (e) => {
    e.preventDefault();

    const optionsInputs = optionsListRef.current.querySelectorAll("input");
    optionsInputs.forEach((input) => {
      input.checked = true;
    });

    setSelectedOptions([...options]);
    onChange(options.map(option => option.returnValues));
  };

  const handleClearSelectionClick = (e) => {
    e.preventDefault();

    const optionsInputs = optionsListRef.current.querySelectorAll("input");
    optionsInputs.forEach((input) => {
      input.checked = false;
    });

    setSelectedOptions([]);
    onChange([]);
  };

  return (
    <label className="relative z-100">
      <input type="checkbox" className="hidden peer" />
      <div className="cursor-pointer after:content-['▼'] after:text-xs after:ml-1 after:inline-flex after:items-center peer-checked:after:-rotate-180 after:transition-transform inline-flex rounded border border-slate-200  p-4 text-slate-500 ">
        {prompt}
        {isJsEnabled && selectedOptions.length > 0 && (
          <span className="ml-1 text-blue-500">{`(${selectedOptions.length} seleccionados)`}</span>
        )}
      </div>

      <div className="absolute bg-white border transition-opacity opacity-0 pointer-events-none peer-checked:opacity-100 peer-checked:pointer-events-auto w-full max-h-60 overflow-y-scroll z-50">
        {isJsEnabled && (
          <ul>
            <li>
              <button
                onClick={handleSelectAllClick}
                disabled={!isSelectAllEnabled}
                className="w-full text-left px-2 py-1 text-blue-600 disabled:opacity-100"
              >
                {"Seleccionar todos"}
              </button>
            </li>
            <li>
              <button
                onClick={handleClearSelectionClick}
                disabled={!isClearSelectionEnabled}
                className="w-full text-left px-2 py-1 text-blue-600 disabled:opacity-100"
              >
                {"Limpiar selección"}
              </button>
            </li>
          </ul>
        )}
        <ul ref={optionsListRef}>
          {options.map((option) => {
            const { value, returnValues } = option;

            return (
              <li key={value}>
                <label className="flex whitespace-nowrap cursor-pointer px-2 py-1 transition-colors hover:bg-blue-100 [&:has(input:checked)]:bg-blue-200">
                  <input
                    type="checkbox"
                    name={formFieldName}
                    value={value}
                    returnValues={JSON.stringify(returnValues)}
                    className="cursor-pointer"
                    onChange={handleChange}
                  />
                  <span className="ml-2">{value}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </label>
  );
}