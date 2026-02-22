import networkx as nx

def compute_route(G, source_node, target_node):
    """
    Compute shortest path using precomputed edge weights.
    """
    return nx.shortest_path(G, source_node, target_node, weight="weight")