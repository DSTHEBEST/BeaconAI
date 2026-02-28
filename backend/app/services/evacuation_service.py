import osmnx as ox
from backend.app.core.graph_builder import build_graph
from backend.app.core.hazard_model import compute_node_risk
from backend.app.core.risk_engine import compute_edge_cost
from backend.app.core.route_optimizer import compute_route


def compute_evacuation(payload: dict):

    source_lat = payload["source_lat"]
    source_lon = payload["source_lon"]
    dest_lat = payload["dest_lat"]
    dest_lon = payload["dest_lon"]
    hazard_lat = payload["hazard_lat"]
    hazard_lon = payload["hazard_lon"]
    time_step = payload["time_step"]

    # 1️⃣ Load local bounding-box graph
    G = build_graph(source_lat, source_lon, radius_m=5000)

    # 2️⃣ Find nearest nodes
    source_node = ox.distance.nearest_nodes(G, source_lon, source_lat)
    target_node = ox.distance.nearest_nodes(G, dest_lon, dest_lat)

    # 3️⃣ Compute risk-aware weights
    for u, v, k, data in G.edges(keys=True, data=True):

        node_lat = G.nodes[u]["y"]
        node_lon = G.nodes[u]["x"]

        hazard_risk = compute_node_risk(
            node_lat,
            node_lon,
            hazard_lat,
            hazard_lon,
            time_step
        )

        travel_distance = data.get("length", 1)

        total_cost = compute_edge_cost(travel_distance, hazard_risk)

        data["weight"] = total_cost

    # 4️⃣ Compute route
    route = compute_route(G, source_node, target_node, weight_type="weight")

    # 5️⃣ Extract coordinates
    route_coords = [
        (G.nodes[node]["y"], G.nodes[node]["x"])
        for node in route
    ]

    return {
        "route": route_coords,
        "num_nodes": len(route_coords)
    }