# 🧩 ANÁLISIS TÉCNICO Y FUNCIONAL DEL PROYECTO ECCI-CARBON-FOOTPRINT-DJ

---

## 1. Análisis Funcional del Backend Django REST Framework

El proyecto **ECCI-CARBON-FOOTPRINT-DJ** implementa un sistema de gestión de la huella de carbono institucional con base en Django y Django REST Framework.  
Su objetivo principal es **registrar y calcular las emisiones de gases de efecto invernadero (GEI)** asociadas a las actividades de la Universidad ECCI, bajo el marco metodológico del **GHG Protocol**.

### 1.1 Estructura funcional actual

- **Aplicación principal:** `carbon_footprint`
- **Framework:** Django 5 + DRF
- **Componentes identificados:**
  - Modelos de datos (tablas base de consumos y factores de emisión).
  - Serializadores para exponer datos vía API.
  - Vistas y ViewSets para CRUD.
  - Configuración REST básica (autenticación, permisos).
  - Rutas `/api/` expuestas mediante `urls.py`.

### 1.2 Funciones implementadas

El código actual cubre la gestión de:

- **Campus:** registro de sedes.
- **Periodos:** año/mes con fechas.
- **Fuentes y categorías de emisión.**
- **Factores de emisión.**
- **Registros de consumo:** electricidad, gas natural, combustibles, papel, residuos, extintores, etc.

No obstante, **no se identifican endpoints de cálculo o consolidación**, ni mecanismos automáticos para aplicar factores de emisión sobre los consumos registrados.

---

## 2. Comparación con los Documentos Metodológicos

Los documentos oficiales de ECCI (Informe 2023 y Herramienta Excel de cálculo) describen un flujo estructurado de cálculo de emisiones:

| Categoría | Variable principal | Unidad | Factor de emisión | Resultado esperado |
|------------|--------------------|---------|-------------------|--------------------|
| Electricidad | kWh | kWh | 0.112 kgCO₂/kWh | tCO₂e |
| Gas natural | m³ | 1.98 kgCO₂/m³ | tCO₂e |
| Combustibles | galones | gasolina: 7.618, diésel: 10.18 | tCO₂e |
| Papel | kg/ream | 1.05 kgCO₂/kg | tCO₂e |
| Extintores | kg agente | GWP agente (CO₂, HCFC-123) | tCO₂e |
| Residuos | kg | 0.048 tCH₄/t o 0.50 kgCO₂/kg | tCO₂e |
| Vuelos | km o ticket | factor ICAO | tCO₂e |
| Remociones | - | valor negativo | -tCO₂e |

### 2.1 Inconsistencias detectadas

| Aspecto | En el código | En los documentos | Acción recomendada |
|----------|---------------|-------------------|--------------------|
| Cálculo de emisiones | No implementado | Obligatorio (Excel/Informe) | Implementar endpoint `/api/calculate/` |
| Campos `uncertainty_pct` | Ausente en modelos | Presente en informe | Agregar campo en `EmissionFactor` |
| Propagación de incertidumbre | No existe | Definida en Informe ECCI | Añadir lógica de cálculo |
| Importación desde Excel | No implementada | Necesaria para reporte | Crear comando `import_huella` |
| Resultados anuales consolidados | No existen | Requerido (Informe 2023) | Crear `/api/report/annual/` |

---

## 3. Análisis Técnico Detallado del Código

### 3.1 Estructura General

```
carbon_footprint/
│
├── models.py
├── serializers.py
├── views.py
├── urls.py
└── admin.py
```

El esquema relacional está bien diseñado y cumple con la tercera forma normal (3FN).  
Sin embargo, presenta **ausencia de lógica de negocio**, pues los cálculos de tCO₂e aún no están integrados.

### 3.2 Revisión por archivo

#### a) models.py

- ✅ Modelos bien estructurados para `Campus`, `Period`, `EmissionFactor`, `FuelType`, `WasteType`, `ExtinguisherType`, `PaperWeightCatalog`.
- ✅ Relaciones `ForeignKey` correctamente definidas.
- ⚠️ Faltan campos relevantes:
  - `EmissionFactor.uncertainty_pct`
  - `EmissionFactor.gwp_100yr`
  - `PaperConsumption.kg_total` (campo calculado)
  - `WasteRecord.kg_aprovechable`, `kg_no_aprovechable`
- ⚙️ Recomendación técnica:
  ```python
  class EmissionFactor(models.Model):
      agent = models.CharField(max_length=100)
      gas = models.CharField(max_length=30)
      factor_value = models.FloatField()
      unit = models.CharField(max_length=50)
      source_ref = models.CharField(max_length=200, blank=True, null=True)
      year_applic = models.PositiveIntegerField(blank=True, null=True)
      gwp_100yr = models.FloatField(blank=True, null=True)
      uncertainty_pct = models.FloatField(blank=True, null=True)
  ```

#### b) serializers.py

- ✅ Serializadores CRUD básicos.
- ⚠️ No hay validación de rangos (`>=0`).
- ⚙️ Agregar validaciones:
  ```python
  def validate_kwh(self, value):
      if value < 0:
          raise serializers.ValidationError("El valor de kWh no puede ser negativo.")
      return value
  ```

#### c) views.py

- ✅ Implementa `ModelViewSet` para cada entidad.
- ⚠️ Falta lógica de negocio (cálculos).
- ⚙️ Se recomienda añadir:
  - Endpoint `/api/calculate/`
  - Endpoint `/api/report/annual/`
  - Endpoint `/api/import/excel/`

#### d) urls.py

