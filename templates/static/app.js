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

  function normalise(value) {
    return value ? value.toLowerCase().normalize('NFD').replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim() : '';
  }

  async function fetchCatalog(endpoint) {
    if (!endpoint) {
      return [];
    }

    if (catalogCache.has(endpoint)) {
      return catalogCache.get(endpoint);
    }

    const response = await fetch(`${apiBase}/${endpoint}/`, {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`No se pudo obtener la información de ${endpoint} (${response.status})`);
    }

    const data = await response.json();
    catalogCache.set(endpoint, data);
    return data;
  }

  function populateSelect(select, options, config) {
    if (!select) {
      return;
    }

    const existingValue = select.value;
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

    if (existingValue) {
      const hasValue = options.some((item) => `${item[config.valueField]}` === existingValue);
      select.value = hasValue ? existingValue : '';
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

      let options = [];
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

  function resetRowInputs(row) {
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
  }

  function setCellValue(cell, value, display) {
    const input = cell.querySelector('input');
    const select = cell.querySelector('select');

    if (input) {
      input.value = value ?? '';
      return;
    }

    if (select) {
      const valueStr = value == null ? '' : `${value}`;
      if (!valueStr) {
        select.selectedIndex = 0;
        return;
      }

      const existingOption = Array.from(select.options).find((option) => option.value === valueStr);
      if (existingOption) {
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
  }

  function formatNumber(value, decimals = 3) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '';
    }
    return Number(value).toFixed(decimals);
  }

  function formatRecordContext(record, extra) {
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
  }

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
        formatPeriodLabel(record.period),
        { value: record.campus?.id, display: record.campus?.name },
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
        { value: 'tco2e', display: 'tCO₂e' },
        formatNumber(record.tco2e),
        '',
        ''
      ]
    }
  };

  async function populateTableFromRecords(table, config) {
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
      records = await fetchCatalog(config.endpoint);
    } catch (error) {
      console.error(error);
      return;
    }

    tbody.innerHTML = '';

    if (!records.length) {
      const emptyRow = template.cloneNode(true);
      resetRowInputs(emptyRow);
      tbody.appendChild(emptyRow);
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

        if (entry && typeof entry === 'object' && 'value' in entry) {
          setCellValue(cell, entry.value, entry.display);
        } else {
          setCellValue(cell, entry);
        }
      });

      tbody.appendChild(row);
    });
  }

  function initTableDataLoaders() {
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

      await populateTableFromRecords(table, config);
    };

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        loadForButton(button);
      });
    });

    document.querySelectorAll('.subtab.active[data-record-key]').forEach((button) => {
      loadForButton(button);
    });
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
    initTableDataLoaders();

    const downloadButton = document.getElementById('downloadBtn');
    if (downloadButton) {
      downloadButton.addEventListener('click', downloadData);
    }
  });
})();
