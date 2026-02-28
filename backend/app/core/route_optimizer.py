import networkx as nx

def compute_route(G, source_node, target_node, weight_type="weight"):
    """
    Compute shortest path using specified edge weight.
    """
    return nx.shortest_path(
        G,
        source_node,
        target_node,
        weight=weight_type
    )