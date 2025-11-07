from django.db import models

# =========================
# BASE
# =========================

class Campus(models.Model):
    name = models.CharField(max_length=100)
    city = models.CharField(max_length=100, blank=True, null=True)
    locality = models.CharField(max_length=100, blank=True, null=True)
    area_m2 = models.FloatField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Period(models.Model):
    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField(blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)

    class Meta:
        unique_together = ('year', 'month')
        ordering = ['-year', '-month']

    def __str__(self):
        return f"{self.year}-{self.month or 'Anual'}"


# =========================
# CATEGORÍAS / FUENTES
# =========================

class EmissionCategory(models.Model):
    code = models.PositiveIntegerField(unique=True)  # 1,2,3...
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class EmissionSource(models.Model):
    """
    Fuente concreta conectada con la lógica de la herramienta.
    Ej: 'Combustibles estacionarios', 'Combustibles móviles', 'Electricidad', etc.
    """
    category = models.ForeignKey(EmissionCategory, on_delete=models.CASCADE, related_name="sources")
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    unit_default = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.code} - {self.name}"


class EmissionFactor(models.Model):
    """
    Factor por gas. Luego el cálculo suma gas.factor_value * GWP.
    """
    source = models.ForeignKey(EmissionSource, on_delete=models.CASCADE, related_name="factors")
    agent = models.CharField(max_length=100)        # p.ej. 'Diésel', 'Electricidad UPME 2022'
    gas = models.CharField(max_length=30)           # CO2, CH4, N2O, HFC-134a...
    factor_value = models.FloatField()              # kg gas / unidad actividad
    unit = models.CharField(max_length=50)          # 'kWh', 'gal', 'kg', etc.
    gwp_100yr = models.FloatField(blank=True, null=True)  # si no viene, asumir 1 para CO2
    source_ref = models.CharField(max_length=200, blank=True, null=True)
    year_applic = models.PositiveIntegerField(blank=True, null=True)
    uncertainty_pct = models.FloatField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=["agent", "gas", "unit", "year_applic"]),
        ]

    def __str__(self):
        return f"{self.agent} - {self.gas} ({self.factor_value} {self.unit})"


# =========================
# CATÁLOGOS AUXILIARES
# =========================

class FuelType(models.Model):
    fuel_code = models.CharField(max_length=40, primary_key=True)
    description = models.CharField(max_length=100)

    def __str__(self):
        return self.description


class WasteType(models.Model):
    waste_code = models.CharField(max_length=40, primary_key=True)
    description = models.CharField(max_length=150)
    treatment = models.CharField(max_length=100, blank=True, null=True)  # relleno, compostaje, reciclaje

    def __str__(self):
        return self.description


class ExtinguisherType(models.Model):
    ext_code = models.CharField(max_length=40, primary_key=True)
    description = models.CharField(max_length=150)
    gwp_100yr = models.FloatField(blank=True, null=True)

    def __str__(self):
        return self.description


class PaperWeightCatalog(models.Model):
    size = models.CharField(max_length=20, primary_key=True)  # A4, Carta, etc
    kg_per_ream = models.FloatField()

    def __str__(self):
        return f"{self.size} ({self.kg_per_ream} kg/ream)"


# =========================
# REGISTROS OPERATIVOS
# =========================

