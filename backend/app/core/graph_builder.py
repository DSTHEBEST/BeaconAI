import osmnx as ox

GRAPH_CACHE = {}

def build_graph(center_lat, center_lon, radius_m=3000):
    """
    Build graph directly from bounding box.
    Much faster than loading full city.
    """

    cache_key = f"{center_lat}_{center_lon}_{radius_m}"

    if cache_key in GRAPH_CACHE:
        print("Using cached local graph.")
        return GRAPH_CACHE[cache_key]

    print("Downloading local bounding-box graph...")

    delta = radius_m / 111000  # meter → degree approx

    north = center_lat + delta
    south = center_lat - delta
    east = center_lon + delta
    west = center_lon - delta

    G = ox.graph_from_bbox(
        north,
        south,
        east,
        west,
        network_type="drive"
    )

    GRAPH_CACHE[cache_key] = G

    return G