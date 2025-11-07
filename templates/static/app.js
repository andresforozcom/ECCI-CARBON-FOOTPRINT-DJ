(() => {
  const body = document.body;
  if (!body) {
    return;
  }

  const apiBase = (body.dataset.apiBase || '/api/').replace(/\/$/, '');
  const catalogCache = new Map();

  const HEADER_CATALOG_MAP = [
    {
      header: 'combustible',
      endpoint: 'fuel-types',
      valueField: 'fuel_code',
      label: (item) => `${item.description} (${item.fuel_code})`
    },
    {
      header: 'medio de transporte / combustible',
      endpoint: 'fuel-types',
      valueField: 'fuel_code',
      label: (item) => `${item.description} (${item.fuel_code})`
    },
    {
      header: 'agente utilizado',
      endpoint: 'extinguisher-types',
      valueField: 'ext_code',
      label: (item) => `${item.description} (${item.ext_code})`
    },
    {
      header: 'consumo de papel',
      endpoint: 'paper-weight',
      valueField: 'size',
      label: (item) => `${item.size} · ${item.kg_per_ream} kg/paq.`
    },
    {
      header: 'tratamiento y/o disposicion final de residuos',
      endpoint: 'waste-types',
      valueField: 'waste_code',
      label: (item) => `${item.description} (${item.waste_code})`
    }
  ];

  const DOWNLOAD_ENDPOINTS = {
    campus: 'campus',
    periods: 'periods',
    fuelTypes: 'fuel-types',
    wasteTypes: 'waste-types',
    extinguisherTypes: 'extinguisher-types',
    paperWeights: 'paper-weight'
  };

  const monthFormatter = new Intl.DateTimeFormat('es', { month: 'long' });

  function capitalise(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
  }

  function formatPeriodLabel(period) {
    if (!period) {
      return '';
    }

    if (period.month) {
      const month = capitalise(monthFormatter.format(new Date(period.year, period.month - 1, 1)));
      return `${month} ${period.year}`;
    }

    return `Anual ${period.year}`;
  }

  const SELECT_SOURCE_CONFIG = {
    periods: {
      endpoint: 'periods',
      value: (item) => item.id,
      label: formatPeriodLabel
    },
    campus: {
      endpoint: 'campus',
      value: (item) => item.id,
      label: (item) => item.name
    },
    fuelTypes: {
      endpoint: 'fuel-types',
      value: (item) => item.fuel_code,
      label: (item) => `${item.description} (${item.fuel_code})`
    },
    extinguisherTypes: {
      endpoint: 'extinguisher-types',
      value: (item) => item.ext_code,
      label: (item) => `${item.description} (${item.ext_code})`
    },
    wasteTypes: {
      endpoint: 'waste-types',
      value: (item) => item.waste_code,
      label: (item) => `${item.description} (${item.waste_code})`
    },
    paperWeights: {
      endpoint: 'paper-weight',
      value: (item) => item.size,
      label: (item) => `${item.size} · ${item.kg_per_ream} kg/paq.`
    },
    emissionFactors: {
      endpoint: 'emission-factors',
      value: (item) => item.id,
      label: (item) => `${item.agent} (${item.gas})`
    }
  };

  const RECORD_CONFIG = {
    electricity: {
      endpoint: 'electricity',
      fields: [
        { name: 'period_id', label: 'Periodo', type: 'select', source: 'periods', required: true },
        { name: 'campus_id', label: 'Sede / campus', type: 'select', source: 'campus', required: true },
        { name: 'operator', label: 'Operador (opcional)', placeholder: 'Nombre del operador' },
        { name: 'kwh', label: 'Consumo (kWh)', type: 'number', step: '0.01', required: true, cast: 'float' }
      ]
    },
    naturalGas: {
      endpoint: 'natural-gas',
      fields: [
        { name: 'period_id', label: 'Periodo', type: 'select', source: 'periods', required: true },
        { name: 'campus_id', label: 'Sede / campus', type: 'select', source: 'campus', required: true },
        { name: 'operator', label: 'Operador (opcional)', placeholder: 'Nombre del operador' },
        { name: 'm3', label: 'Consumo (m³)', type: 'number', step: '0.01', required: true, cast: 'float' }
      ]
    },
    fuelStationary: {
      endpoint: 'fuel',
      fields: [
        { name: 'period_id', label: 'Periodo', type: 'select', source: 'periods', required: true },
        { name: 'campus_id', label: 'Sede / campus', type: 'select', source: 'campus', required: true },
        { name: 'fuel_code_id', label: 'Combustible', type: 'select', source: 'fuelTypes', required: true },
        { name: 'gallons', label: 'Consumo (galones)', type: 'number', step: '0.01', required: true, cast: 'float' },
        { name: 'biogenic_co2', label: 'CO₂ biogénico (t)', type: 'number', step: '0.001', cast: 'float', placeholder: 'Opcional' }
      ]
    },
    vehicleFleet: {
      endpoint: 'vehicle-fleet',
      fields: [
        { name: 'period_id', label: 'Periodo', type: 'select', source: 'periods', required: true },
        { name: 'campus_id', label: 'Sede / campus', type: 'select', source: 'campus', required: true },
        { name: 'fuel_code_id', label: 'Combustible', type: 'select', source: 'fuelTypes', required: true },
        { name: 'km_traveled', label: 'Kilómetros recorridos', type: 'number', step: '0.01', required: true, cast: 'float' },
        { name: 'gallons', label: 'Consumo (galones)', type: 'number', step: '0.01', required: true, cast: 'float' }
      ]
    },
    extinguisherRefill: {
      endpoint: 'extinguisher-refill',
      fields: [
        { name: 'period_id', label: 'Periodo', type: 'select', source: 'periods', required: true },
        { name: 'campus_id', label: 'Sede / campus', type: 'select', source: 'campus', required: true },
        { name: 'ext_code_id', label: 'Tipo de agente', type: 'select', source: 'extinguisherTypes', required: true },
        { name: 'mass_kg', label: 'Masa recargada (kg)', type: 'number', step: '0.01', required: true, cast: 'float' }
      ]
    },
    waste: {
      endpoint: 'waste',
      fields: [
        { name: 'period_id', label: 'Periodo', type: 'select', source: 'periods', required: true },
        { name: 'campus_id', label: 'Sede / campus', type: 'select', source: 'campus', required: true },
        { name: 'waste_code_id', label: 'Tipo de residuo', type: 'select', source: 'wasteTypes', required: true },
        { name: 'kg', label: 'Residuos (kg)', type: 'number', step: '0.01', required: true, cast: 'float' }
      ]
    },
    paper: {
      endpoint: 'paper',
      fields: [
        { name: 'period_id', label: 'Periodo', type: 'select', source: 'periods', required: true },
        { name: 'campus_id', label: 'Sede / campus', type: 'select', source: 'campus', required: true },
        { name: 'size_id', label: 'Formato de papel', type: 'select', source: 'paperWeights', required: true },
        { name: 'reams', label: 'Cantidad (resmas)', type: 'number', step: '1', min: '0', required: true, cast: 'int' }
      ]
    },
    purchases: {
      endpoint: 'purchases',
      fields: [
        { name: 'period_id', label: 'Periodo', type: 'select', source: 'periods', required: true },
        { name: 'campus_id', label: 'Sede / campus', type: 'select', source: 'campus', required: true },
        { name: 'good_service', label: 'Bien o servicio', required: true, placeholder: 'Descripción del bien/servicio' },
        { name: 'amount', label: 'Monto (COP)', type: 'number', step: '0.01', required: true, cast: 'float' },
        { name: 'emission_factor_id', label: 'Factor de emisión (opcional)', type: 'select', source: 'emissionFactors', placeholder: 'Sin factor específico' }
      ]
    },
    flight: {
      endpoint: 'flights',
      fields: [
        { name: 'period_id', label: 'Periodo', type: 'select', source: 'periods', required: true },
        { name: 'flight_date', label: 'Fecha del vuelo', type: 'date', required: true },
        { name: 'origin', label: 'Origen', required: true },
        { name: 'destination', label: 'Destino', required: true },
        { name: 'co2_kg', label: 'Emisiones (kg CO₂e)', type: 'number', step: '0.01', required: true, cast: 'float' },
        { name: 'roundtrip', label: 'Ida y vuelta', type: 'checkbox', default: true }
      ]
    },
    fieldPractice: {
      endpoint: 'field-practice',
      fields: [
        { name: 'period_id', label: 'Periodo', type: 'select', source: 'periods', required: true },
        { name: 'campus_id', label: 'Sede / campus', type: 'select', source: 'campus', required: true },
        { name: 'origin', label: 'Origen', required: true },
        { name: 'destination', label: 'Destino', required: true },
        { name: 'km_oneway', label: 'Kilómetros (solo ida)', type: 'number', step: '0.01', required: true, cast: 'float' },
        { name: 'total_km', label: 'Kilómetros totales', type: 'number', step: '0.01', required: true, cast: 'float' },
        { name: 'fuel_code_id', label: 'Combustible utilizado', type: 'select', source: 'fuelTypes', required: true }
      ]
    },
    removal: {
      endpoint: 'removals',
      fields: [
        { name: 'period_id', label: 'Periodo', type: 'select', source: 'periods', required: true },
        { name: 'campus_id', label: 'Sede / campus', type: 'select', source: 'campus', required: true },
        { name: 'rtype', label: 'Tipo de remoción', required: true, placeholder: 'Descripción de la remoción' },
        { name: 'tco2e', label: 'Remoción (tCO₂e)', type: 'number', step: '0.001', required: true, cast: 'float' }
      ]
    }
  };



  const normalise = (text) =>
    text
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s\/]/g, '');

  async function fetchCatalog(endpoint) {
    if (!catalogCache.has(endpoint)) {
      const url = `${apiBase}/${endpoint}/`;
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`No fue posible cargar ${endpoint} (${response.status})`);
      }

      const data = await response.json();
      catalogCache.set(endpoint, Array.isArray(data) ? data : data.results || []);
    }

    return catalogCache.get(endpoint);
  }

  function populateSelect(select, options, config) {
    const previous = select.value;

    while (select.options.length > 1) {
      select.remove(1);
    }

    options.forEach((item) => {
      const option = document.createElement('option');
      option.value = item[config.valueField];
      option.textContent = config.label(item);
      select.appendChild(option);
    });

    if (previous) {
      const stillExists = options.some((item) => `${item[config.valueField]}` === previous);
      select.value = stillExists ? previous : '';
    } else {
      select.value = '';
    }
  }

  async function hydrateTable(table) {
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) => normalise(th.textContent));

    for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
      const headerText = headers[columnIndex];
      const catalog = HEADER_CATALOG_MAP.find((entry) => headerText.includes(entry.header));

      if (!catalog) {
        continue;
      }

      let options;
      try {
        options = await fetchCatalog(catalog.endpoint);
      } catch (error) {
        console.error(error);
        continue;
      }

      const cells = table.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1}) select`);

      cells.forEach((select) => {
        populateSelect(select, options, catalog);
      });
    }
  }

  function hydrateAllTables() {
    const tables = document.querySelectorAll('table.emisiones-table');
    tables.forEach((table) => {
      hydrateTable(table);
    });
  }


  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  async function populateSelectFromSource(select, sourceKey, fieldConfig = {}) {
    const source = SELECT_SOURCE_CONFIG[sourceKey];

    if (!source) {
      return;
    }

    let items = [];

    try {
      items = await fetchCatalog(source.endpoint);
    } catch (error) {
      console.error(error);
      return;
    }

    const labelFn = fieldConfig.optionLabel || source.label;
    const valueFn = fieldConfig.optionValue || source.value;
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = `${valueFn(item)}`;
      option.textContent = labelFn(item);
      fragment.appendChild(option);
    });

    select.appendChild(fragment);

    if (fieldConfig.default !== undefined) {
      const value = `${fieldConfig.default}`;
      const defaultOption = Array.from(select.options).find((option) => option.value === value);
      if (defaultOption) {
        defaultOption.defaultSelected = true;
        select.value = value;
      }
    } else {
      select.selectedIndex = 0;
    }
  }

  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) {
      return meta.content;
    }

    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  async function renderRecordForm(recordKey) {
    const form = document.getElementById('recordForm');
    const selector = document.getElementById('recordType');

    if (!form || !selector) {
      return;
    }

    const config = RECORD_CONFIG[recordKey];
    const fieldsWrapper = form.querySelector('[data-form-fields]');
    const status = form.querySelector('.form-status');

    if (!config) {
      form.hidden = true;
      form.dataset.endpoint = '';
      form.dataset.recordKey = '';
      clearElement(fieldsWrapper);
      if (status) {
        status.textContent = '';
        status.classList.remove('success', 'error');
      }
      return;
    }

    form.hidden = false;
    form.dataset.endpoint = config.endpoint;
    form.dataset.recordKey = recordKey;

    if (status) {
      status.textContent = '';
      status.classList.remove('success', 'error');
    }

    clearElement(fieldsWrapper);
    fieldsWrapper.classList.toggle('two-cols', config.fields.length > 3);

    const asyncTasks = [];

    config.fields.forEach((field) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'form-field';

      if (field.type === 'checkbox') {
        const label = document.createElement('label');
        label.className = 'checkbox-field';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = field.name;
        input.id = `field-${field.name}`;
        if (field.default) {
          input.checked = true;
          input.defaultChecked = true;
        }
        label.appendChild(input);
        const span = document.createElement('span');
        span.textContent = field.label;
        label.appendChild(span);
        wrapper.appendChild(label);
      } else {
        const label = document.createElement('label');
        label.setAttribute('for', `field-${field.name}`);
        label.textContent = field.label;
        wrapper.appendChild(label);

        let input;

        if (field.type === 'select') {
          input = document.createElement('select');
          input.name = field.name;
          input.id = `field-${field.name}`;
          input.classList.add('form-select');

          if (field.required) {
            input.required = true;
          }

          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = field.placeholder || 'Selecciona una opción';
          input.appendChild(placeholder);

          if (field.source) {
            asyncTasks.push(populateSelectFromSource(input, field.source, field));
          }
        } else {
          input = document.createElement('input');
          input.type = field.type || 'text';
          input.name = field.name;
          input.id = `field-${field.name}`;

          if (field.required) {
            input.required = true;
          }

          if (field.placeholder) {
            input.placeholder = field.placeholder;
          }

          if (field.step) {
            input.step = field.step;
          }

          if (field.min !== undefined) {
            input.min = field.min;
          }

          if (field.max !== undefined) {
            input.max = field.max;
          }

          if (field.default !== undefined) {
            input.value = field.default;
            input.defaultValue = field.default;
          }
        }

        wrapper.appendChild(input);
      }

      fieldsWrapper.appendChild(wrapper);
    });

    try {
      await Promise.all(asyncTasks.map((task) => task.catch((error) => console.error(error))));
    } catch (error) {
      console.error(error);
    }
  }

  function extractErrorMessage(errorResponse, fallback) {
    if (!errorResponse) {
      return fallback;
    }

    if (typeof errorResponse === 'string') {
      return errorResponse;
    }

    if (Array.isArray(errorResponse)) {
      return errorResponse.join(' ');
    }

    if (typeof errorResponse === 'object') {
      return Object.entries(errorResponse)
        .map(([key, value]) => `${key}: ${extractErrorMessage(value, '')}`)
        .join(' ');
    }

    return fallback;
  }

  async function submitRecordForm(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const status = form.querySelector('.form-status');
    const endpoint = form.dataset.endpoint;
    const recordKey = form.dataset.recordKey;
    const config = RECORD_CONFIG[recordKey];

    if (!endpoint || !config) {
      return;
    }

    if (!form.reportValidity()) {
      return;
    }

    if (status) {
      status.textContent = '';
      status.classList.remove('success', 'error');
    }

    const payload = {};

    config.fields.forEach((field) => {
      const input = form.elements[field.name];

      if (!input) {
        return;
      }

      if (field.type === 'checkbox') {
        payload[field.name] = input.checked;
        return;
      }

      const value = input.value.trim();

      if (!value) {
        if (field.required) {
          payload[field.name] = value;
        }
        return;
      }

      if (field.cast === 'int') {
        const parsed = parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
          payload[field.name] = parsed;
        }
        return;
      }

      if (field.cast === 'float' || field.type === 'number') {
        const parsed = parseFloat(value);
        if (!Number.isNaN(parsed)) {
          payload[field.name] = parsed;
        }
        return;
      }

      payload[field.name] = value;
    });

    const csrfToken = getCsrfToken();

    form.classList.add('loading');
    if (status) {
      status.textContent = 'Enviando información…';
    }

    try {
      const response = await fetch(`${apiBase}/${endpoint}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let message = `Error al guardar el registro (${response.status})`;

        try {
          const errorData = await response.json();
          message = extractErrorMessage(errorData, message);
        } catch (jsonError) {
          console.error(jsonError);
        }

        throw new Error(message);
      }

      form.reset();

      if (status) {
        status.textContent = 'Registro guardado correctamente.';
        status.classList.remove('error');
        status.classList.add('success');
      }
    } catch (error) {
      console.error(error);

      if (status) {
        status.textContent = error.message;
        status.classList.remove('success');
        status.classList.add('error');
      }
    } finally {
      form.classList.remove('loading');
    }
  }

  function initDataEntryForm() {
    const selector = document.getElementById('recordType');
    const form = document.getElementById('recordForm');

    if (!selector || !form) {
      return;
    }

    selector.addEventListener('change', () => {
      const value = selector.value;
      if (!value) {
        form.hidden = true;
        form.dataset.endpoint = '';
        form.dataset.recordKey = '';
        form.reset();
        const status = form.querySelector('.form-status');
        if (status) {
          status.textContent = '';
          status.classList.remove('success', 'error');
        }
        return;
      }

      renderRecordForm(value);
    });

    const resetButton = form.querySelector('[data-reset]');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        form.reset();
        const status = form.querySelector('.form-status');
        if (status) {
          status.textContent = '';
          status.classList.remove('success', 'error');
        }
      });
    }

    form.addEventListener('submit', submitRecordForm);
  }

  async function downloadData() {
    const entries = Object.entries(DOWNLOAD_ENDPOINTS);
    const result = {};

    try {
      await Promise.all(
        entries.map(async ([key, endpoint]) => {
          const data = await fetchCatalog(endpoint);
          result[key] = data;
        })
      );
    } catch (error) {
      console.error(error);
      alert('Hubo un problema al descargar los datos del servicio. Intenta nuevamente.');
      return;
    }

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'inventario-ecci.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  document.addEventListener('DOMContentLoaded', () => {
    hydrateAllTables();

    initDataEntryForm();


    const downloadButton = document.getElementById('downloadBtn');
    if (downloadButton) {
      downloadButton.addEventListener('click', downloadData);
    }
  });
})();