class ElectricityConsumption(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="electricity_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="electricity_records")
    description = models.CharField(max_length=150, blank=True, null=True)
    kwh = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="electricity_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)

    def __str__(self):
        return f"{self.campus} - {self.kwh} kWh ({self.period})"


class NaturalGasConsumption(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="gas_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="gas_records")
    fuel_type = models.ForeignKey(FuelType, on_delete=models.PROTECT, related_name="gas_usages")
    m3 = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="gas_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class FuelConsumption(models.Model):
    """
    Combustibles en fuentes estacionarias (ED Comb_Estacionaria).
    """
    SCOPE_CHOICES = (
        ("stationary", "Fuente estacionaria"),
    )
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="fuel_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="fuel_records")
    description = models.CharField(max_length=150)
    fuel_type = models.ForeignKey(FuelType, on_delete=models.PROTECT, related_name="fuel_consumptions")
    unit = models.CharField(max_length=20)
    amount = models.FloatField()
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default="stationary")
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fuel_consumptions"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class VehicleFleetConsumption(models.Model):
    """
    Combustibles móviles (ED Comb_Móvil).
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="fleet_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="fleet_records")
    description = models.CharField(max_length=150)
    fuel_type = models.ForeignKey(FuelType, on_delete=models.PROTECT, related_name="vehicle_fleet_consumptions")
    unit = models.CharField(max_length=20)
    amount = models.FloatField()
    km_traveled = models.FloatField(blank=True, null=True)
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fleet_consumptions"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class IndustrialProcessEmission(models.Model):
    """
    ED Proc_Industriales.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="industrial_processes")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="industrial_processes")
    description = models.CharField(max_length=200)
    process_type = models.CharField(max_length=100)
    unit = models.CharField(max_length=20)
    activity = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="industrial_processes"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class LubricantConsumption(models.Model):
    """
    ED_Lubricantes.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="lubricant_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="lubricant_records")
    description = models.CharField(max_length=150)
    unit = models.CharField(max_length=20)
    amount = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="lubricant_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class ExtinguisherRefill(models.Model):
    """
    ED_Fugitivas.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="extinguisher_refills")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="extinguisher_refills")
    description = models.CharField(max_length=150)
    ext_type = models.ForeignKey(ExtinguisherType, on_delete=models.PROTECT, related_name="refills")
    unit = models.CharField(max_length=20, default="kg")
    amount = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="extinguisher_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class WasteRecord(models.Model):
    """
    EI Residuos.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="waste_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="waste_records")
    waste_type = models.ForeignKey(WasteType, on_delete=models.PROTECT, related_name="waste_records")
    unit = models.CharField(max_length=20, default="kg")
    amount = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="waste_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class PaperConsumption(models.Model):
    """
    EI Cons_papel.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="paper_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="paper_records")
    size = models.ForeignKey(PaperWeightCatalog, on_delete=models.PROTECT, related_name="paper_usages")
    reams = models.PositiveIntegerField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="paper_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class Flight(models.Model):
    """
    EI Trans_y_hospedaje (viajes aéreos).
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="flights")
    description = models.CharField(max_length=200, blank=True, null=True)
    origin = models.CharField(max_length=100)
    destination = models.CharField(max_length=100)
    passengers = models.PositiveIntegerField(default=1)
    km = models.FloatField(blank=True, null=True)
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="flight_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class GroundTransportRecord(models.Model):
    """
    EI Trans_y_hospedaje - transporte terrestre tercerizado / larga distancia.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="ground_transports")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="ground_transports")
    description = models.CharField(max_length=200)
    unit = models.CharField(max_length=20)      # km, pax-km, etc.
    amount = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="ground_transports"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class LodgingRecord(models.Model):
    """
    EI Trans_y_hospedaje - hospedaje.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="lodging_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="lodging_records")
    description = models.CharField(max_length=200)
    nights = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="lodging_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class FieldPracticeTrip(models.Model):
    """
    Desplazamiento terrestre por prácticas (ya en EI Trans_y_hospedaje).
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="practice_trips")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="practice_trips")
    description = models.CharField(max_length=200, blank=True, null=True)
    origin = models.CharField(max_length=100)
    destination = models.CharField(max_length=100)
    km_oneway = models.FloatField()
    total_km = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="practice_trips"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class RemovalRecord(models.Model):
    """
    Remociones (forestal, residuos aprovechables).
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="removal_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="removal_records")
    rtype = models.CharField(max_length=100)  # 'forestal', 'residuos_aprovechables', etc.
    description = models.CharField(max_length=200, blank=True, null=True)
    tco2e = models.FloatField()

    def __str__(self):
        return f"{self.rtype} - {self.tco2e} tCO2e"


class EmissionSummary(models.Model):
    """
    Resultados (Hojas R_* y Resultados): totales consolidados.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="summaries")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="summaries", null=True, blank=True)
    category = models.ForeignKey(EmissionCategory, on_delete=models.CASCADE, related_name="summaries")
    scope_label = models.CharField(max_length=50, blank=True, null=True)  # Alcance 1, 2, 3
    is_biogenic = models.BooleanField(default=False)
    total_tco2e = models.FloatField()

    class Meta:
        unique_together = ('period', 'campus', 'category', 'scope_label', 'is_biogenic')
from django.db import models

# =========================
# BASE
# =========================

