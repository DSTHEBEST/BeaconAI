import math

def compute_node_risk(node_lat, node_lon, hazard_lat, hazard_lon, time_step, spread_rate=0.001):
    """
    Simple radial hazard spread model.
    Risk decays exponentially with distance.
    Hazard expands over time.
    """

    distance = math.sqrt(
        (node_lat - hazard_lat) ** 2 +
        (node_lon - hazard_lon) ** 2
    )

    # Hazard radius grows over time
    effective_radius = spread_rate * time_step

    if distance <= effective_radius:
        return 1.0  # maximum risk inside hazard radius

    # Exponential decay outside radius
    return math.exp(-distance * 50)