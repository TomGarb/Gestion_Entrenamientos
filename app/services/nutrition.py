"""
Servicio de Nutrición — Integración con OpenFoodFacts.
Permite buscar alimentos por código de barras o texto y extraer exclusivamente
nombre, calorías (por 100g) y macronutrientes (proteínas, carbohidratos, grasas).
"""

import logging
from typing import Optional, List, Dict, Any
import requests

logger = logging.getLogger(__name__)

USER_AGENT = "GymTracker - WebApp - Version 1.0 (soporte@gymtracker.app)"
OPENFOODFACTS_BARCODE_URL = "https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
OPENFOODFACTS_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"


def _safe_float(value: Any, default: float = 0.0) -> float:
    """Convierte un valor numérico a float seguro."""
    try:
        if value is None:
            return default
        return round(float(value), 1)
    except (ValueError, TypeError):
        return default


def parse_openfoodfacts_product(product: Dict[str, Any], fallback_barcode: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Extrae estrictamente:
    - nombre
    - calorías por 100g
    - macronutrientes por 100g (proteínas, carbohidratos, grasas)
    - código de barras
    """
    if not product or not isinstance(product, dict):
        return None

    name = (
        product.get("product_name")
        or product.get("product_name_es")
        or product.get("product_name_en")
        or product.get("generic_name")
        or "Alimento desconocido"
    ).strip()

    nutriments = product.get("nutriments", {})
    if not isinstance(nutriments, dict):
        nutriments = {}

    # Calorías por 100g (priorizando energy-kcal_100g)
    calories_val = (
        nutriments.get("energy-kcal_100g")
        or nutriments.get("energy-kcal")
        or nutriments.get("energy-kcal_value")
    )
    if calories_val is None and nutriments.get("energy_100g") is not None:
        # Si sólo viene en kJ, convertir a kcal (1 kcal ≈ 4.184 kJ)
        try:
            calories_val = float(nutriments.get("energy_100g")) / 4.184
        except (ValueError, TypeError):
            calories_val = 0.0

    calories_100g = _safe_float(calories_val, default=0.0)
    proteins_100g = _safe_float(nutriments.get("proteins_100g") or nutriments.get("proteins"), default=0.0)
    carbs_100g = _safe_float(nutriments.get("carbohydrates_100g") or nutriments.get("carbohydrates"), default=0.0)
    fats_100g = _safe_float(nutriments.get("fat_100g") or nutriments.get("fat"), default=0.0)

    barcode = str(product.get("code") or fallback_barcode or "").strip()

    return {
        "name": name,
        "calories_100g": calories_100g,
        "proteins_100g": proteins_100g,
        "carbs_100g": carbs_100g,
        "fats_100g": fats_100g,
        "barcode": barcode,
    }


def get_food_by_barcode(barcode: str) -> Optional[Dict[str, Any]]:
    """
    Consulta OpenFoodFacts mediante código de barras.
    Retorna el producto normalizado o None si no existe.
    """
    clean_code = str(barcode).strip()
    if not clean_code:
        return None

    url = OPENFOODFACTS_BARCODE_URL.format(barcode=clean_code)
    headers = {"User-Agent": USER_AGENT}

    try:
        response = requests.get(url, headers=headers, timeout=8)
        if response.status_code != 200:
            logger.warning(f"[Nutrition] Error HTTP {response.status_code} buscando barcode {clean_code}")
            return None

        data = response.json()
        if data.get("status") == 1 and data.get("product"):
            return parse_openfoodfacts_product(data["product"], fallback_barcode=clean_code)
        return None
    except Exception as e:
        logger.error(f"[Nutrition] Excepción consultando barcode {clean_code}: {e}")
        return None


def search_food_by_query(query: str, page_size: int = 10) -> List[Dict[str, Any]]:
    """
    Busca alimentos en OpenFoodFacts por nombre o descripción.
    """
    clean_query = str(query).strip()
    if not clean_query:
        return []

    params = {
        "search_terms": clean_query,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": min(page_size, 20),
    }
    headers = {"User-Agent": USER_AGENT}

    try:
        response = requests.get(OPENFOODFACTS_SEARCH_URL, params=params, headers=headers, timeout=8)
        if response.status_code != 200:
            logger.warning(f"[Nutrition] Error HTTP {response.status_code} buscando query {clean_query}")
            return []

        data = response.json()
        raw_products = data.get("products", [])
        results = []
        for p in raw_products:
            parsed = parse_openfoodfacts_product(p)
            if parsed and parsed["name"] and parsed["name"] != "Alimento desconocido":
                results.append(parsed)
        return results
    except Exception as e:
        logger.error(f"[Nutrition] Excepción buscando query {clean_query}: {e}")
        return []