- ✅ Enrutamiento correcto con `DefaultRouter`.
- ⚠️ Agregar rutas personalizadas:
  ```python
  path("api/calculate/", CalculateEmissionsView.as_view(), name="calculate_emissions"),
  path("api/report/annual/", AnnualReportView.as_view(), name="annual_report"),
  ```

#### e) settings.py

- ⚙️ Se recomienda agregar:
  ```python
  REST_FRAMEWORK = {
      "DEFAULT_PERMISSION_CLASSES": [
          "rest_framework.permissions.IsAuthenticatedOrReadOnly"
      ],
      "DEFAULT_AUTHENTICATION_CLASSES": [
          "rest_framework.authentication.SessionAuthentication",
          "rest_framework.authentication.TokenAuthentication"
      ]
  }
  ```

---

## 4. Diseño de la Calculadora de Huella de Carbono

La calculadora debe replicar la lógica del Excel corporativo, aplicando los **factores de emisión** sobre los **datos de actividad**.

### 4.1 Lógica general

Pseudocódigo Python de la función de cálculo principal:

```python
def calculate_emissions(period_id=None, campus_id=None):
    data = {}

    # Electricidad
    elec_records = ElectricityConsumption.objects.filter(period_id=period_id, campus_id=campus_id)
    factor_elec = EmissionFactor.objects.get(agent="Electricidad", gas="CO2")
    data["electricity_tCO2e"] = sum(r.kwh * factor_elec.factor_value / 1000 for r in elec_records)

    # Gas natural
    gas_records = NaturalGasConsumption.objects.filter(period_id=period_id, campus_id=campus_id)
    factor_gas = EmissionFactor.objects.get(agent="Gas Natural", gas="CO2")
    data["natural_gas_tCO2e"] = sum(r.m3 * factor_gas.factor_value / 1000 for r in gas_records)

    # Combustibles
    fuel_records = FuelConsumption.objects.filter(period_id=period_id, campus_id=campus_id)
    for fuel in fuel_records:
        factor = EmissionFactor.objects.get(agent=fuel.fuel_code.description, gas="CO2")
        data.setdefault("fuel_tCO2e", 0)
        data["fuel_tCO2e"] += fuel.gallons * factor.factor_value / 1000

    # Papel
    paper_records = PaperConsumption.objects.filter(period_id=period_id, campus_id=campus_id)
    factor_paper = EmissionFactor.objects.get(agent="Papel", gas="CO2")
    data["paper_tCO2e"] = sum(
        (r.reams * r.size.kg_per_ream) * factor_paper.factor_value / 1000 for r in paper_records
    )

    # Residuos
    waste_records = WasteRecord.objects.filter(period_id=period_id, campus_id=campus_id)
    for w in waste_records:
        factor = EmissionFactor.objects.get(agent=w.waste_code.description, gas="CO2")
        data.setdefault("waste_tCO2e", 0)
        data["waste_tCO2e"] += w.kg * factor.factor_value / 1000

    # Extintores
    refills = ExtinguisherRefill.objects.filter(period_id=period_id, campus_id=campus_id)
    for e in refills:
        gwp = e.ext_code.gwp_100yr or 1
        data.setdefault("extinguisher_tCO2e", 0)
        data["extinguisher_tCO2e"] += e.mass_kg * gwp / 1000

    # Remociones (negativas)
    removals = RemovalRecord.objects.filter(period_id=period_id, campus_id=campus_id)
    data["removals_tCO2e"] = sum(r.tco2e for r in removals)

    data["total_tCO2e"] = sum(v for k, v in data.items() if k.endswith("tCO2e"))
    data["net_total_tCO2e"] = data["total_tCO2e"] + data["removals_tCO2e"]
    return data
```

### 4.2 Endpoint REST

```python
from rest_framework.views import APIView
from rest_framework.response import Response

class CalculateEmissionsView(APIView):
    def get(self, request):
        period = request.query_params.get("period_id")
        campus = request.query_params.get("campus_id")
        results = calculate_emissions(period, campus)
        return Response(results)
```

**Respuesta esperada (JSON):**
```json
{
  "electricity_tCO2e": 168.37,
  "natural_gas_tCO2e": 10.55,
  "fuel_tCO2e": 26.55,
  "paper_tCO2e": 2.11,
  "waste_tCO2e": 40.07,
  "extinguisher_tCO2e": 20.88,
  "removals_tCO2e": -5.64,
  "net_total_tCO2e": 262.89
}
```

---

## 5. Recomendaciones Finales

| Área | Acción | Descripción |
|------|---------|-------------|
| Modelos | Agregar campos faltantes | `uncertainty_pct`, `gwp_100yr`, `kg_total` |
| Serializers | Añadir validaciones | Rango y formato de datos |
| Vistas | Implementar endpoints de cálculo y reporte | `/api/calculate/`, `/api/report/annual/` |
| Datos | Cargar factores de emisión estándar | Basados en UPME, XM, ICAO |
| Tests | Crear pruebas unitarias | Validación de cálculos y fixtures |
| Importación | Crear comando `import_huella` | Para cargar el Excel corporativo |
| Rendimiento | Usar `select_related()` y `prefetch_related()` | Optimización ORM |

---

## 6. Conclusión

El backend actual posee una arquitectura sólida en términos de modelos y estructura base, pero **carece de la lógica de cálculo y consolidación de emisiones**, pieza fundamental del sistema de huella de carbono.  
La implementación del endpoint `/api/calculate/` con la lógica descrita en este documento permitirá replicar fielmente la calculadora Excel y cumplir con el alcance metodológico del proyecto ECCI.
