import osmnx as ox
import networkx as nx

def build_graph(city_name: str):
    """
    Fetch road network graph for given city.
    (Edge lengths are already added by graph_from_place in OSMnx 1.8.)
    """
    G = ox.graph_from_place(city_name, network_type="drive")
    return G
