# carbon_formulas.py
"""
Módulo de funciones para el cálculo de emisiones de Huella de Carbono.
Cada función recibe los valores necesarios y retorna el resultado en toneladas de CO2e.
"""

# -----------------------------
# 1. Combustión Estacionaria
# -----------------------------
def combustion_estacionaria(A_m3, FE_CO2, FE_CH4, FE_N2O, PCG_CH4=28, PCG_N2O=265):
    E_CO2 = A_m3 * FE_CO2 / 1000
    E_CH4 = A_m3 * FE_CH4 * PCG_CH4 / 1000
    E_N2O = A_m3 * FE_N2O * PCG_N2O / 1000
    return (E_CO2 + E_CH4 + E_N2O) / 1000

# -----------------------------
# 2. Combustión Móvil
# -----------------------------
def combustion_movil(A_litros, FE_CO2, FE_CH4, FE_N2O, PCG_CH4=28, PCG_N2O=265):
    E_CO2 = A_litros * FE_CO2 / 1000
    E_CH4 = A_litros * FE_CH4 * PCG_CH4 / 1000
    E_N2O = A_litros * FE_N2O * PCG_N2O / 1000
    return (E_CO2 + E_CH4 + E_N2O) / 1000

# -----------------------------
# 3. Procesos Industriales
# -----------------------------
def procesos_industriales(Q, FE):
    return Q * FE

# -----------------------------
# 4. Emisiones Fugitivas
# -----------------------------
def fugitivas(m_kg, GWP):
    return (m_kg * GWP) / 1000

# -----------------------------
# 5. Lubricantes
# -----------------------------
def lubricantes(actividad, FE):
    return actividad * FE

# -----------------------------
# 6. Electricidad
# -----------------------------
def electricidad(consumo_kwh, FE_kg_kwh):
    return (consumo_kwh * FE_kg_kwh) / 1000

# -----------------------------
# 7. Transporte y hospedaje
# -----------------------------
def transporte_generico(dato_actividad, FE):
    return (dato_actividad * FE) / 1000

# -----------------------------
# 8. Papel
# -----------------------------
def papel(consumo_kg, FE):
    return consumo_kg * FE

# conversión opcional de resmas a kg
RESMA_KG = 2.5
def papel_resmas(resmas, FE):
    return (resmas * RESMA_KG) * FE

# -----------------------------
# 9. Residuos sólidos
# -----------------------------
def residuos(masa, FE):
    return masa * FE

# -----------------------------
# 10. Remoción inventario forestal
# -----------------------------
def remocion_forestal(N, captura_ha, densidad):
    hectareas = N / densidad
    return hectareas * captura_ha

# -----------------------------
# 11. Reciclaje
# -----------------------------
def reciclaje(masa_t, FE_CH4_res, GWP_CH4=27):
    emisiones_ch4 = masa_t * FE_CH4_res
    return emisiones_ch4 * GWP_CH4

# -----------------------------
# Funciones utilitarias
# -----------------------------
def convertir_kg_a_ton(valor_kg):
    return valor_kg / 1000

def convertir_g_a_kg(valor_g):
    return valor_g / 1000
