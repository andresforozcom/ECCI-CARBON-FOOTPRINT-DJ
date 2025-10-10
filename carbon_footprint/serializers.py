from rest_framework import serializers
from .models import (
    Campus, Period, EmissionCategory, EmissionSource, EmissionFactor,
    FuelType, WasteType, ExtinguisherType, PaperWeightCatalog,
    ElectricityConsumption, NaturalGasConsumption, FuelConsumption,
    VehicleFleetConsumption, ExtinguisherRefill, WasteRecord,
    PaperConsumption, PurchasedGoodsServices, Flight,
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
        fields = ['id', 'period', 'period_id', 'campus', 'campus_id', 'operator', 'kwh']


class NaturalGasConsumptionSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)

    class Meta:
        model = NaturalGasConsumption
        fields = ['id', 'period', 'period_id', 'campus', 'campus_id', 'operator', 'm3']


class FuelConsumptionSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    fuel_code = FuelTypeSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)
    fuel_code_id = serializers.PrimaryKeyRelatedField(queryset=FuelType.objects.all(), source='fuel_code', write_only=True)

    class Meta:
        model = FuelConsumption
        fields = ['id', 'period', 'period_id', 'campus', 'campus_id', 'fuel_code', 'fuel_code_id', 'gallons', 'biogenic_co2']


class VehicleFleetConsumptionSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    fuel_code = FuelTypeSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)
    fuel_code_id = serializers.PrimaryKeyRelatedField(queryset=FuelType.objects.all(), source='fuel_code', write_only=True)

    class Meta:
        model = VehicleFleetConsumption
        fields = [
            'id', 'period', 'period_id', 'campus', 'campus_id',
            'fuel_code', 'fuel_code_id', 'km_traveled', 'gallons'
        ]


class ExtinguisherRefillSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    ext_code = ExtinguisherTypeSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)
    ext_code_id = serializers.PrimaryKeyRelatedField(queryset=ExtinguisherType.objects.all(), source='ext_code', write_only=True)

    class Meta:
        model = ExtinguisherRefill
        fields = [
            'id', 'period', 'period_id', 'campus', 'campus_id',
            'ext_code', 'ext_code_id', 'mass_kg'
        ]


class WasteRecordSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    waste_code = WasteTypeSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)
    waste_code_id = serializers.PrimaryKeyRelatedField(queryset=WasteType.objects.all(), source='waste_code', write_only=True)

    class Meta:
        model = WasteRecord
        fields = [
            'id', 'period', 'period_id', 'campus', 'campus_id',
            'waste_code', 'waste_code_id', 'kg'
        ]


class PaperConsumptionSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    size = PaperWeightCatalogSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)
    size_id = serializers.PrimaryKeyRelatedField(queryset=PaperWeightCatalog.objects.all(), source='size', write_only=True)

    class Meta:
        model = PaperConsumption
        fields = [
            'id', 'period', 'period_id', 'campus', 'campus_id',
            'size', 'size_id', 'reams'
        ]


class PurchasedGoodsServicesSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    emission_factor = EmissionFactorSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)
    emission_factor_id = serializers.PrimaryKeyRelatedField(
        queryset=EmissionFactor.objects.all(), source='emission_factor',
        write_only=True, allow_null=True, required=False
    )

    class Meta:
        model = PurchasedGoodsServices
        fields = [
            'id', 'period', 'period_id', 'campus', 'campus_id',
            'good_service', 'amount', 'emission_factor', 'emission_factor_id'
        ]


class FlightSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)

    class Meta:
        model = Flight
        fields = ['id', 'period', 'period_id', 'flight_date', 'origin', 'destination', 'co2_kg', 'roundtrip']


class FieldPracticeTripSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)
    fuel_code = FuelTypeSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)
    fuel_code_id = serializers.PrimaryKeyRelatedField(queryset=FuelType.objects.all(), source='fuel_code', write_only=True)

    class Meta:
        model = FieldPracticeTrip
        fields = [
            'id', 'period', 'period_id', 'campus', 'campus_id',
            'origin', 'destination', 'km_oneway', 'total_km',
            'fuel_code', 'fuel_code_id'
        ]


class RemovalRecordSerializer(serializers.ModelSerializer):
    period = PeriodSerializer(read_only=True)
    campus = CampusSerializer(read_only=True)

    period_id = serializers.PrimaryKeyRelatedField(queryset=Period.objects.all(), source='period', write_only=True)
    campus_id = serializers.PrimaryKeyRelatedField(queryset=Campus.objects.all(), source='campus', write_only=True)

    class Meta:
        model = RemovalRecord
        fields = ['id', 'period', 'period_id', 'campus', 'campus_id', 'rtype', 'tco2e']
