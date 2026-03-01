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

    # 1️⃣ Load local graph
    G = build_graph(source_lat, source_lon, radius_m=5000)

    # 2️⃣ Find nearest nodes
    source_node = ox.distance.nearest_nodes(G, source_lon, source_lat)
    target_node = ox.distance.nearest_nodes(G, dest_lon, dest_lat)

    # 3️⃣ Compute baseline shortest path (distance only)
    shortest_route = compute_route(
        G, source_node, target_node, weight_type="length"
    )

    # 4️⃣ Assign risk-aware weights
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

        data["weight"] = compute_edge_cost(travel_distance, hazard_risk)

    # 5️⃣ Compute risk-aware route
    risk_route = compute_route(
        G, source_node, target_node, weight_type="weight"
    )

    # 6️⃣ Metrics computation
    def compute_metrics(route):
        total_distance = 0
        total_risk = 0

        for i in range(len(route) - 1):
            u = route[i]
            v = route[i + 1]

            edge_data = G.get_edge_data(u, v)[0]

            total_distance += edge_data.get("length", 0)
            total_risk += edge_data.get("weight", 0)

        return total_distance, total_risk

    short_distance, short_risk = compute_metrics(shortest_route)
    risk_distance, risk_risk = compute_metrics(risk_route)

    exposure_reduction = (
        (short_risk - risk_risk) / short_risk * 100
    ) if short_risk != 0 else 0

    return {
        "risk_aware_route": [
            (G.nodes[n]["y"], G.nodes[n]["x"]) for n in risk_route
        ],
        "shortest_route": [
            (G.nodes[n]["y"], G.nodes[n]["x"]) for n in shortest_route
        ],
        "risk_aware_metrics": {
            "distance_m": round(risk_distance, 2),
            "risk_score": round(risk_risk, 2)
        },
        "shortest_route_metrics": {
            "distance_m": round(short_distance, 2),
            "risk_score": round(short_risk, 2)
        },
        "exposure_reduction_percent": round(exposure_reduction, 2)
    }