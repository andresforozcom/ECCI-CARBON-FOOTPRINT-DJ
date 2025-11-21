from django.shortcuts import render
from django.views.decorators.http import require_GET
from django.middleware.csrf import get_token



from rest_framework import viewsets, permissions
from .models import (
    Campus, Period, EmissionCategory, EmissionSource, EmissionFactor,
    FuelType, WasteType, ExtinguisherType, PaperWeightCatalog,
    ElectricityConsumption, NaturalGasConsumption, FuelConsumption,
    VehicleFleetConsumption, ExtinguisherRefill, WasteRecord,
    PaperConsumption, Flight,
    FieldPracticeTrip, RemovalRecord
)
from .serializers import (
    CampusSerializer, PeriodSerializer, EmissionCategorySerializer,
    EmissionSourceSerializer, EmissionFactorSerializer, FuelTypeSerializer,
    WasteTypeSerializer, ExtinguisherTypeSerializer, PaperWeightCatalogSerializer,
    ElectricityConsumptionSerializer, NaturalGasConsumptionSerializer,
    FuelConsumptionSerializer, VehicleFleetConsumptionSerializer,
    ExtinguisherRefillSerializer, WasteRecordSerializer, PaperConsumptionSerializer, FlightSerializer, FieldPracticeTripSerializer,
    RemovalRecordSerializer
)


# =====================================================
# === BASE CONFIGURATION ===============================
# =====================================================

@require_GET
def dashboard(request):
    """Renderiza la interfaz principal del prototipo."""
    # Garantiza que el token CSRF se emita para peticiones POST subsecuentes
    get_token(request)

    return render(request, 'ArchivoFinal.html')


class BasePermissionViewSet(viewsets.ModelViewSet):
    """Base viewset con permisos básicos y configuración común."""
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    # puedes cambiar a IsAuthenticated si tu API requiere login obligatorio


# =====================================================
# === CATÁLOGOS Y CONFIGURACIÓN ========================
# =====================================================

class CampusViewSet(BasePermissionViewSet):
    queryset = Campus.objects.all()
    serializer_class = CampusSerializer


class PeriodViewSet(BasePermissionViewSet):
    queryset = Period.objects.all()
    serializer_class = PeriodSerializer


class EmissionCategoryViewSet(BasePermissionViewSet):
    queryset = EmissionCategory.objects.all()
    serializer_class = EmissionCategorySerializer


class EmissionSourceViewSet(BasePermissionViewSet):
    queryset = EmissionSource.objects.select_related('category').all()
    serializer_class = EmissionSourceSerializer


class EmissionFactorViewSet(BasePermissionViewSet):
    queryset = EmissionFactor.objects.all()
    serializer_class = EmissionFactorSerializer


# =====================================================
# === CATÁLOGOS AUXILIARES =============================
# =====================================================

class FuelTypeViewSet(BasePermissionViewSet):
    queryset = FuelType.objects.all()
    serializer_class = FuelTypeSerializer


class WasteTypeViewSet(BasePermissionViewSet):
    queryset = WasteType.objects.all()
    serializer_class = WasteTypeSerializer


class ExtinguisherTypeViewSet(BasePermissionViewSet):
    queryset = ExtinguisherType.objects.all()
    serializer_class = ExtinguisherTypeSerializer


class PaperWeightCatalogViewSet(BasePermissionViewSet):
    queryset = PaperWeightCatalog.objects.all()
    serializer_class = PaperWeightCatalogSerializer


# =====================================================
# === REGISTROS OPERATIVOS (CRUD PRINCIPALES) ==========
# =====================================================

class ElectricityConsumptionViewSet(BasePermissionViewSet):
    queryset = ElectricityConsumption.objects.select_related('campus', 'period').all()
    serializer_class = ElectricityConsumptionSerializer


class NaturalGasConsumptionViewSet(BasePermissionViewSet):
    queryset = NaturalGasConsumption.objects.select_related('campus', 'period').all()
    serializer_class = NaturalGasConsumptionSerializer


class FuelConsumptionViewSet(BasePermissionViewSet):
    queryset = FuelConsumption.objects.select_related('campus', 'period', 'fuel_type').all()
    serializer_class = FuelConsumptionSerializer


class VehicleFleetConsumptionViewSet(BasePermissionViewSet):
    queryset = VehicleFleetConsumption.objects.select_related('campus', 'period', 'fuel_type').all()
    serializer_class = VehicleFleetConsumptionSerializer


class ExtinguisherRefillViewSet(BasePermissionViewSet):
    queryset = ExtinguisherRefill.objects.select_related('campus', 'period', 'ext_type').all()
    serializer_class = ExtinguisherRefillSerializer


class WasteRecordViewSet(BasePermissionViewSet):
    queryset = WasteRecord.objects.select_related('campus', 'period', 'waste_type').all()
    serializer_class = WasteRecordSerializer


class PaperConsumptionViewSet(BasePermissionViewSet):
    queryset = PaperConsumption.objects.select_related('campus', 'period', 'size').all()
    serializer_class = PaperConsumptionSerializer





class FlightViewSet(BasePermissionViewSet):
    queryset = Flight.objects.select_related('period').all()
    serializer_class = FlightSerializer


class FieldPracticeTripViewSet(BasePermissionViewSet):
    queryset = FieldPracticeTrip.objects.select_related('campus', 'period').all()
    serializer_class = FieldPracticeTripSerializer


class RemovalRecordViewSet(BasePermissionViewSet):
    queryset = RemovalRecord.objects.select_related('campus', 'period').all()
    serializer_class = RemovalRecordSerializer

