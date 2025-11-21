from rest_framework import serializers
from .models import (
    Campus, Period, EmissionCategory, EmissionSource, EmissionFactor,
    FuelType, WasteType, ExtinguisherType, PaperWeightCatalog,
    ElectricityConsumption, NaturalGasConsumption, FuelConsumption,
    VehicleFleetConsumption, ExtinguisherRefill, WasteRecord,
    PaperConsumption, Flight,
    FieldPracticeTrip, RemovalRecord
)

# =====================================================
# === SERIALIZERS BASE / CATÁLOGOS =====================
# =====================================================

class CampusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campus
        fields = ['id', 'name', 'city', 'locality', 'area_m2', 'notes']


class PeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Period
        fields = ['id', 'year', 'month', 'start_date', 'end_date']


class EmissionCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmissionCategory
        fields = ['id', 'code', 'name', 'description']


class EmissionSourceSerializer(serializers.ModelSerializer):
    category = EmissionCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=EmissionCategory.objects.all(), source='category', write_only=True
    )

    class Meta:
        model = EmissionSource
        fields = ['id', 'category', 'category_id', 'code', 'name', 'unit_default']


class EmissionFactorSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmissionFactor
        fields = [
            'id', 'agent', 'gas', 'factor_value', 'unit',
            'source_ref', 'year_applic', 'gwp_100yr', 'uncertainty_pct'
        ]


class FuelTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelType
        fields = ['fuel_code', 'description']


class WasteTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WasteType
        fields = ['waste_code', 'description']


class ExtinguisherTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtinguisherType
        fields = ['ext_code', 'description', 'gwp_100yr']


class PaperWeightCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaperWeightCatalog
        fields = ['size', 'kg_per_ream']


# =====================================================
# === REGISTROS OPERATIVOS (CRUD) ======================
# =====================================================

class ElectricityConsumptionSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)

    class Meta:
        model = ElectricityConsumption
        fields = ['id', 'period', 'period_id', 'campus', 'campus_id', 'description', 'kwh', 'total_tco2e']


class NaturalGasConsumptionSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    fuel_type = FuelTypeSerializer(read_only=True)
    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)
    fuel_type_id = serializers.PrimaryKeyRelatedField(queryset=FuelType.objects.all(), source='fuel_type', write_only=True)

    class Meta:
        model = NaturalGasConsumption
        fields = ['id', 'period', 'period_id', 'campus', 'campus_id', 'fuel_type', 'fuel_type_id', 'm3', 'total_tco2e']


class FuelConsumptionSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    fuel_type = FuelTypeSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)
    fuel_type_id = serializers.PrimaryKeyRelatedField(queryset=FuelType.objects.all(), source='fuel_type', write_only=True)

    class Meta:
        model = FuelConsumption
        fields = [
            'id', 'period', 'period_id', 'campus', 'campus_id', 'description', 'fuel_type', 'fuel_type_id',
            'unit', 'amount', 'scope', 'total_tco2e'
        ]


class VehicleFleetConsumptionSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    fuel_type = FuelTypeSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)
    fuel_type_id = serializers.PrimaryKeyRelatedField(queryset=FuelType.objects.all(), source='fuel_type', write_only=True)

    class Meta:
        model = VehicleFleetConsumption
        fields = [
            'id', 'period', 'period_id', 'campus', 'campus_id', 'description',
            'fuel_type', 'fuel_type_id', 'unit', 'amount', 'km_traveled', 'total_tco2e'
        ]


class ExtinguisherRefillSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    ext_type = ExtinguisherTypeSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)
    ext_type_id = serializers.PrimaryKeyRelatedField(queryset=ExtinguisherType.objects.all(), source='ext_type', write_only=True)

    class Meta:
        model = ExtinguisherRefill
        fields = [
            'id', 'period', 'period_id', 'campus', 'campus_id', 'description',
            'ext_type', 'ext_type_id', 'unit', 'amount', 'total_tco2e'
        ]


class WasteRecordSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    waste_type = WasteTypeSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)
    waste_type_id = serializers.PrimaryKeyRelatedField(queryset=WasteType.objects.all(), source='waste_type', write_only=True)

    class Meta:
        model = WasteRecord
        fields = ['id', 'period', 'period_id', 'campus', 'campus_id', 'waste_type', 'waste_type_id', 'unit', 'amount', 'total_tco2e']


class PaperConsumptionSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    size = PaperWeightCatalogSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)
    size_id = serializers.PrimaryKeyRelatedField(queryset=PaperWeightCatalog.objects.all(), source='size', write_only=True)

    class Meta:
        model = PaperConsumption
        fields = ['id', 'period', 'period_id', 'campus', 'campus_id', 'description', 'size', 'size_id', 'reams', 'total_tco2e']



class FlightSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)

    class Meta:
        model = Flight
        fields = ['id', 'period', 'period_id', 'flight_date', 'origin', 'destination', 'co2_kg', 'roundtrip']


class FieldPracticeTripSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)

    class Meta:
        model = FieldPracticeTrip
        fields = [
            'id', 'period', 'period_id', 'campus', 'campus_id',
            'description', 'origin', 'destination', 'km_oneway', 'total_km', 'total_tco2e'
        ]


class RemovalRecordSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)

    class Meta:
        model = RemovalRecord
        fields = ['id', 'period', 'period_id', 'campus', 'campus_id', 'rtype', 'tco2e']
