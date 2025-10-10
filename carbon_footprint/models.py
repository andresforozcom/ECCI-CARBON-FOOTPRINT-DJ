from django.db import models


# =====================================================
# === CATÁLOGOS Y CONFIGURACIONES BASE =================
# =====================================================

class Campus(models.Model):
    """Sedes o campus universitarios"""
    name = models.CharField(max_length=100)
    city = models.CharField(max_length=100, blank=True, null=True)
    locality = models.CharField(max_length=100, blank=True, null=True)
    area_m2 = models.FloatField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Period(models.Model):
    """Periodo de registro (mensual o anual)"""
    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField(blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)

    class Meta:
        unique_together = ('year', 'month')
        ordering = ['-year', '-month']

    def __str__(self):
        return f"{self.year}-{self.month or 'Anual'}"


# =====================================================
# === CATEGORÍAS Y FUENTES DE EMISIÓN =================
# =====================================================

class EmissionCategory(models.Model):
    """Categoría de emisiones (alcance 1, 2, 3, etc.)"""
    code = models.PositiveIntegerField(unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class EmissionSource(models.Model):
    """Fuente de emisión específica dentro de una categoría"""
    category = models.ForeignKey(EmissionCategory, on_delete=models.CASCADE, related_name="sources")
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    unit_default = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.code} - {self.name}"


class EmissionFactor(models.Model):
    """Factores de emisión (kgCO2e/unidad)"""
    agent = models.CharField(max_length=100)
    gas = models.CharField(max_length=30)  # CO2, CH4, N2O, etc.
    factor_value = models.FloatField()
    unit = models.CharField(max_length=50)
    source_ref = models.CharField(max_length=200, blank=True, null=True)
    year_applic = models.PositiveIntegerField(blank=True, null=True)
    gwp_100yr = models.FloatField(blank=True, null=True)  # potencial de calentamiento global
    uncertainty_pct = models.FloatField(blank=True, null=True)

    def __str__(self):
        return f"{self.agent} ({self.gas})"


# =====================================================
# === CATÁLOGOS AUXILIARES =============================
# =====================================================

class FuelType(models.Model):
    fuel_code = models.CharField(max_length=20, primary_key=True)
    description = models.CharField(max_length=100)

    def __str__(self):
        return self.description


class WasteType(models.Model):
    waste_code = models.CharField(max_length=20, primary_key=True)
    description = models.CharField(max_length=100)

    def __str__(self):
        return self.description


class ExtinguisherType(models.Model):
    ext_code = models.CharField(max_length=20, primary_key=True)
    description = models.CharField(max_length=100)
    gwp_100yr = models.FloatField(blank=True, null=True)

    def __str__(self):
        return self.description


class PaperWeightCatalog(models.Model):
    size = models.CharField(max_length=20, primary_key=True)
    kg_per_ream = models.FloatField()

    def __str__(self):
        return f"{self.size} ({self.kg_per_ream} kg/ream)"


# =====================================================
# === REGISTROS OPERATIVOS =============================
# =====================================================

class ElectricityConsumption(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="electricity_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="electricity_records")
    operator = models.CharField(max_length=100, blank=True, null=True)
    kwh = models.FloatField()

    def __str__(self):
        return f"{self.campus} - {self.kwh} kWh ({self.period})"


class NaturalGasConsumption(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="gas_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="gas_records")
    operator = models.CharField(max_length=100, blank=True, null=True)
    m3 = models.FloatField()

    def __str__(self):
        return f"{self.campus} - {self.m3} m³ ({self.period})"


class FuelConsumption(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="fuel_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="fuel_records")
    fuel_code = models.ForeignKey(FuelType, on_delete=models.PROTECT, related_name="fuel_consumptions")
    gallons = models.FloatField()
    biogenic_co2 = models.FloatField(blank=True, null=True)

    def __str__(self):
        return f"{self.campus} - {self.fuel_code}"


class VehicleFleetConsumption(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="fleet_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="fleet_records")
    fuel_code = models.ForeignKey(FuelType, on_delete=models.PROTECT, related_name="vehicle_fleet_consumptions")
    km_traveled = models.FloatField()
    gallons = models.FloatField()

    def __str__(self):
        return f"Flota {self.campus} - {self.period}"


class ExtinguisherRefill(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="extinguisher_refills")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="extinguisher_refills")
    ext_code = models.ForeignKey(ExtinguisherType, on_delete=models.PROTECT, related_name="refills")
    mass_kg = models.FloatField()

    def __str__(self):
        return f"{self.ext_code} - {self.mass_kg} kg"


class WasteRecord(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="waste_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="waste_records")
    waste_code = models.ForeignKey(WasteType, on_delete=models.PROTECT, related_name="waste_records")
    kg = models.FloatField()

    def __str__(self):
        return f"{self.waste_code} - {self.kg} kg"


class PaperConsumption(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="paper_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="paper_records")
    size = models.ForeignKey(PaperWeightCatalog, on_delete=models.PROTECT, related_name="paper_usages")
    reams = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.size} ({self.reams} reams)"


class PurchasedGoodsServices(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="purchase_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="purchase_records")
    good_service = models.CharField(max_length=150)
    amount = models.FloatField()
    emission_factor = models.ForeignKey(EmissionFactor, on_delete=models.SET_NULL, null=True, blank=True, related_name="purchases")

    def __str__(self):
        return f"{self.good_service} - {self.amount}"


class Flight(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="flights")
    flight_date = models.DateField()
    origin = models.CharField(max_length=100)
    destination = models.CharField(max_length=100)
    co2_kg = models.FloatField()
    roundtrip = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.origin} → {self.destination}"


class FieldPracticeTrip(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="practice_trips")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="practice_trips")
    origin = models.CharField(max_length=100)
    destination = models.CharField(max_length=100)
    km_oneway = models.FloatField()
    total_km = models.FloatField()
    fuel_code = models.ForeignKey(FuelType, on_delete=models.PROTECT, related_name="practice_trips")

    def __str__(self):
        return f"{self.origin} - {self.destination}"


class RemovalRecord(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="removal_records")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="removal_records")
    rtype = models.CharField(max_length=100)
    tco2e = models.FloatField()

    def __str__(self):
        return f"{self.rtype} - {self.tco2e} tCO2e"
