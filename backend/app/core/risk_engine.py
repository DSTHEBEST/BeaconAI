def compute_edge_cost(travel_time, hazard_risk, w_time=1.0, w_risk=5.0):
    """
    Multi-objective cost function.
    """
    return (w_time * travel_time) + (w_risk * hazard_risk)