# 🌱 ECCI-CARBON-FOOTPRINT-DJ

Backend en **Django + Django REST Framework** para la gestión y reporte de la **Huella de Carbono Corporativa** de la Universidad ECCI.

Este sistema permite registrar y analizar consumos energéticos, emisiones de gases de efecto invernadero (GEI), residuos, viajes, compras y remociones de carbono.

---

## 🧩 Tecnologías Principales

- **Python 3.10+**
- **Django 5+**
- **Django REST Framework (DRF)**
- **Django Extensions**
- **PyGraphviz + Graphviz** (para diagramas ERD)
- **SQLite3** (base de datos por defecto)

---

## ⚙️ Estructura del Proyecto

```
ECCI-CARBON-FOOTPRINT-DJ/
│
├── carbon_footprint/                 # App principal
│   ├── migrations/
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py                     # Modelos de base de datos
│   ├── serializers.py                # Serializadores DRF
│   ├── tests.py
│   ├── urls.py                       # Endpoints API REST
│   └── views.py                      # Vistas / controladores
│
├── ecci_carbon_footprint_dj/         # Configuración del proyecto Django
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py                   # Configuración general
│   ├── urls.py                       # Enrutamiento global
│   └── wsgi.py
│
├── db.sqlite3                        # Base de datos local
├── manage.py                         # Comando principal de Django
└── venv/                             # Entorno virtual (no se sube al repo)
```

---

## 🚀 Instalación y Configuración

### 1️⃣ Crear entorno virtual
```bash
python -m venv venv
source venv/bin/activate       # Linux / macOS
venv\Scripts\activate        # Windows
```

### 2️⃣ Instalar dependencias
```bash
pip install django djangorestframework django-extensions pygraphviz
```

Opcional (para reportes y exportaciones):
```bash
pip install pandas openpyxl reportlab
```

---

## 🧠 Configuración del Proyecto

Editar el archivo `ecci_carbon_footprint_dj/settings.py` y agregar:

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'django_extensions',
    'carbon_footprint',  # App principal
]

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly'
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
        'rest_framework.authentication.TokenAuthentication'
    ]
}
```

---

## 🧱 Migrar la base de datos

```bash
python manage.py makemigrations carbon_footprint
python manage.py migrate
```

Crear un usuario administrador:
```bash
python manage.py createsuperuser
```

---

## 🌐 Ejecutar el servidor

```bash
python manage.py runserver
```

Acceder a:
- **API principal:** http://127.0.0.1:8000/api/
- **Panel Admin:** http://127.0.0.1:8000/admin/

---

## 🔌 Endpoints REST disponibles

| Módulo | Endpoint | Descripción |
|--------|-----------|-------------|
| Campus | `/api/campus/` | CRUD de sedes |
| Periodos | `/api/periods/` | Años y meses |
| Electricidad | `/api/electricity/` | Consumos eléctricos |
| Gas Natural | `/api/natural-gas/` | Consumo de gas natural |
| Combustibles | `/api/fuel/` | Consumo de combustible |
| Flota Vehicular | `/api/vehicle-fleet/` | Consumo de flota |
| Extintores | `/api/extinguisher-refill/` | Recargas de extintores |
| Residuos | `/api/waste/` | Registros de residuos |
| Papel | `/api/paper/` | Consumo de papel |
| Compras | `/api/purchases/` | Bienes y servicios |
| Vuelos | `/api/flights/` | Vuelos corporativos |
| Prácticas | `/api/field-practice/` | Viajes de campo |
| Remociones | `/api/removals/` | Captura / reciclaje de CO₂ |
| Factores de Emisión | `/api/emission-factors/` | Catálogo CO₂e |

---

## 🧾 Ejemplos de Requests

### POST `/api/natural-gas/`
```json
{
  "period_id": 1,
  "campus_id": 2,
  "operator": "Vanti S.A.",
  "m3": 540.75
}
```

### POST `/api/fuel/`
```json
{
  "period_id": 1,
  "campus_id": 2,
  "fuel_code_id": "DIESEL",
  "gallons": 150.5
}
```

### POST `/api/waste/`
```json
{
  "period_id": 1,
  "campus_id": 2,
  "waste_code_id": "PELIGROSO",
  "kg": 85.0
}
```

---

## 🧮 Generar Diagrama ERD (Entidad-Relación)

Asegúrate de tener **Graphviz** instalado.

**Linux / macOS**
```bash
sudo apt install graphviz graphviz-dev
```

**Windows**
- Descargar desde [https://graphviz.org/download/](https://graphviz.org/download/)
- Agregar la carpeta `bin/` de Graphviz al PATH
- Verificar instalación:
  ```bash
  dot -V
  ```

Luego ejecutar:
```bash
python manage.py graph_models carbon_footprint -o erd_carbon_footprint.svg
```

Para una versión simplificada:
```bash
python manage.py graph_models carbon_footprint --disable-fields -o erd_simple.svg
```

---

## 🧰 Comandos útiles

| Acción | Comando |
|--------|----------|
| Crear migraciones | `python manage.py makemigrations` |
| Migrar BD | `python manage.py migrate` |
| Crear superusuario | `python manage.py createsuperuser` |
| Ejecutar servidor | `python manage.py runserver` |
| Generar ERD | `python manage.py graph_models carbon_footprint -o erd.svg` |
| Abrir shell | `python manage.py shell` |

---

## 📦 Exportar datos a Excel o CSV

```python
import pandas as pd
from carbon_footprint.models import ElectricityConsumption

qs = ElectricityConsumption.objects.all().values()
df = pd.DataFrame(qs)
df.to_excel('electricidad.xlsx', index=False)
```

---

## 📄 Licencia

Proyecto bajo licencia **MIT** — puedes usarlo, modificarlo y distribuirlo libremente citando su origen.

---

## ✨ Autor

**Equipo de Ingeniería Ambiental — Universidad ECCI**  
Arquitectura y desarrollo: *[Tu nombre / rol / contacto]*
