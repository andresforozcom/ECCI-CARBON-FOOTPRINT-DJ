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

    const downloadButton = document.getElementById('downloadBtn');
    if (downloadButton) {
      downloadButton.addEventListener('click', downloadData);
    }
  });
})();