class Campus(models.Model):
    name = models.CharField(max_length=100)
    city = models.CharField(max_length=100, blank=True, null=True)
    locality = models.CharField(max_length=100, blank=True, null=True)
    area_m2 = models.FloatField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Period(models.Model):
    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField(blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)

    class Meta:
        unique_together = ('year', 'month')
        ordering = ['-year', '-month']

    def __str__(self):
        return f"{self.year}-{self.month or 'Anual'}"


# =========================
# CATEGORÍAS / FUENTES
# =========================

class EmissionCategory(models.Model):
    code = models.PositiveIntegerField(unique=True)  # 1,2,3...
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class EmissionSource(models.Model):
    """
    Fuente concreta conectada con la lógica de la herramienta.
    Ej: 'Combustibles estacionarios', 'Combustibles móviles', 'Electricidad', etc.
    """
    category = models.ForeignKey(EmissionCategory, on_delete=models.CASCADE, related_name="sources")
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    unit_default = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.code} - {self.name}"


class EmissionFactor(models.Model):
    """
    Factor por gas. Luego el cálculo suma gas.factor_value * GWP.
    """
    source = models.ForeignKey(EmissionSource, on_delete=models.CASCADE, related_name="factors")
    agent = models.CharField(max_length=100)        # p.ej. 'Diésel', 'Electricidad UPME 2022'
    gas = models.CharField(max_length=30)           # CO2, CH4, N2O, HFC-134a...
    factor_value = models.FloatField()              # kg gas / unidad actividad
    unit = models.CharField(max_length=50)          # 'kWh', 'gal', 'kg', etc.
    gwp_100yr = models.FloatField(blank=True, null=True)  # si no viene, asumir 1 para CO2
    source_ref = models.CharField(max_length=200, blank=True, null=True)
    year_applic = models.PositiveIntegerField(blank=True, null=True)
    uncertainty_pct = models.FloatField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=["agent", "gas", "unit", "year_applic"]),
        ]

    def __str__(self):
        return f"{self.agent} - {self.gas} ({self.factor_value} {self.unit})"


# =========================
# CATÁLOGOS AUXILIARES
# =========================

class FuelType(models.Model):
    fuel_code = models.CharField(max_length=40, primary_key=True)
    description = models.CharField(max_length=100)

    def __str__(self):
        return self.description


class WasteType(models.Model):
    waste_code = models.CharField(max_length=40, primary_key=True)
    description = models.CharField(max_length=150)
    treatment = models.CharField(max_length=100, blank=True, null=True)  # relleno, compostaje, reciclaje

    def __str__(self):
        return self.description


class ExtinguisherType(models.Model):
    ext_code = models.CharField(max_length=40, primary_key=True)
    description = models.CharField(max_length=150)
    gwp_100yr = models.FloatField(blank=True, null=True)

    def __str__(self):
        return self.description


class PaperWeightCatalog(models.Model):
    size = models.CharField(max_length=20, primary_key=True)  # A4, Carta, etc
    kg_per_ream = models.FloatField()

    def __str__(self):
        return f"{self.size} ({self.kg_per_ream} kg/ream)"


# =========================
# REGISTROS OPERATIVOS
# =========================

