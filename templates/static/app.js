(() => {
  const body = document.body;
  if (!body) {
    return;
  }

  const apiBase = (body.dataset.apiBase || '/api/').replace(/\/$/, '');
  const catalogCache = new Map();

  const monthFormatter = new Intl.DateTimeFormat('es', { month: 'long' });

  const normalise = (text) =>
    (text || '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s\/]/g, '');

  const HEADER_CATALOG_MAP = [
    {
      matches: ['combustible', 'medio de transporte', 'combustible utilizado'].map(normalise),
      endpoint: 'fuel-types',
      valueField: 'fuel_code',
      label: (item) => `${item.description} (${item.fuel_code})`
    },
    {
      matches: ['agente utilizado', 'tipo de agente'].map(normalise),
      endpoint: 'extinguisher-types',
      valueField: 'ext_code',
      label: (item) => `${item.description} (${item.ext_code})`
    },
    {
      matches: ['consumo de papel', 'formato de papel'].map(normalise),
      endpoint: 'paper-weight',
      valueField: 'size',
      label: (item) => `${item.size} · ${item.kg_per_ream} kg/paq.`
    },
    {
      matches: ['tratamiento y/o disposicion final de residuos', 'tipo de residuo'].map(normalise),
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

  const capitalise = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '');

  const formatPeriodLabel = (period) => {
    if (!period) {
      return '';
    }

    if (period.month) {
      const month = capitalise(monthFormatter.format(new Date(period.year, period.month - 1, 1)));
      return `${month} ${period.year}`;
    }

    return `Anual ${period.year}`;
  };

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
        {
          name: 'biogenic_co2',
          label: 'CO₂ biogénico (t)',
          type: 'number',
          step: '0.001',
          cast: 'float',
          placeholder: 'Opcional'
        }
      ]
    },
    fuelMobile: {
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
        {
          name: 'emission_factor_id',
          label: 'Factor de emisión (opcional)',
          type: 'select',
          source: 'emissionFactors',
          placeholder: 'Sin factor específico'
        }
      ]
    },
    flights: {
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
    removals: {
      endpoint: 'removals',
      fields: [
        { name: 'period_id', label: 'Periodo', type: 'select', source: 'periods', required: true },
        { name: 'campus_id', label: 'Sede / campus', type: 'select', source: 'campus', required: true },
        { name: 'rtype', label: 'Tipo de remoción', required: true, placeholder: 'Descripción de la remoción' },
        { name: 'tco2e', label: 'Remoción (tCO₂e)', type: 'number', step: '0.001', required: true, cast: 'float' }
      ]
    }
  };

  const formatNumber = (value, decimals = 3) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '';
    }
    return Number(value).toFixed(decimals);
  };

  const CARBON_FORMULAS = {
    combustion_estacionaria: (A_m3, FE_CO2, FE_CH4, FE_N2O, PCG_CH4 = 28, PCG_N2O = 265) => {
      const E_CO2 = A_m3 * FE_CO2 / 1000;
      const E_CH4 = (A_m3 * FE_CH4 * PCG_CH4) / 1000;
      const E_N2O = (A_m3 * FE_N2O * PCG_N2O) / 1000;
      return (E_CO2 + E_CH4 + E_N2O) / 1000;
    },
    combustion_movil: (A_litros, FE_CO2, FE_CH4, FE_N2O, PCG_CH4 = 28, PCG_N2O = 265) => {
      const E_CO2 = A_litros * FE_CO2 / 1000;
      const E_CH4 = (A_litros * FE_CH4 * PCG_CH4) / 1000;
      const E_N2O = (A_litros * FE_N2O * PCG_N2O) / 1000;
      return (E_CO2 + E_CH4 + E_N2O) / 1000;
    },
    procesos_industriales: (Q, FE) => Q * FE,
    fugitivas: (m_kg, GWP) => (m_kg * GWP) / 1000,
    lubricantes: (actividad, FE) => actividad * FE,
    electricidad: (consumo_kwh, FE_kg_kwh) => (consumo_kwh * FE_kg_kwh) / 1000,
    transporte_generico: (dato_actividad, FE) => (dato_actividad * FE) / 1000,
    papel: (consumo_kg, FE) => consumo_kg * FE,
    papel_resmas: (resmas, FE, resmaKg = 2.5) => (resmas * resmaKg) * FE,
    residuos: (masa, FE) => masa * FE,
    remocion_forestal: (N, captura_ha, densidad) => (N / densidad) * captura_ha,
    reciclaje: (masa_t, FE_CH4_res, GWP_CH4 = 27) => masa_t * FE_CH4_res * GWP_CH4
  };

  const FORMULA_CONFIG = {
    combustion_estacionaria: {
      params: ['A_m3', 'FE_CO2', 'FE_CH4', 'FE_N2O', 'PCG_CH4', 'PCG_N2O'],
      defaults: { PCG_CH4: 28, PCG_N2O: 265 },
      fn: CARBON_FORMULAS.combustion_estacionaria
    },
    combustion_movil: {
      params: ['A_litros', 'FE_CO2', 'FE_CH4', 'FE_N2O', 'PCG_CH4', 'PCG_N2O'],
      defaults: { PCG_CH4: 28, PCG_N2O: 265 },
      fn: CARBON_FORMULAS.combustion_movil
    },
    procesos_industriales: {
      params: ['Q', 'FE'],
      fn: CARBON_FORMULAS.procesos_industriales
    },
    fugitivas: {
      params: ['m_kg', 'GWP'],
      fn: CARBON_FORMULAS.fugitivas
    },
    lubricantes: {
      params: ['actividad', 'FE'],
      fn: CARBON_FORMULAS.lubricantes
    },
    electricidad: {
      params: ['consumo_kwh', 'FE_kg_kwh'],
      fn: CARBON_FORMULAS.electricidad
    },
    transporte_generico: {
      params: ['dato_actividad', 'FE'],
      fn: CARBON_FORMULAS.transporte_generico
    },
    papel_resmas: {
      params: ['resmas', 'FE'],
      fn: CARBON_FORMULAS.papel_resmas
    },
    residuos: {
      params: ['masa', 'FE'],
      fn: CARBON_FORMULAS.residuos
    },
    remocion_forestal: {
      params: ['N', 'captura_ha', 'densidad'],
      fn: CARBON_FORMULAS.remocion_forestal
    },
    reciclaje: {
      params: ['masa_t', 'FE_CH4_res', 'GWP_CH4'],
      defaults: { GWP_CH4: 27 },
      fn: CARBON_FORMULAS.reciclaje
    }
  };

  const formatRecordContext = (record, extra) => {
    const parts = [];
    if (record.campus && record.campus.name) {
      parts.push(record.campus.name);
    }
    if (record.period) {
      parts.push(formatPeriodLabel(record.period));
    }
    if (extra) {
      parts.push(extra);
    }
    return parts.join(' · ');
  };

  const TABLE_DATA_CONFIG = {
    fuelStationary: {
      endpoint: 'fuel',
      mapRecord: (record) => [
        formatRecordContext(record),
        { value: record.fuel_code?.fuel_code, display: record.fuel_code?.description },
        { value: 'gal', display: 'Galones' },
        formatNumber(record.gallons),
        formatNumber(record.biogenic_co2),
        '',
        ''
      ]
    },
    fuelMobile: {
      endpoint: 'vehicle-fleet',
      mapRecord: (record) => [
        formatRecordContext(
          record,
          record.km_traveled ? `${formatNumber(record.km_traveled, 2)} km` : ''
        ),
        { value: record.fuel_code?.fuel_code, display: record.fuel_code?.description },
        { value: 'gal', display: 'Galones' },
        formatNumber(record.gallons),
        '',
        '',
        ''
      ]
    },
    extinguisherRefill: {
      endpoint: 'extinguisher-refill',
      mapRecord: (record) => [
        formatRecordContext(record),
        { value: record.ext_code?.ext_code, display: record.ext_code?.description },
        { value: 'kg', display: 'Kilogramos' },
        formatNumber(record.mass_kg),
        '',
        '',
        ''
      ]
    },
    electricity: {
      endpoint: 'electricity',
      mapRecord: (record) => [
        formatRecordContext(record),
        record.operator || '',
        { value: 'kwh', display: 'kWh' },
        formatNumber(record.kwh),
        '',
        '',
        ''
      ]
    },
    flights: {
      endpoint: 'flights',
      mapRecord: (record) => [
        `${record.origin || ''} → ${record.destination || ''}`.trim(),
        record.roundtrip === false
          ? { value: 'oneway', display: 'Solo ida' }
          : { value: 'roundtrip', display: 'Ida y vuelta' },
        { value: 'kgco2e', display: 'kg CO₂e' },
        '',
        formatNumber(record.co2_kg),
        '',
        ''
      ]
    },
    fieldPractice: {
      endpoint: 'field-practice',
      mapRecord: (record) => [
        `${record.origin || ''} → ${record.destination || ''}`.trim(),
        { value: record.fuel_code?.fuel_code, display: record.fuel_code?.description },
        { value: 'km', display: 'Kilómetros' },
        formatNumber(record.total_km, 2),
        '',
        '',
        ''
      ]
    },
    paper: {
      endpoint: 'paper',
      mapRecord: (record) => [
        formatRecordContext(record),
        { value: record.size?.size, display: record.size?.size },
        { value: 'reams', display: 'Resmas' },
        record.reams != null ? `${record.reams}` : '',
        '',
        '',
        ''
      ]
    },
    waste: {
      endpoint: 'waste',
      mapRecord: (record) => [
        formatRecordContext(record),
        { value: record.waste_code?.waste_code, display: record.waste_code?.description },
        { value: 'kg', display: 'Kilogramos' },
        formatNumber(record.kg),
        '',
        '',
        ''
      ]
    },
    removals: {
      endpoint: 'removals',
      mapRecord: (record) => [
        record.rtype || '',
        record.campus?.name || '',
        formatNumber(record.tco2e),
        '',
        ''
      ]
    }
  };

  const fetchCatalog = async (endpoint, { force = false } = {}) => {
    if (!endpoint) {
      return [];
    }

    if (!force && catalogCache.has(endpoint)) {
      return catalogCache.get(endpoint);
    }

    const response = await fetch(`${apiBase}/${endpoint}/`, {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`No se pudo obtener la información de ${endpoint} (${response.status})`);
    }

    const data = await response.json();
    const results = Array.isArray(data) ? data : data.results || [];
    catalogCache.set(endpoint, results);
    return results;
  };

  const populateSelectElement = (select, options, config) => {
    if (!select) {
      return;
    }

    const previousValue = select.value;
    select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Seleccione';
    select.appendChild(placeholder);

    options.forEach((item) => {
      const option = document.createElement('option');
      option.value = `${item[config.valueField]}`;
      option.textContent = config.label(item);
      select.appendChild(option);
    });

    if (previousValue) {
      const exists = options.some((item) => `${item[config.valueField]}` === previousValue);
      select.value = exists ? previousValue : '';
    }
  };

  const hydrateTable = async (table) => {
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) => normalise(th.textContent));

    for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
      const header = headers[columnIndex];
      const catalog = HEADER_CATALOG_MAP.find((entry) =>
        entry.matches.some((match) => header.includes(match))
      );

      if (!catalog) {
        continue;
      }

      let options = [];

      try {
        options = await fetchCatalog(catalog.endpoint);
      } catch (error) {
        console.error(error);
        continue;
      }

      const selects = table.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1}) select`);
      selects.forEach((select) => {
        populateSelectElement(select, options, catalog);
      });
    }
  };

  const hydrateAllTables = () => {
    const tables = document.querySelectorAll('table.emisiones-table');
    tables.forEach((table) => {
      hydrateTable(table).catch((error) => console.error(error));
    });
  };

  const toCamelCase = (text) =>
    (text || '')
      .toString()
      .toLowerCase()
      .split(/[_-]+/)
      .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join('');

  const readParamValue = (row, table, param, defaults = {}) => {
    const input = row.querySelector(`[data-carbon-field="${param}"]`);
    let value = input ? parseFloat(input.value) : undefined;

    if (Number.isNaN(value)) {
      value = undefined;
    }

    if (value === undefined) {
      const datasetKey = `default${toCamelCase(param)}`;
      const datasetValue = table.dataset[datasetKey];
      if (datasetValue !== undefined) {
        const parsed = parseFloat(datasetValue);
        value = Number.isNaN(parsed) ? undefined : parsed;
      }
    }

    if (value === undefined && defaults[param] !== undefined) {
      value = defaults[param];
    }

    return value;
  };

  const calculateTableEmissions = (table) => {
    const formulaKey = table.dataset.carbonFormula;
    const config = FORMULA_CONFIG[formulaKey];

    if (!config || !config.fn) {
      return;
    }

    let total = 0;

    table.querySelectorAll('tbody tr').forEach((row) => {
      const values = config.params.map((param) => readParamValue(row, table, param, config.defaults || {}));

      if (values.some((value) => value === undefined)) {
        return;
      }

      const result = config.fn(...values);

      if (Number.isNaN(result)) {
        return;
      }

      total += result;

      const output = row.querySelector('[data-carbon-result]') || row.querySelector('input[disabled]');
      if (output) {
        output.value = formatNumber(result);
      }
    });

    const totalCell = table.querySelector('[data-carbon-total]');
    if (totalCell) {
      totalCell.textContent = formatNumber(total);
    }
  };

  const setupTableActions = (table) => {
    const actions = table.parentElement?.querySelector('.action-buttons');
    if (!actions) {
      return;
    }

    const addRow = () => {
      const tbody = table.querySelector('tbody');
      const templateRow = tbody?.querySelector('tr');
      if (!tbody || !templateRow) {
        return;
      }

      const newRow = templateRow.cloneNode(true);
      resetRowInputs(newRow);
      tbody.appendChild(newRow);
      hydrateTable(table).catch((error) => console.error(error));
    };

    const removeRow = () => {
      const tbody = table.querySelector('tbody');
      if (!tbody || !tbody.lastElementChild) {
        return;
      }

      if (tbody.children.length > 1) {
        tbody.removeChild(tbody.lastElementChild);
      } else {
        resetRowInputs(tbody.firstElementChild);
        const output = tbody.firstElementChild?.querySelector('[data-carbon-result]');
        if (output) {
          output.value = '';
        }
      }
    };

    const exportTable = () => {
      const rows = Array.from(table.querySelectorAll('tr'));
      const csv = rows
        .map((row) =>
          Array.from(row.querySelectorAll('th,td'))
            .map((cell) => {
              const field = cell.querySelector('input, select');
              const value = field ? field.value : cell.textContent.trim();
              return `"${value}"`;
            })
            .join(',')
        )
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${table.closest('section')?.id || 'tabla'}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    };

    actions.querySelectorAll('[data-carbon-action]').forEach((button) => {
      const action = button.dataset.carbonAction;
      if (action === 'add-row') {
        button.addEventListener('click', addRow);
      } else if (action === 'remove-row') {
        button.addEventListener('click', removeRow);
      } else if (action === 'calculate') {
        button.addEventListener('click', () => calculateTableEmissions(table));
      } else if (action === 'export') {
        button.addEventListener('click', exportTable);
      }
    });
  };

  const initCarbonTables = () => {
    document.querySelectorAll('table.emisiones-table').forEach((table) => {
      setupTableActions(table);
    });
  };

  const resetRowInputs = (row) => {
    row.querySelectorAll('input').forEach((input) => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = input.defaultChecked;
      } else {
        input.value = '';
      }
    });

    row.querySelectorAll('select').forEach((select) => {
      if (select.options.length > 0) {
        select.selectedIndex = 0;
      } else {
        select.value = '';
      }
    });
  };

  const setCellValue = (cell, value, display) => {
    const input = cell.querySelector('input');
    const select = cell.querySelector('select');

    if (input) {
      if (input.type === 'checkbox') {
        input.checked = Boolean(value);
      } else {
        input.value = value ?? '';
      }
      return;
    }

    if (select) {
      const valueStr = value == null ? '' : `${value}`;
      if (!valueStr) {
        select.selectedIndex = 0;
        return;
      }

      const existing = Array.from(select.options).find((option) => option.value === valueStr);
      if (existing) {
        select.value = valueStr;
        return;
      }

      const option = document.createElement('option');
      option.value = valueStr;
      option.textContent = display || valueStr;
      option.selected = true;
      select.appendChild(option);
      return;
    }

    cell.textContent = value ?? '';
  };

  const populateTableFromRecords = async (table, config) => {
    const tbody = table.querySelector('tbody');
    if (!tbody) {
      return;
    }

    const templateRow = tbody.querySelector('tr');
    if (!templateRow) {
      return;
    }

    const template = templateRow.cloneNode(true);

    let records = [];
    try {
      records = await fetchCatalog(config.endpoint, { force: true });
    } catch (error) {
      console.error(error);
      return;
    }

    tbody.innerHTML = '';

    if (!records.length) {
      const emptyRow = template.cloneNode(true);
      resetRowInputs(emptyRow);
      tbody.appendChild(emptyRow);
      await hydrateTable(table);
      return;
    }

    records.forEach((record) => {
      const row = template.cloneNode(true);
      resetRowInputs(row);
      const cells = row.querySelectorAll('td');
      const values = config.mapRecord(record) || [];

      values.forEach((entry, index) => {
        const cell = cells[index];
        if (!cell) {
          return;
        }

        if (entry && typeof entry === 'object' && Object.prototype.hasOwnProperty.call(entry, 'value')) {
          setCellValue(cell, entry.value, entry.display);
        } else {
          setCellValue(cell, entry);
        }
      });

      tbody.appendChild(row);
    });

    await hydrateTable(table);
  };

  const initTableDataLoaders = () => {
    const buttons = document.querySelectorAll('.subtab[data-record-key]');

    const loadForButton = async (button) => {
      const key = button.dataset.recordKey;
      const subId = button.dataset.sub;

      if (!key || !subId) {
        return;
      }

      const config = TABLE_DATA_CONFIG[key];
      if (!config) {
        return;
      }

      const subScreen = document.getElementById(`sub-${subId}`);
      if (!subScreen) {
        return;
      }

      const table = subScreen.querySelector(`table[data-record-key="${key}"]`);
      if (!table) {
        return;
      }

      try {
        await populateTableFromRecords(table, config);
      } catch (error) {
        console.error(error);
      }
    };

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        loadForButton(button);
      });
    });

    document.querySelectorAll('.subtab.active[data-record-key]').forEach((button) => {
      loadForButton(button);
    });
  };

  const clearElement = (element) => {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  };

  const populateSelectFromSource = async (select, sourceKey, fieldConfig = {}) => {
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

    const previousValue = select.value;

    while (select.options.length > 1) {
      select.remove(1);
    }

    const labelFn = fieldConfig.optionLabel || source.label;
    const valueFn = fieldConfig.optionValue || source.value;

    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = `${valueFn(item)}`;
      option.textContent = labelFn(item);
      select.appendChild(option);
    });

    if (fieldConfig.default !== undefined) {
      const defaultValue = `${fieldConfig.default}`;
      const defaultOption = Array.from(select.options).find((option) => option.value === defaultValue);
      if (defaultOption) {
        defaultOption.defaultSelected = true;
        select.value = defaultValue;
        return;
      }
    }

    if (previousValue) {
      const exists = items.some((item) => `${valueFn(item)}` === previousValue);
      select.value = exists ? previousValue : '';
    } else {
      select.selectedIndex = 0;
    }
  };

  const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) {
      return meta.content;
    }

    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  const renderRecordForm = async (recordKey) => {
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
      if (fieldsWrapper) {
        clearElement(fieldsWrapper);
      }
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

    if (fieldsWrapper) {
      clearElement(fieldsWrapper);
      fieldsWrapper.classList.toggle('two-cols', (config.fields || []).length > 3);
    }

    const asyncTasks = [];

    (config.fields || []).forEach((field) => {
      if (!fieldsWrapper) {
        return;
      }

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
      await Promise.all(asyncTasks);
    } catch (error) {
      console.error(error);
    }
  };

  const extractErrorMessage = (errorResponse, fallback) => {
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
        .join(' ')
        .trim() || fallback;
    }

    return fallback;
  };

  const refreshTablesForRecord = (recordKey) => {
    document.querySelectorAll(`table[data-record-key="${recordKey}"]`).forEach((table) => {
      const config = TABLE_DATA_CONFIG[recordKey];
      if (!config) {
        return;
      }
      populateTableFromRecords(table, config).catch((error) => console.error(error));
    });
  };

  const submitRecordForm = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const status = form.querySelector('.form-status');
    const endpoint = form.dataset.endpoint;
    const recordKey = form.dataset.recordKey;
    const config = RECORD_CONFIG[recordKey];

    if (!endpoint || !config || !config.fields) {
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
      catalogCache.delete(endpoint);

      if (status) {
        status.textContent = 'Registro guardado correctamente.';
        status.classList.remove('error');
        status.classList.add('success');
      }

      if (recordKey) {
        refreshTablesForRecord(recordKey);
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
  };

  const initDataEntryForm = () => {
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

      renderRecordForm(value).catch((error) => console.error(error));
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
  };

  const downloadData = async () => {
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
  };

  const initDownloadButton = () => {
    const downloadButton = document.getElementById('downloadBtn');
    if (!downloadButton) {
      return;
    }

    downloadButton.addEventListener('click', downloadData);
  };

  document.addEventListener('DOMContentLoaded', () => {
    hydrateAllTables();
    initCarbonTables();
    initTableDataLoaders();
    initDataEntryForm();
    initDownloadButton();
  });
})();