class ElectricityConsumption(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="electricity_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="electricity_records")
    description = models.CharField(max_length=150, blank=True, null=True)
    kwh = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="electricity_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)

    def __str__(self):
        return f"{self.campus} - {self.kwh} kWh ({self.period})"


class NaturalGasConsumption(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="gas_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="gas_records")
    fuel_type = models.ForeignKey(FuelType, on_delete=models.PROTECT, related_name="gas_usages")
    m3 = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="gas_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class FuelConsumption(models.Model):
    """
    Combustibles en fuentes estacionarias (ED Comb_Estacionaria).
    """
    SCOPE_CHOICES = (
        ("stationary", "Fuente estacionaria"),
    )
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="fuel_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="fuel_records")
    description = models.CharField(max_length=150)
    fuel_type = models.ForeignKey(FuelType, on_delete=models.PROTECT, related_name="fuel_consumptions")
    unit = models.CharField(max_length=20)
    amount = models.FloatField()
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default="stationary")
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fuel_consumptions"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class VehicleFleetConsumption(models.Model):
    """
    Combustibles móviles (ED Comb_Móvil).
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="fleet_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="fleet_records")
    description = models.CharField(max_length=150)
    fuel_type = models.ForeignKey(FuelType, on_delete=models.PROTECT, related_name="vehicle_fleet_consumptions")
    unit = models.CharField(max_length=20)
    amount = models.FloatField()
    km_traveled = models.FloatField(blank=True, null=True)
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fleet_consumptions"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class IndustrialProcessEmission(models.Model):
    """
    ED Proc_Industriales.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="industrial_processes")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="industrial_processes")
    description = models.CharField(max_length=200)
    process_type = models.CharField(max_length=100)
    unit = models.CharField(max_length=20)
    activity = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="industrial_processes"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class LubricantConsumption(models.Model):
    """
    ED_Lubricantes.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="lubricant_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="lubricant_records")
    description = models.CharField(max_length=150)
    unit = models.CharField(max_length=20)
    amount = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="lubricant_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class ExtinguisherRefill(models.Model):
    """
    ED_Fugitivas.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="extinguisher_refills")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="extinguisher_refills")
    description = models.CharField(max_length=150)
    ext_type = models.ForeignKey(ExtinguisherType, on_delete=models.PROTECT, related_name="refills")
    unit = models.CharField(max_length=20, default="kg")
    amount = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="extinguisher_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class WasteRecord(models.Model):
    """
    EI Residuos.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="waste_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="waste_records")
    waste_type = models.ForeignKey(WasteType, on_delete=models.PROTECT, related_name="waste_records")
    unit = models.CharField(max_length=20, default="kg")
    amount = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="waste_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class PaperConsumption(models.Model):
    """
    EI Cons_papel.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="paper_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="paper_records")
    size = models.ForeignKey(PaperWeightCatalog, on_delete=models.PROTECT, related_name="paper_usages")
    reams = models.PositiveIntegerField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="paper_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class Flight(models.Model):
    """
    EI Trans_y_hospedaje (viajes aéreos).
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="flights")
    description = models.CharField(max_length=200, blank=True, null=True)
    origin = models.CharField(max_length=100)
    destination = models.CharField(max_length=100)
    passengers = models.PositiveIntegerField(default=1)
    km = models.FloatField(blank=True, null=True)
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="flight_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class GroundTransportRecord(models.Model):
    """
    EI Trans_y_hospedaje - transporte terrestre tercerizado / larga distancia.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="ground_transports")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="ground_transports")
    description = models.CharField(max_length=200)
    unit = models.CharField(max_length=20)      # km, pax-km, etc.
    amount = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="ground_transports"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class LodgingRecord(models.Model):
    """
    EI Trans_y_hospedaje - hospedaje.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="lodging_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="lodging_records")
    description = models.CharField(max_length=200)
    nights = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="lodging_usages"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class FieldPracticeTrip(models.Model):
    """
    Desplazamiento terrestre por prácticas (ya en EI Trans_y_hospedaje).
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="practice_trips")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="practice_trips")
    description = models.CharField(max_length=200, blank=True, null=True)
    origin = models.CharField(max_length=100)
    destination = models.CharField(max_length=100)
    km_oneway = models.FloatField()
    total_km = models.FloatField()
    emission_factor = models.ForeignKey(
        EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="practice_trips"
    )
    total_tco2e = models.FloatField(blank=True, null=True)


class RemovalRecord(models.Model):
    """
    Remociones (forestal, residuos aprovechables).
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="removal_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="removal_records")
    rtype = models.CharField(max_length=100)  # 'forestal', 'residuos_aprovechables', etc.
    description = models.CharField(max_length=200, blank=True, null=True)
    tco2e = models.FloatField()

    def __str__(self):
        return f"{self.rtype} - {self.tco2e} tCO2e"


class EmissionSummary(models.Model):
    """
    Resultados (Hojas R_* y Resultados): totales consolidados.
    """
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="summaries")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="summaries", null=True, blank=True)
    category = models.ForeignKey(EmissionCategory, on_delete=models.CASCADE, related_name="summaries")
    scope_label = models.CharField(max_length=50, blank=True, null=True)  # Alcance 1, 2, 3
    is_biogenic = models.BooleanField(default=False)
    total_tco2e = models.FloatField()

    class Meta:
        unique_together = ('period', 'campus', 'category', 'scope_label', 'is_biogenic')
